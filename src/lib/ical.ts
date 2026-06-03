import type { Session } from "../types";
import { categoryEmoji, categoryLabel } from "./categories";
import { fmtDuration, fmtPace, fmtDistance } from "./format";
import { zoneLabel } from "./zones";

// Default start times per category when a session has no explicit time.
const DEFAULT_START: Record<string, string> = {
  styrke: "1700",
  loping: "0600",
  sykkel: "1600",
  yoga_mob: "2000",
  kvile: "0900",
};

function defaultDurationSec(s: Session): number {
  if (s.durationSec && s.durationSec > 0) return s.durationSec;
  switch (s.category) {
    case "styrke": return 75 * 60;
    case "loping": return 60 * 60;
    case "sykkel": return 90 * 60;
    case "yoga_mob": return 45 * 60;
    default: return 30 * 60;
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dtLocal(dateISO: string, hhmm: string): string {
  // local floating time with TZID
  return `${dateISO.replace(/-/g, "")}T${hhmm}00`;
}

function addSeconds(dateISO: string, hhmm: string, sec: number): string {
  const [y, m, d] = dateISO.split("-").map((n) => parseInt(n, 10));
  const hh = parseInt(hhmm.slice(0, 2), 10);
  const mm = parseInt(hhmm.slice(2, 4), 10);
  const dt = new Date(y, m - 1, d, hh, mm, 0);
  dt.setSeconds(dt.getSeconds() + sec);
  return (
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T` +
    `${pad(dt.getHours())}${pad(dt.getMinutes())}00`
  );
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function summary(s: Session): string {
  const numbers: string[] = [];
  if (s.distanceM) numbers.push(fmtDistance(s.distanceM));
  if (s.durationSec) numbers.push(fmtDuration(s.durationSec));
  if (s.paceSecPerKm) numbers.push(fmtPace(s.paceSecPerKm));
  const base = `${categoryEmoji(s.category)} ${categoryLabel(s.category)} — ${s.title}`.trim();
  return numbers.length ? `${base} (${numbers.join(", ")})` : base;
}

function description(s: Session): string {
  const lines: string[] = [];
  if (s.line2) lines.push(s.line2);
  if (s.description) lines.push(s.description);
  for (const ex of s.exercises || []) {
    const sets = ex.sets
      .map((set) => `${set.reps}${set.weightKg != null ? `×${set.weightKg}kg` : ""}${set.rpe ? ` @RPE${set.rpe}` : ""}`)
      .join(", ");
    lines.push(`${ex.name}: ${sets}`);
  }
  for (const iv of s.intervals || []) {
    const bits: string[] = [`${iv.repeats}×`];
    if (iv.distanceM) bits.push(`${iv.distanceM}m`);
    if (iv.durationSec) bits.push(fmtDuration(iv.durationSec));
    if (iv.targetPace) bits.push(`@ ${iv.targetPace}`);
    if (iv.restSec != null) bits.push(`${iv.restSec}s pause`);
    if (iv.zone != null) bits.push(zoneLabel(iv.zone));
    lines.push(bits.join(" "));
  }
  if (s.avgHr) lines.push(`Snitt-puls: ${s.avgHr} bpm`);
  if (s.maxHr) lines.push(`Maks-puls: ${s.maxHr} bpm`);
  if (s.rawNotes) lines.push(s.rawNotes);
  return lines.join("\n");
}

export function buildICS(sessions: Session[]): string {
  const now =
    new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HYBRID 7r//Treningsprogram//NN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Oslo",
    "BEGIN:STANDARD",
    "DTSTART:19701025T030000",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "TZNAME:CET",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T020000",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "TZNAME:CEST",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];

  for (const s of sessions) {
    const start = DEFAULT_START[s.category] || "1700";
    const dur = defaultDurationSec(s);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:hybrid7r-${s.id}@treningsprogram`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;TZID=Europe/Oslo:${dtLocal(s.date, start)}`);
    lines.push(`DTEND;TZID=Europe/Oslo:${addSeconds(s.date, start, dur)}`);
    lines.push(`SUMMARY:${escapeICS(summary(s))}`);
    const desc = description(s);
    if (desc) lines.push(`DESCRIPTION:${escapeICS(desc)}`);
    lines.push(`CATEGORIES:${categoryLabel(s.category)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // fold long lines per RFC 5545 (75 octets); simple safe fold
  return lines
    .map((l) => foldLine(l))
    .join("\r\n");
}

function foldLine(line: string): string {
  if (line.length <= 73) return line;
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    out.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest.length) out.push(" " + rest);
  return out.join("\r\n");
}

export function downloadICS(sessions: Session[], filename: string): void {
  const blob = new Blob([buildICS(sessions)], { type: "text/calendar;charset=utf-8" });
  triggerDownload(blob, filename);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

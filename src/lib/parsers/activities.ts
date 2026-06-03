import type { Session } from "../../types";
import {
  toRecords,
  num,
  timeToSec,
  mapActivityCategory,
  isoFromAny,
} from "./csv";

let idc = 0;
function gid(prefix: string): string {
  idc += 1;
  return `${prefix}-${Date.now().toString(36)}-${idc}`;
}

function pick(rec: Record<string, string>, keys: string[]): string | undefined {
  for (const k of Object.keys(rec)) {
    const lk = k.toLowerCase();
    if (keys.some((want) => lk === want || lk.includes(want))) return rec[k];
  }
  return undefined;
}

// ---- Garmin Connect activities CSV ----
export function parseGarminCSV(text: string): Session[] {
  const recs = toRecords(text);
  const out: Session[] = [];
  for (const r of recs) {
    const typeRaw = pick(r, ["activity type", "aktivitetstype", "type"]) || "";
    const dateRaw = pick(r, ["date", "dato", "start"]) || "";
    const iso = isoFromAny(dateRaw);
    if (!iso) continue;
    const distKm = num(pick(r, ["distance", "distanse"]));
    const dur = timeToSec(pick(r, ["time", "tid", "duration", "varigheit", "moving"]));
    const avgHr = num(pick(r, ["avg hr", "average heart rate", "snittpuls", "gj.sn. puls", "avg. heart rate"]));
    const maxHr = num(pick(r, ["max hr", "max heart rate", "maks puls", "maks. puls"]));
    const paceRaw = pick(r, ["avg pace", "snittfart", "average pace", "pace"]);
    out.push({
      id: gid("garmin"),
      date: iso,
      category: mapActivityCategory(typeRaw),
      title: pick(r, ["title", "tittel", "name"]) || typeRaw || "Garmin-aktivitet",
      source: "garmin",
      status: "completed",
      distanceM: distKm != null ? distKm * 1000 : null,
      durationSec: dur,
      avgHr: avgHr,
      maxHr: maxHr,
      paceSecPerKm: paceRaw ? timeToSec(paceRaw) : null,
      externalId: `garmin:${iso}:${typeRaw}:${distKm ?? ""}`,
    });
  }
  return out;
}

// ---- Strava bulk export activities.csv ----
export function parseStravaCSV(text: string): Session[] {
  const recs = toRecords(text);
  const out: Session[] = [];
  for (const r of recs) {
    const typeRaw = pick(r, ["activity type", "aktivitetstype"]) || "";
    const dateRaw = pick(r, ["activity date", "date", "dato"]) || "";
    const iso = isoFromAny(dateRaw);
    if (!iso) continue;
    const distM = num(pick(r, ["distance"]));
    const dur = num(pick(r, ["elapsed time", "moving time"])); // strava in seconds
    const avgHr = num(pick(r, ["average heart rate"]));
    const maxHr = num(pick(r, ["max heart rate"]));
    const distMeters = distM != null ? (distM > 1000 ? distM : distM * 1000) : null;
    let pace: number | null = null;
    if (distMeters && dur) pace = dur / (distMeters / 1000);
    out.push({
      id: gid("strava"),
      date: iso,
      category: mapActivityCategory(typeRaw),
      title: pick(r, ["activity name", "name"]) || typeRaw || "Strava-aktivitet",
      source: "strava",
      status: "completed",
      distanceM: distMeters,
      durationSec: dur,
      avgHr,
      maxHr,
      paceSecPerKm: pace,
      externalId: `strava:${pick(r, ["activity id"]) || `${iso}:${distMeters ?? ""}`}`,
    });
  }
  return out;
}

// ---- Beyond the Whiteboard CSV ----
export function parseBtwbCSV(text: string): Session[] {
  const recs = toRecords(text);
  const out: Session[] = [];
  for (const r of recs) {
    const dateRaw = pick(r, ["date", "dato"]) || "";
    const iso = isoFromAny(dateRaw);
    if (!iso) continue;
    const name = pick(r, ["title", "name", "workout", "wod"]) || "WOD";
    const result = pick(r, ["result", "score", "tid", "time"]) || "";
    const dur = timeToSec(result);
    const reps = num(pick(r, ["reps"]));
    const weight = num(pick(r, ["weight", "load", "vekt"]));
    const s: Session = {
      id: gid("btwb"),
      date: iso,
      category: "styrke",
      title: name,
      source: "btwb",
      status: "completed",
      durationSec: dur,
      description: pick(r, ["description", "notes", "comment"]) || result,
      externalId: `btwb:${iso}:${name}`,
    };
    if (weight != null) {
      s.exercises = [
        { name, sets: [{ reps: reps ?? 1, weightKg: weight }] },
      ];
    }
    out.push(s);
  }
  return out;
}

// ---- GPX (single activity) ----
export function parseGPX(text: string, fallbackCategory = "loping"): Session[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const trkpts = Array.from(doc.getElementsByTagName("trkpt"));
  if (trkpts.length === 0) return [];

  const timeEls = Array.from(doc.getElementsByTagName("time"));
  const times = timeEls
    .map((t) => t.textContent || "")
    .filter(Boolean)
    .map((s) => new Date(s).getTime())
    .filter((n) => !isNaN(n));
  const startMs = times.length ? Math.min(...times) : Date.now();
  const endMs = times.length ? Math.max(...times) : startMs;
  const dur = times.length ? Math.round((endMs - startMs) / 1000) : null;

  // distance via haversine
  let distM = 0;
  let prev: { lat: number; lon: number } | null = null;
  const hrs: number[] = [];
  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute("lat") || "");
    const lon = parseFloat(pt.getAttribute("lon") || "");
    if (!isNaN(lat) && !isNaN(lon)) {
      if (prev) distM += haversine(prev.lat, prev.lon, lat, lon);
      prev = { lat, lon };
    }
    const hrEl = pt.getElementsByTagName("gpxtpx:hr")[0] || pt.getElementsByTagName("hr")[0];
    if (hrEl && hrEl.textContent) {
      const h = parseInt(hrEl.textContent, 10);
      if (!isNaN(h)) hrs.push(h);
    }
  }
  const d = new Date(startMs);
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const typeRaw =
    doc.getElementsByTagName("type")[0]?.textContent ||
    doc.getElementsByTagName("name")[0]?.textContent ||
    fallbackCategory;
  const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
  const maxHr = hrs.length ? Math.max(...hrs) : null;
  return [
    {
      id: gid("gpx"),
      date: iso,
      category: mapActivityCategory(typeRaw),
      title: doc.getElementsByTagName("name")[0]?.textContent || "GPX-aktivitet",
      source: "garmin",
      status: "completed",
      distanceM: Math.round(distM),
      durationSec: dur,
      avgHr,
      maxHr,
      paceSecPerKm: distM > 0 && dur ? dur / (distM / 1000) : null,
      externalId: `gpx:${iso}:${Math.round(distM)}`,
    },
  ];
}

// ---- ICS (planned sessions / calendar entries) ----
export function parseICS(text: string): Session[] {
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const out: Session[] = [];
  for (const b of blocks) {
    const body = b.split("END:VEVENT")[0];
    const get = (key: string): string | null => {
      const re = new RegExp(`(?:^|\\n)${key}[^:\\n]*:(.*)`);
      const m = body.match(re);
      return m ? m[1].trim() : null;
    };
    const dt = get("DTSTART");
    if (!dt) continue;
    const m = dt.match(/(\d{4})(\d{2})(\d{2})/);
    if (!m) continue;
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    const summary = unescapeICS(get("SUMMARY") || "Kalenderoppføring");
    const desc = unescapeICS(get("DESCRIPTION") || "");
    out.push({
      id: gid("ics"),
      date: iso,
      category: mapActivityCategory(summary + " " + desc),
      title: summary,
      source: "ical",
      status: "planned",
      description: desc || undefined,
      externalId: `ics:${get("UID") || `${iso}:${summary}`}`,
    });
  }
  return out;
}

function unescapeICS(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

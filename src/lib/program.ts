import type { Category, ProgramImport, Session } from "../types";
import { CATEGORIES } from "./categories";

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.key));

export interface ParsedProgram {
  programName: string;
  startDate: string;
  sessions: Session[];
  weekCount: number;
}

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function parseProgram(raw: unknown): ParsedProgram {
  const data = raw as ProgramImport;
  if (!data || typeof data !== "object") {
    throw new Error("Ugyldig program: forventa eit JSON-objekt.");
  }
  if (!Array.isArray(data.weeks) || data.weeks.length === 0) {
    throw new Error("Ugyldig program: manglar 'weeks'.");
  }
  if (!isISODate(data.startDate)) {
    throw new Error("Ugyldig program: 'startDate' må vere yyyy-mm-dd.");
  }

  const sessions: Session[] = [];
  for (const week of data.weeks) {
    if (!Array.isArray(week.days)) {
      throw new Error(`Veke ${week.weekNumber}: manglar 'days'.`);
    }
    for (const day of week.days) {
      if (!isISODate(day.date)) {
        throw new Error(`Ugyldig dato i veke ${week.weekNumber}: ${day.date}`);
      }
      const daySessions = day.sessions || [];
      daySessions.forEach((s, idx) => {
        if (!VALID_CATEGORIES.has(s.category)) {
          throw new Error(
            `Ukjend kategori '${s.category}' (${day.date}). Gyldige: ${[...VALID_CATEGORIES].join(", ")}`
          );
        }
        sessions.push({
          // Deterministic id per date+slot so local edits to a program
          // session survive across reloads of the repo program.
          id: `prog-${day.date}-${idx}`,
          date: day.date,
          category: s.category as Category,
          title: s.title || "Økt",
          source: "manual",
          status: "planned",
          description: s.description,
          durationSec: s.durationSec ?? null,
          distanceM: s.distanceM ?? null,
          paceSecPerKm: s.paceSecPerKm ?? null,
          exercises: s.exercises,
          intervals: s.intervals,
          line1: s.line1,
          line2: s.line2,
          externalId: null,
        });
      });
    }
  }

  return {
    programName: data.programName || "Program",
    startDate: data.startDate,
    sessions,
    weekCount: data.weeks.length,
  };
}

function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Build a program.json (schema) string from the current planned sessions,
// so the user can commit it to the repo / hand it to Claude for editing.
export function exportProgramJson(planned: Session[]): string {
  const sorted = [...planned].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    return JSON.stringify({ programName: "HYBRID 7r", startDate: new Date().toISOString().slice(0, 10), weeks: [] }, null, 2);
  }
  const startMonday = mondayOf(sorted[0].date);
  const byDate = new Map<string, Session[]>();
  for (const s of sorted) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  }
  // group days into weeks relative to startMonday
  const weeksMap = new Map<number, { date: string; sessions: any[] }[]>();
  const start = new Date(startMonday + "T00:00:00").getTime();
  for (const [date, list] of byDate) {
    const dayMs = new Date(date + "T00:00:00").getTime();
    const weekNo = Math.floor((dayMs - start) / (7 * 86400000)) + 1;
    if (!weeksMap.has(weekNo)) weeksMap.set(weekNo, []);
    weeksMap.get(weekNo)!.push({
      date,
      sessions: list.map((s) => ({
        category: s.category,
        title: s.title,
        line1: s.line1 ?? undefined,
        line2: s.line2 ?? undefined,
        description: s.description ?? undefined,
        exercises: s.exercises,
        intervals: s.intervals,
      })),
    });
  }
  const weeks = [...weeksMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekNumber, days]) => ({ weekNumber, days: days.sort((x, y) => x.date.localeCompare(y.date)) }));
  return JSON.stringify({ programName: "HYBRID 7r — program", startDate: startMonday, weeks }, null, 2);
}

export const EXAMPLE_PROGRAM = `{
  "programName": "HYBRID 7r",
  "startDate": "2026-06-08",
  "weeks": [
    { "weekNumber": 1, "days": [
      { "date": "2026-06-08", "sessions": [
        { "category": "styrke", "title": "Texas Method volum",
          "line1": "💪🏼 5×5 knebøy @ 180 kg", "line2": "EMOM strict pull-ups / benk",
          "description": "Volumdag." }
      ] }
    ] }
  ]
}`;

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

let counter = 0;
function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
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
      for (const s of daySessions) {
        if (!VALID_CATEGORIES.has(s.category)) {
          throw new Error(
            `Ukjend kategori '${s.category}' (${day.date}). Gyldige: ${[...VALID_CATEGORIES].join(", ")}`
          );
        }
        sessions.push({
          id: genId("prog"),
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
      }
    }
  }

  return {
    programName: data.programName || "Program",
    startDate: data.startDate,
    sessions,
    weekCount: data.weeks.length,
  };
}

export const EXAMPLE_PROGRAM = `{
  "programName": "HYBRID 7r — base 8 veker",
  "startDate": "2026-06-08",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "Aerob base + styrkevolum",
      "days": [
        {
          "date": "2026-06-08",
          "sessions": [
            {
              "category": "styrke",
              "title": "Texas Method volum",
              "line1": "💪🏼 5×5 knebøy @ 180 kg",
              "line2": "EMOM strict pull-ups / benk",
              "description": "Volumdag.",
              "exercises": [
                { "name": "Knebøy", "sets": [{ "reps": 5, "weightKg": 180 }] }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

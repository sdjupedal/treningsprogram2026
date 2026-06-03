import type { Category, Session } from "../types";

export interface SessionFilter {
  text: string;
  category: Category | "all";
  from: string; // ISO or ""
  to: string; // ISO or ""
  exercise: string;
  hrMin: number | null;
  hrMax: number | null;
  paceMin: number | null; // sec/km
  paceMax: number | null;
  weightMin: number | null; // kg, any set
  weightMax: number | null;
  status: "all" | "planned" | "completed";
}

export const EMPTY_FILTER: SessionFilter = {
  text: "",
  category: "all",
  from: "",
  to: "",
  exercise: "",
  hrMin: null,
  hrMax: null,
  paceMin: null,
  paceMax: null,
  weightMin: null,
  weightMax: null,
  status: "completed",
};

function sessionHaystack(s: Session): string {
  const parts: string[] = [s.title, s.description || "", s.rawNotes || "", s.category];
  for (const ex of s.exercises || []) parts.push(ex.name);
  return parts.join(" ").toLowerCase();
}

function maxSetWeight(s: Session): number | null {
  let max: number | null = null;
  for (const ex of s.exercises || []) {
    for (const set of ex.sets) {
      if (set.weightKg != null) max = Math.max(max ?? 0, set.weightKg);
    }
  }
  return max;
}

export function applyFilter(sessions: Session[], f: SessionFilter): Session[] {
  const text = f.text.trim().toLowerCase();
  const exercise = f.exercise.trim().toLowerCase();
  return sessions
    .filter((s) => {
      if (f.status !== "all" && s.status !== f.status) return false;
      if (f.category !== "all" && s.category !== f.category) return false;
      if (f.from && s.date < f.from) return false;
      if (f.to && s.date > f.to) return false;
      if (text && !sessionHaystack(s).includes(text)) return false;
      if (exercise) {
        const hasEx = (s.exercises || []).some((e) =>
          e.name.toLowerCase().includes(exercise)
        );
        const titleMatch = s.title.toLowerCase().includes(exercise);
        if (!hasEx && !titleMatch) return false;
      }
      if (f.hrMin != null && (s.avgHr == null || s.avgHr < f.hrMin)) return false;
      if (f.hrMax != null && (s.avgHr == null || s.avgHr > f.hrMax)) return false;
      if (f.paceMin != null && (s.paceSecPerKm == null || s.paceSecPerKm < f.paceMin)) return false;
      if (f.paceMax != null && (s.paceSecPerKm == null || s.paceSecPerKm > f.paceMax)) return false;
      if (f.weightMin != null) {
        const m = maxSetWeight(s);
        if (m == null || m < f.weightMin) return false;
      }
      if (f.weightMax != null) {
        const m = maxSetWeight(s);
        if (m == null || m > f.weightMax) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

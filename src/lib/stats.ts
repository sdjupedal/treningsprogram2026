import type { Session } from "../types";
import { parseISO, format } from "date-fns";

export type RangeKey = "7d" | "30d" | "90d" | "6m" | "12m" | "24m" | "custom";

export interface DateRange {
  from: string; // ISO
  to: string; // ISO
}

export const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 dagar" },
  { key: "30d", label: "30 dagar" },
  { key: "90d", label: "90 dagar" },
  { key: "6m", label: "6 mnd" },
  { key: "12m", label: "12 mnd" },
  { key: "24m", label: "24 mnd" },
  { key: "custom", label: "Eigendefinert" },
];

export function rangeFromKey(key: RangeKey, todayISO: string): DateRange {
  const to = todayISO;
  const today = parseISO(todayISO);
  const d = new Date(today);
  switch (key) {
    case "7d": d.setDate(d.getDate() - 7); break;
    case "30d": d.setDate(d.getDate() - 30); break;
    case "90d": d.setDate(d.getDate() - 90); break;
    case "6m": d.setMonth(d.getMonth() - 6); break;
    case "12m": d.setMonth(d.getMonth() - 12); break;
    case "24m": d.setMonth(d.getMonth() - 24); break;
    default: d.setDate(d.getDate() - 30);
  }
  return { from: format(d, "yyyy-MM-dd"), to };
}

export function inRange(s: Session, r: DateRange): boolean {
  return s.date >= r.from && s.date <= r.to;
}

function isRunning(s: Session): boolean {
  return s.category === "loping";
}

function isErgName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("skierg") || n.includes("rowerg") || n.includes("row") || n.includes("ski");
}

export interface StatSummary {
  completedSessions: Session[];
  runKm: number;
  ergMeters: number;
  squatTotalKg: number;
  squatHeaviestKg: number;
  sessionCount: number;
  countByCategory: Record<string, number>;
}

export function summarize(sessions: Session[], r: DateRange): StatSummary {
  const completed = sessions.filter((s) => s.status === "completed" && inRange(s, r));
  let runKm = 0;
  let ergMeters = 0;
  let squatTotalKg = 0;
  let squatHeaviestKg = 0;
  const countByCategory: Record<string, number> = {};

  for (const s of completed) {
    countByCategory[s.category] = (countByCategory[s.category] || 0) + 1;
    if (isRunning(s) && s.distanceM) runKm += s.distanceM / 1000;
    for (const ex of s.exercises || []) {
      const nameLc = ex.name.toLowerCase();
      const isSquat = nameLc.includes("knebøy") || nameLc.includes("squat");
      for (const set of ex.sets) {
        if (isSquat && set.weightKg != null) {
          squatTotalKg += set.reps * set.weightKg;
          if (set.weightKg > squatHeaviestKg) squatHeaviestKg = set.weightKg;
        }
        if (isErgName(ex.name) && set.weightKg == null) {
          // erg meters are often logged as reps = meters
          ergMeters += set.reps;
        }
      }
    }
    // erg meters can also be a cardio distance
    for (const iv of s.intervals || []) {
      const t = (s.title + " " + (s.description || "")).toLowerCase();
      if ((t.includes("skierg") || t.includes("rowerg") || t.includes("row") || t.includes("ski")) && iv.distanceM) {
        ergMeters += iv.repeats * iv.distanceM;
      }
    }
  }

  return {
    completedSessions: completed,
    runKm: round1(runKm),
    ergMeters: Math.round(ergMeters),
    squatTotalKg: Math.round(squatTotalKg),
    squatHeaviestKg: Math.round(squatHeaviestKg),
    sessionCount: completed.length,
    countByCategory,
  };
}

export interface FocusPoint {
  date: string;
  heaviestKg: number | null;
  totalKg: number | null;
  bestTimeSec: number | null;
}

// Trend series for a single named exercise / benchmark.
export function focusSeries(sessions: Session[], r: DateRange, name: string): FocusPoint[] {
  const nameLc = name.toLowerCase();
  const out: FocusPoint[] = [];
  const completed = sessions
    .filter((s) => s.status === "completed" && inRange(s, r))
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const s of completed) {
    let heaviest: number | null = null;
    let total: number | null = null;
    let matched = false;
    for (const ex of s.exercises || []) {
      if (ex.name.toLowerCase().includes(nameLc)) {
        matched = true;
        for (const set of ex.sets) {
          if (set.weightKg != null) {
            heaviest = Math.max(heaviest ?? 0, set.weightKg);
            total = (total ?? 0) + set.reps * set.weightKg;
          }
        }
      }
    }
    // benchmark WOD matched on title (e.g. Fran) -> use duration as best time
    let bestTime: number | null = null;
    if (s.title.toLowerCase().includes(nameLc) && s.durationSec) {
      matched = true;
      bestTime = s.durationSec;
    }
    if (matched) {
      out.push({ date: s.date, heaviestKg: heaviest, totalKg: total, bestTimeSec: bestTime });
    }
  }
  return out;
}

// Weekly volume rollup by category (for charts + AI export)
export interface WeekVolume {
  week: string; // ISO date of monday
  styrke: number;
  loping: number;
  sykkel: number;
  yoga_mob: number;
  kvile: number;
}

function mondayOf(iso: string): string {
  const d = parseISO(iso);
  const day = (d.getDay() + 6) % 7; // 0 = monday
  d.setDate(d.getDate() - day);
  return format(d, "yyyy-MM-dd");
}

export function weeklyVolume(sessions: Session[], r: DateRange): WeekVolume[] {
  const map = new Map<string, WeekVolume>();
  for (const s of sessions) {
    if (s.status !== "completed" || !inRange(s, r)) continue;
    const wk = mondayOf(s.date);
    if (!map.has(wk)) {
      map.set(wk, { week: wk, styrke: 0, loping: 0, sykkel: 0, yoga_mob: 0, kvile: 0 });
    }
    const w = map.get(wk)!;
    w[s.category] += 1;
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

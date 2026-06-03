// Core domain types for HYBRID 7r

export type Category = "styrke" | "loping" | "sykkel" | "yoga_mob" | "kvile";
export type Source = "manual" | "garmin" | "strava" | "btwb" | "ical";
export type Status = "planned" | "completed";

export interface StrengthSet {
  reps: number;
  weightKg: number | null;
  rpe?: number | null;
}

export interface Exercise {
  name: string;
  sets: StrengthSet[];
}

export interface CardioInterval {
  repeats: number;
  distanceM?: number | null;
  durationSec?: number | null;
  restSec?: number | null;
  targetPace?: string | null;
  zone?: number | null;
}

export interface Session {
  id: string;
  date: string; // ISO yyyy-mm-dd
  category: Category;
  title: string;
  source: Source;
  status: Status;
  description?: string;
  durationSec?: number | null;
  distanceM?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  paceSecPerKm?: number | null;
  exercises?: Exercise[];
  intervals?: CardioInterval[];
  rawNotes?: string;
  externalId?: string | null;
  // optional explicit display lines coming from an imported program
  line1?: string;
  line2?: string;
}

export interface ZoneBounds {
  // upper bound (inclusive) of each zone in bpm; last zone is open-ended
  s1Max: number; // < this -> Sone 1
  s2Max: number;
  s3Max: number;
  s4Max: number;
  // anything above s4Max -> Sone 5
}

export interface Settings {
  id: "settings";
  hrMax: number;
  zones: ZoneBounds;
  focusExercises: string[];
}

// Program JSON import schema
export interface ProgramSessionInput {
  category: Category;
  title: string;
  line1?: string;
  line2?: string;
  description?: string;
  durationSec?: number | null;
  distanceM?: number | null;
  paceSecPerKm?: number | null;
  exercises?: Exercise[];
  intervals?: CardioInterval[];
}

export interface ProgramDayInput {
  date: string;
  sessions: ProgramSessionInput[];
}

export interface ProgramWeekInput {
  weekNumber: number;
  focus?: string;
  days: ProgramDayInput[];
}

export interface ProgramImport {
  programName: string;
  startDate: string;
  weeks: ProgramWeekInput[];
}

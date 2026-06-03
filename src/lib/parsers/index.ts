import type { Session } from "../../types";
import {
  parseGarminCSV,
  parseStravaCSV,
  parseBtwbCSV,
  parseGPX,
  parseICS,
} from "./activities";
import { mapActivityCategory } from "./csv";
// @ts-ignore - the package ships its own loose types
import FitParser from "fit-file-parser";

let idc = 0;
function gid(): string {
  idc += 1;
  return `fit-${Date.now().toString(36)}-${idc}`;
}

export type ImportKind = "garmin" | "strava" | "btwb" | "gpx" | "ics" | "fit" | "auto";

export interface ImportResult {
  sessions: Session[];
  kind: ImportKind;
  filename: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export async function parseFIT(buffer: ArrayBuffer): Promise<Session[]> {
  const fitParser = new FitParser({
    force: true,
    speedUnit: "km/h",
    lengthUnit: "m",
    elapsedRecordField: true,
    mode: "list",
  });
  return new Promise((resolve) => {
    fitParser.parse(buffer, (err: unknown, data: any) => {
      if (err || !data) {
        resolve([]);
        return;
      }
      const sessions = data.sessions || [];
      const out: Session[] = [];
      for (const s of sessions) {
        const start: Date = s.start_time ? new Date(s.start_time) : new Date();
        const iso = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
        const sport = (s.sport || "").toString();
        const dist = s.total_distance ?? null; // metres
        const dur = s.total_elapsed_time ?? s.total_timer_time ?? null;
        out.push({
          id: gid(),
          date: iso,
          category: mapActivityCategory(sport),
          title: sport ? sport : "FIT-aktivitet",
          source: "garmin",
          status: "completed",
          distanceM: dist != null ? Math.round(dist) : null,
          durationSec: dur != null ? Math.round(dur) : null,
          avgHr: s.avg_heart_rate ?? null,
          maxHr: s.max_heart_rate ?? null,
          paceSecPerKm: dist && dur ? dur / (dist / 1000) : null,
          externalId: `fit:${iso}:${Math.round(dist ?? 0)}`,
        });
      }
      resolve(out);
    });
  });
}

function detectKind(filename: string, content: string): ImportKind {
  const f = filename.toLowerCase();
  if (f.endsWith(".fit")) return "fit";
  if (f.endsWith(".gpx")) return "gpx";
  if (f.endsWith(".ics")) return "ics";
  const head = content.slice(0, 2000).toLowerCase();
  if (head.includes("<gpx")) return "gpx";
  if (head.includes("begin:vcalendar")) return "ics";
  if (head.includes("activity date") || head.includes("activity id")) return "strava";
  // BtWB exports usually carry a workout/result column
  if (head.includes("rx") || head.includes("workout") || head.includes("score")) return "btwb";
  if (head.includes("activity type") || head.includes("aktivitetstype")) return "garmin";
  return "auto";
}

export async function importFile(file: File): Promise<ImportResult> {
  const name = file.name;
  if (name.toLowerCase().endsWith(".fit")) {
    const buf = await file.arrayBuffer();
    const sessions = await parseFIT(buf);
    return { sessions, kind: "fit", filename: name };
  }
  const text = await file.text();
  const kind = detectKind(name, text);
  let sessions: Session[] = [];
  switch (kind) {
    case "gpx": sessions = parseGPX(text); break;
    case "ics": sessions = parseICS(text); break;
    case "strava": sessions = parseStravaCSV(text); break;
    case "btwb": sessions = parseBtwbCSV(text); break;
    case "garmin": sessions = parseGarminCSV(text); break;
    default:
      // last resort: try garmin layout
      sessions = parseGarminCSV(text);
  }
  return { sessions, kind, filename: name };
}

// Explicit-kind import (when the user picks the source manually).
export async function importFileAs(file: File, kind: ImportKind): Promise<ImportResult> {
  if (kind === "fit") {
    const buf = await file.arrayBuffer();
    return { sessions: await parseFIT(buf), kind, filename: file.name };
  }
  const text = await file.text();
  let sessions: Session[] = [];
  switch (kind) {
    case "gpx": sessions = parseGPX(text); break;
    case "ics": sessions = parseICS(text); break;
    case "strava": sessions = parseStravaCSV(text); break;
    case "btwb": sessions = parseBtwbCSV(text); break;
    case "garmin": sessions = parseGarminCSV(text); break;
    default: return importFile(file);
  }
  return { sessions, kind, filename: file.name };
}

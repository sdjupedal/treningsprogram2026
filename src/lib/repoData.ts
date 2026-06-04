import type { Session } from "../types";
import { parseProgram } from "./program";

const BASE = (import.meta as any).env?.BASE_URL || "/";

async function fetchJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface RepoData {
  sessions: Session[];
  programLoaded: boolean;
  activitiesLoaded: boolean;
}

// Loads the canonical dataset from the repo (served as static files):
//   data/activities.json  -> array of completed Session
//   data/program.json     -> program schema (parsed to planned sessions)
// These are the source of truth managed via the repo (and later a Strava
// GitHub Action). In-app edits live separately in IndexedDB and override by id.
export async function fetchRepoSessions(): Promise<RepoData> {
  const [activities, program] = await Promise.all([
    fetchJson("data/activities.json"),
    fetchJson("data/program.json"),
  ]);

  const sessions: Session[] = [];
  let activitiesLoaded = false;
  let programLoaded = false;

  if (Array.isArray(activities)) {
    for (const s of activities) sessions.push(s as Session);
    activitiesLoaded = true;
  }
  if (program) {
    try {
      const parsed = parseProgram(program);
      sessions.push(...parsed.sessions);
      programLoaded = true;
    } catch {
      /* malformed program.json -> ignore, keep app alive */
    }
  }

  return { sessions, programLoaded, activitiesLoaded };
}

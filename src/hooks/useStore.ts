import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, saveSettings } from "../db/db";
import { fetchRepoSessions } from "../lib/repoData";
import type { Session, Settings } from "../types";

export function useSettings(): [Settings, (s: Settings) => Promise<void>] {
  // Read-only inside the liveQuery (writing here throws ReadOnlyError).
  const settings =
    useLiveQuery(async () => {
      const s = await db.settings.get("settings");
      return s ?? DEFAULT_SETTINGS;
    }) ?? DEFAULT_SETTINGS;
  return [settings, saveSettings];
}

export interface SessionsState {
  sessions: Session[];
  repoLoaded: boolean;
}

// Merged view: repo data (program + history, loaded from static JSON) overlaid
// with local IndexedDB sessions (logged/edited in-app). Local wins on id.
export function useSessionsState(): SessionsState {
  const local = useLiveQuery(() => db.sessions.toArray(), [], []) ?? [];
  const [repo, setRepo] = useState<Session[]>([]);
  const [repoLoaded, setRepoLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchRepoSessions().then((r) => {
      if (alive) {
        setRepo(r.sessions);
        setRepoLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const sessions = useMemo(() => {
    const byId = new Map<string, Session>();
    for (const s of repo) byId.set(s.id, s);
    for (const s of local) byId.set(s.id, s); // local override
    return [...byId.values()];
  }, [repo, local]);

  return { sessions, repoLoaded };
}

// Convenience: just the merged sessions array.
export function useSessions(): Session[] {
  return useSessionsState().sessions;
}

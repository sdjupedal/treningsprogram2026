import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, saveSettings } from "../db/db";
import type { Settings } from "../types";

export function useSettings(): [Settings, (s: Settings) => Promise<void>] {
  const settings =
    useLiveQuery(async () => {
      const s = await db.settings.get("settings");
      if (!s) {
        await db.settings.put(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return s;
    }) ?? DEFAULT_SETTINGS;

  return [settings, saveSettings];
}

export function useSessions() {
  return useLiveQuery(() => db.sessions.toArray(), [], []) ?? [];
}

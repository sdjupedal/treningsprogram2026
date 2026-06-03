import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_SETTINGS, saveSettings } from "../db/db";
import type { Settings } from "../types";

export function useSettings(): [Settings, (s: Settings) => Promise<void>] {
  // VIKTIG: spørjinga køyrer i ein read-only liveQuery-transaksjon.
  // Aldri skriv til databasen her (db.put) — Dexie kastar ReadOnlyError og
  // heile appen blir avmontert. Berre les; fall tilbake til standard til lagring.
  const settings =
    useLiveQuery(async () => {
      const s = await db.settings.get("settings");
      return s ?? DEFAULT_SETTINGS;
    }) ?? DEFAULT_SETTINGS;

  return [settings, saveSettings];
}

export function useSessions() {
  return useLiveQuery(() => db.sessions.toArray(), [], []) ?? [];
}

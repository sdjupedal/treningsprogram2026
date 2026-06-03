import Dexie, { type Table } from "dexie";
import type { Session, Settings, ZoneBounds } from "../types";

export const DEFAULT_ZONES: ZoneBounds = {
  // Olympiatoppen 5-zone model defaults (HRmax 190)
  s1Max: 137, // Sone 1 < 137
  s2Max: 156, // Sone 2 137-156
  s3Max: 165, // Sone 3 156-165
  s4Max: 175, // Sone 4 165-175 ; Sone 5 > 175
};

export const DEFAULT_SETTINGS: Settings = {
  id: "settings",
  hrMax: 190,
  zones: DEFAULT_ZONES,
  focusExercises: ["Knebøy", "Markløft", "Fran"],
};

class Hybrid7rDB extends Dexie {
  sessions!: Table<Session, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("hybrid7r");
    this.version(1).stores({
      sessions: "id, date, category, source, status, title",
      settings: "id",
    });
  }
}

export const db = new Hybrid7rDB();

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("settings");
  if (s) return s;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings): Promise<void> {
  await db.settings.put({ ...s, id: "settings" });
}

export async function putSession(s: Session): Promise<void> {
  await db.sessions.put(s);
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

export async function bulkPutSessions(list: Session[]): Promise<void> {
  await db.sessions.bulkPut(list);
}

// Full database export/import
export interface DbDump {
  schema: "hybrid7r";
  version: 1;
  exportedAt: string;
  sessions: Session[];
  settings: Settings;
}

export async function exportDump(): Promise<DbDump> {
  const [sessions, settings] = await Promise.all([
    db.sessions.toArray(),
    getSettings(),
  ]);
  return {
    schema: "hybrid7r",
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions,
    settings,
  };
}

export async function importDump(
  dump: DbDump,
  mode: "merge" | "replace"
): Promise<number> {
  if (dump.schema !== "hybrid7r") {
    throw new Error("Ugyldig fil: ikkje ein HYBRID 7r-eksport.");
  }
  if (mode === "replace") {
    await db.sessions.clear();
  }
  await db.sessions.bulkPut(dump.sessions);
  if (dump.settings) {
    await saveSettings(dump.settings);
  }
  return dump.sessions.length;
}

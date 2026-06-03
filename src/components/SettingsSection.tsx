import { useRef, useState } from "react";
import type { Session, Settings } from "../types";
import { db, exportDump, importDump, bulkPutSessions, type DbDump } from "../db/db";
import { describeZones } from "../lib/zones";
import { importFile, type ImportResult } from "../lib/parsers";
import { planMerge, type MergePlan } from "../lib/importMerge";
import { triggerDownload } from "../lib/ical";
import { buildAIBrief } from "../lib/aiExport";
import { rangeFromKey } from "../lib/stats";
import { categoryLabel } from "../lib/categories";
import { fmtDistance, fmtDuration } from "../lib/format";

export function SettingsSection({
  settings, saveSettings, sessions, today,
}: {
  settings: Settings;
  saveSettings: (s: Settings) => Promise<void>;
  sessions: Session[];
  today: string;
}) {
  const [local, setLocal] = useState<Settings>(settings);
  const [focusInput, setFocusInput] = useState("");
  const [over, setOver] = useState(false);
  const [pending, setPending] = useState<{ result: ImportResult; plan: MergePlan } | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dbFileRef = useRef<HTMLInputElement>(null);

  function setZone<K extends keyof Settings["zones"]>(k: K, v: number) {
    setLocal((p) => ({ ...p, zones: { ...p.zones, [k]: v } }));
  }

  async function persist() {
    await saveSettings(local);
    setMsg({ kind: "ok", text: "Innstillingar lagra." });
  }

  function addFocus() {
    const v = focusInput.trim();
    if (!v) return;
    setLocal((p) => ({ ...p, focusExercises: [...p.focusExercises, v] }));
    setFocusInput("");
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setMsg(null);
    let all: Session[] = [];
    let lastKind: ImportResult["kind"] = "auto";
    for (const f of Array.from(files)) {
      const res = await importFile(f);
      all = all.concat(res.sessions);
      lastKind = res.kind;
    }
    if (all.length === 0) {
      setMsg({ kind: "err", text: "Fann ingen økter i fila. Sjekk formatet." });
      return;
    }
    const existing = await db.sessions.toArray();
    const plan = planMerge(all, existing);
    setPending({ result: { sessions: all, kind: lastKind, filename: `${files.length} fil(er)` }, plan });
  }

  async function commitImport(includeConflicts: boolean) {
    if (!pending) return;
    const toWrite = includeConflicts
      ? [...pending.plan.toAdd, ...pending.plan.conflicts.map((c) => c.incoming)]
      : pending.plan.toAdd;
    await bulkPutSessions(toWrite);
    setMsg({ kind: "ok", text: `Importerte ${toWrite.length} økter (${pending.plan.duplicates.length} duplikat hoppa over).` });
    setPending(null);
  }

  async function doExportDb() {
    const dump = await exportDump();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    triggerDownload(blob, `hybrid7r-backup-${today}.json`);
  }

  async function doImportDb(file: File, mode: "merge" | "replace") {
    try {
      const dump = JSON.parse(await file.text()) as DbDump;
      const n = await importDump(dump, mode);
      setMsg({ kind: "ok", text: `Importerte database (${n} økter, ${mode === "replace" ? "erstatta" : "fletta"}).` });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    }
  }

  function doAIExport() {
    const brief = buildAIBrief(sessions, settings, rangeFromKey("24m", today));
    navigator.clipboard?.writeText(brief).catch(() => {});
    const blob = new Blob([brief], { type: "text/markdown" });
    triggerDownload(blob, `hybrid7r-ai-underlag-${today}.md`);
    setMsg({ kind: "ok", text: "Underlag kopiert til utklippstavla og lasta ned. Lim inn i Claude." });
  }

  return (
    <section className="panel">
      <div className="panel-head"><h2>Innstillingar</h2></div>
      {msg && <div className={`notice ${msg.kind === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

      <h4 style={{ marginBottom: 10 }}>Pulssoner (Olympiatoppen 5-soner)</h4>
      <div className="grid2">
        <div className="field">
          <label>HRmax</label>
          <input type="number" value={local.hrMax} onChange={(e) => setLocal((p) => ({ ...p, hrMax: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="row">
        <div style={{ width: 140 }}><label>Sone 1 maks (&lt;)</label><input type="number" value={local.zones.s1Max} onChange={(e) => setZone("s1Max", Number(e.target.value))} /></div>
        <div style={{ width: 140 }}><label>Sone 2 maks</label><input type="number" value={local.zones.s2Max} onChange={(e) => setZone("s2Max", Number(e.target.value))} /></div>
        <div style={{ width: 140 }}><label>Sone 3 maks</label><input type="number" value={local.zones.s3Max} onChange={(e) => setZone("s3Max", Number(e.target.value))} /></div>
        <div style={{ width: 140 }}><label>Sone 4 maks</label><input type="number" value={local.zones.s4Max} onChange={(e) => setZone("s4Max", Number(e.target.value))} /></div>
      </div>
      <div className="muted" style={{ fontSize: 12, margin: "8px 0 16px" }}>
        {describeZones(local.zones).join("  ·  ")}
      </div>

      <h4 style={{ marginBottom: 10 }}>Fokusøvingar</h4>
      <div className="row" style={{ marginBottom: 8 }}>
        {local.focusExercises.map((name, i) => (
          <span key={i} className="tag" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {name}
            <button className="small ghost" style={{ padding: "0 4px" }}
              onClick={() => setLocal((p) => ({ ...p, focusExercises: p.focusExercises.filter((_, j) => j !== i) }))}>✕</button>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <input style={{ maxWidth: 220 }} placeholder="Legg til (t.d. Markløft)" value={focusInput}
          onChange={(e) => setFocusInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFocus()} />
        <button className="ghost small" onClick={addFocus}>Legg til</button>
      </div>

      <button className="primary" onClick={persist} style={{ marginBottom: 22 }}>Lagre innstillingar</button>

      <hr style={{ border: "none", borderTop: "1px solid var(--border-soft)", margin: "8px 0 18px" }} />

      <h4 style={{ marginBottom: 6 }}>Importer treningsdata</h4>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Garmin (CSV / GDPR-eksport / .fit / .gpx), Strava (bulk-eksport CSV), Beyond the Whiteboard (CSV), iCal (.ics).
      </div>
      <div
        className={`dropzone${over ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
      >
        Dra filer hit, eller trykk for å velje.
        <input ref={fileRef} type="file" multiple style={{ display: "none" }}
          accept=".csv,.gpx,.ics,.fit" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {pending && (
        <div className="notice" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", marginTop: 12 }}>
          <strong>Førehandsvising</strong> — {pending.result.kind.toUpperCase()}, {pending.result.filename}
          <div style={{ margin: "6px 0" }}>
            Nye: {pending.plan.toAdd.length} · Duplikat: {pending.plan.duplicates.length} · Konfliktar (gjennomført finst): {pending.plan.conflicts.length}
          </div>
          <div className="code" style={{ maxHeight: 160 }}>
            {pending.plan.toAdd.slice(0, 12).map((s) =>
              `${s.date}  ${categoryLabel(s.category)}  ${s.title}  ${s.distanceM ? fmtDistance(s.distanceM) : ""} ${s.durationSec ? fmtDuration(s.durationSec) : ""}`
            ).join("\n")}
            {pending.plan.toAdd.length > 12 ? `\n… +${pending.plan.toAdd.length - 12} til` : ""}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary small" onClick={() => commitImport(false)}>Importer nye</button>
            {pending.plan.conflicts.length > 0 && (
              <button className="small" onClick={() => commitImport(true)}>Importer og overskriv konfliktar</button>
            )}
            <button className="ghost small" onClick={() => setPending(null)}>Avbryt</button>
          </div>
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--border-soft)", margin: "18px 0" }} />

      <h4 style={{ marginBottom: 10 }}>Backup og AI</h4>
      <div className="row">
        <button className="ghost" onClick={doExportDb}>Eksporter database (JSON)</button>
        <button className="ghost" onClick={() => dbFileRef.current?.click()}>Importer database…</button>
        <input ref={dbFileRef} type="file" accept=".json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) doImportDb(f, "merge"); }} />
        <button className="primary" onClick={doAIExport}>Eksporter for AI-analyse</button>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        AI-eksporten lagar eit kompakt samandrag (siste 24 mnd) utan GPS-spor, klart til å lime inn i Claude.
      </div>
    </section>
  );
}

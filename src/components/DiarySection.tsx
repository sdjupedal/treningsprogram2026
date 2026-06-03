import { useMemo, useState } from "react";
import type { Session } from "../types";
import { EMPTY_FILTER, applyFilter, type SessionFilter } from "../lib/search";
import { CATEGORIES, categoryColor, categoryLabel } from "../lib/categories";
import { fmtDateLong, fmtDuration, fmtDistance, fmtPace, parsePace } from "../lib/format";
import { SessionEditor } from "./SessionEditor";
import { putSession, deleteSession } from "../db/db";

export function DiarySection({ sessions }: { sessions: Session[] }) {
  const [f, setF] = useState<SessionFilter>(EMPTY_FILTER);
  const [editing, setEditing] = useState<Session | null>(null);
  const [showAdv, setShowAdv] = useState(false);

  const results = useMemo(() => applyFilter(sessions, f), [sessions, f]);

  function up<K extends keyof SessionFilter>(k: K, v: SessionFilter[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function save(s: Session) { await putSession(s); setEditing(null); }
  async function remove(id: string) { await deleteSession(id); setEditing(null); }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Treningsdagbok</h2>
        <span className="sub">{results.length} treff</span>
        <span className="spacer" />
        <button className="small ghost" onClick={() => setShowAdv((v) => !v)}>
          {showAdv ? "Færre filter" : "Fleire filter"}
        </button>
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <input
          style={{ flex: 2, minWidth: 200 }}
          placeholder="Søk: tittel, øving, notat… (t.d. Fran)"
          value={f.text}
          onChange={(e) => up("text", e.target.value)}
        />
        <select style={{ width: 150 }} value={f.category} onChange={(e) => up("category", e.target.value as any)}>
          <option value="all">Alle kategoriar</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
        </select>
        <select style={{ width: 140 }} value={f.status} onChange={(e) => up("status", e.target.value as any)}>
          <option value="completed">Gjennomført</option>
          <option value="planned">Planlagt</option>
          <option value="all">Alle</option>
        </select>
      </div>

      {showAdv && (
        <div className="row" style={{ marginBottom: 12 }}>
          <div style={{ width: 150 }}>
            <label>Frå dato</label>
            <input type="date" value={f.from} onChange={(e) => up("from", e.target.value)} />
          </div>
          <div style={{ width: 150 }}>
            <label>Til dato</label>
            <input type="date" value={f.to} onChange={(e) => up("to", e.target.value)} />
          </div>
          <div style={{ width: 150 }}>
            <label>Øving</label>
            <input value={f.exercise} onChange={(e) => up("exercise", e.target.value)} placeholder="Knebøy" />
          </div>
          <div style={{ width: 110 }}>
            <label>Vekt min (kg)</label>
            <input type="number" value={f.weightMin ?? ""} onChange={(e) => up("weightMin", e.target.value === "" ? null : Number(e.target.value))} />
          </div>
          <div style={{ width: 110 }}>
            <label>HR min</label>
            <input type="number" value={f.hrMin ?? ""} onChange={(e) => up("hrMin", e.target.value === "" ? null : Number(e.target.value))} />
          </div>
          <div style={{ width: 120 }}>
            <label>Fart raskare enn</label>
            <input placeholder="4:00" onChange={(e) => up("paceMax", parsePace(e.target.value))} />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button className="small ghost" onClick={() => setF(EMPTY_FILTER)}>Nullstill</button>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="empty">Ingen økter matchar søket.</div>
      ) : (
        results.map((s) => (
          <div
            key={s.id}
            className="session-row"
            style={{ ["--cat" as any]: categoryColor(s.category), cursor: "pointer" }}
            onClick={() => setEditing(s)}
          >
            <div className="bar" />
            <div style={{ flex: 1 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{s.title}</strong>
                <span className="faint mono" style={{ fontSize: 12 }}>{fmtDateLong(s.date)}</span>
              </div>
              <div className="meta">
                <span className="tag">{categoryLabel(s.category)}</span>
                {s.distanceM ? <span className="mono">{fmtDistance(s.distanceM)}</span> : null}
                {s.durationSec ? <span className="mono">{fmtDuration(s.durationSec)}</span> : null}
                {s.paceSecPerKm ? <span className="mono">{fmtPace(s.paceSecPerKm)}</span> : null}
                {s.avgHr ? <span className="mono">HR {s.avgHr}</span> : null}
                {(s.exercises || []).map((ex, i) => (
                  <span key={i}>
                    {ex.name} {ex.sets.map((x) => `${x.reps}${x.weightKg != null ? `×${x.weightKg}` : ""}`).join("/")}
                  </span>
                ))}
                <span className="faint">{s.source}</span>
              </div>
            </div>
          </div>
        ))
      )}

      {editing && (
        <SessionEditor initial={editing} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

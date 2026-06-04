import { useMemo, useState } from "react";
import type { Session } from "../types";
import { putSession, deleteSession } from "../db/db";
import { exportProgramJson } from "../lib/program";
import { triggerDownload } from "../lib/ical";
import { toISODate, dayNameShort } from "../lib/format";
import { SessionCell } from "./SessionCell";
import { SessionEditor, emptySession } from "./SessionEditor";
import { Legend } from "./Legend";

const DAY_MS = 86400000;

function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function ProgramSection({ sessions, today }: { sessions: Session[]; today: string }) {
  const [editing, setEditing] = useState<Session | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const startMonday = useMemo(() => mondayOf(new Date(today)), [today]);

  const weekCount = useMemo(() => {
    let maxIso = today;
    for (const s of sessions) {
      if (s.status === "planned" && s.date > maxIso) maxIso = s.date;
    }
    const diffDays = Math.round((new Date(maxIso + "T00:00:00").getTime() - startMonday.getTime()) / DAY_MS);
    return Math.min(16, Math.max(8, Math.ceil((diffDays + 1) / 7)));
  }, [sessions, startMonday, today]);

  const weeks = useMemo(() => {
    const arr: { weekIdx: number; days: { iso: string; date: Date }[] }[] = [];
    for (let w = 0; w < weekCount; w++) {
      const days: { iso: string; date: Date }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startMonday.getTime() + (w * 7 + d) * DAY_MS);
        days.push({ iso: toISODate(date), date });
      }
      arr.push({ weekIdx: w, days });
    }
    return arr;
  }, [startMonday, weekCount]);

  const byDate = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of sessions) {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date)!.push(s);
    }
    return m;
  }, [sessions]);

  function exportProgram() {
    const planned = sessions.filter((s) => s.status === "planned");
    const json = exportProgramJson(planned);
    const blob = new Blob([json], { type: "application/json" });
    triggerDownload(blob, "program.json");
  }

  async function onDrop(targetIso: string) {
    if (!dragId) return;
    const s = sessions.find((x) => x.id === dragId);
    if (s && s.date !== targetIso) await putSession({ ...s, date: targetIso });
    setDragId(null);
    setDragOver(null);
  }

  async function save(s: Session) {
    await putSession(s);
    setEditing(null);
  }
  async function remove(id: string) {
    await deleteSession(id);
    setEditing(null);
  }

  return (
    <section className="panel hero">
      <div className="panel-head">
        <h2>Planlagt treningsprogram</h2>
        <span className="sub">{weekCount} veker fram</span>
        <span className="spacer" />
        <button className="small ghost" onClick={exportProgram}>
          Last ned program.json
        </button>
      </div>

      <div className="notice" style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}>
        Programmet kjem frå <span className="mono">data/program.json</span> i repoet. For å endre det: chat med Claude i samtalen «Treningsprogram - Økter», få oppdatert <span className="mono">program.json</span>, og commit fila. Endringar du gjer her i appen er lokale.
      </div>

      <div style={{ marginBottom: 14 }}>
        <Legend />
      </div>

      {weeks.map(({ weekIdx, days }) => {
        const isCollapsed = collapsed[weekIdx] ?? weekIdx !== 0;
        return (
          <div className="week" key={weekIdx}>
            <div className="week-head" onClick={() => setCollapsed((c) => ({ ...c, [weekIdx]: !isCollapsed }))}>
              <span className="wk">VEKE {weekIdx + 1}</span>
              <span className="focus">{days[0].iso} – {days[6].iso}</span>
              <span className="spacer" />
              <span className="faint">{isCollapsed ? "▸" : "▾"}</span>
            </div>
            {!isCollapsed && (
              <div className="week-grid">
                {days.map(({ iso, date }) => {
                  const list = byDate.get(iso) || [];
                  return (
                    <div
                      key={iso}
                      className={`day-col${iso === today ? " today" : ""}${dragOver === iso ? " dragover" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(iso); }}
                      onDragLeave={() => setDragOver((d) => (d === iso ? null : d))}
                      onDrop={() => onDrop(iso)}
                    >
                      <div className="day-label">
                        {dayNameShort(date)} {date.getDate()}.{date.getMonth() + 1}
                      </div>
                      {list.map((s) => (
                        <SessionCell
                          key={s.id}
                          session={s}
                          draggable
                          onDragStart={() => setDragId(s.id)}
                          onClick={() => setEditing(s)}
                        />
                      ))}
                      <button
                        className="small ghost"
                        style={{ fontSize: 11, padding: "2px 6px", opacity: 0.7 }}
                        onClick={() => setEditing({ ...emptySession(iso), status: "planned" })}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {editing && (
        <SessionEditor initial={editing} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

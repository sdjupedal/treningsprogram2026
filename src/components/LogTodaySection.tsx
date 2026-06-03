import { useMemo, useState } from "react";
import type { Session } from "../types";
import { putSession } from "../db/db";
import { SessionEditor, emptySession } from "./SessionEditor";
import { SessionCell } from "./SessionCell";
import { fmtDateLong } from "../lib/format";

export function LogTodaySection({ sessions, today }: { sessions: Session[]; today: string }) {
  const [editing, setEditing] = useState<Session | null>(null);

  const todays = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const planned = todays.filter((s) => s.status === "planned");

  async function save(s: Session) {
    await putSession({ ...s, status: "completed" });
    setEditing(null);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Logg dagens økt</h2>
        <span className="sub">{fmtDateLong(today)}</span>
        <span className="spacer" />
        <button className="primary small" onClick={() => setEditing(emptySession(today))}>
          + Ny økt i dag
        </button>
      </div>

      {planned.length > 0 && (
        <>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Planlagt i dag — trykk for å fylle inn faktiske tal og markere som gjennomført:
          </div>
          <div className="row">
            {planned.map((s) => (
              <div key={s.id} style={{ minWidth: 200 }}>
                <SessionCell
                  session={s}
                  onClick={() => setEditing({ ...s, status: "completed" })}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {todays.filter((s) => s.status === "completed").length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Gjennomført i dag:</div>
          <div className="row">
            {todays.filter((s) => s.status === "completed").map((s) => (
              <div key={s.id} style={{ minWidth: 200 }}>
                <SessionCell session={s} onClick={() => setEditing(s)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {planned.length === 0 && todays.length === 0 && (
        <div className="empty">Ingenting planlagt i dag. Legg til ei økt direkte.</div>
      )}

      {editing && (
        <SessionEditor initial={editing} onSave={save} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

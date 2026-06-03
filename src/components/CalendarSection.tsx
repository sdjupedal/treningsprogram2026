import { useMemo, useState } from "react";
import type { Session } from "../types";
import { categoryColor } from "../lib/categories";
import { fmtMonthYear, toISODate } from "../lib/format";
import { downloadICS } from "../lib/ical";
import { SessionCell } from "./SessionCell";
import { SessionEditor, emptySession } from "./SessionEditor";
import { putSession, deleteSession } from "../db/db";

const DAY_MS = 86400000;
const WEEKDAYS = ["må", "ty", "on", "to", "fr", "la", "sø"];

function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function CalendarSection({ sessions, today }: { sessions: Session[]; today: string }) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date(today));
  const [editing, setEditing] = useState<Session | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of sessions) {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date)!.push(s);
    }
    return m;
  }, [sessions]);

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = mondayOf(first);
    const cells: { date: Date; iso: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(start.getTime() + i * DAY_MS);
      cells.push({ date, iso: toISODate(date), inMonth: date.getMonth() === cursor.getMonth() });
    }
    return cells;
  }, [cursor]);

  const weekCells = useMemo(() => {
    const start = mondayOf(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start.getTime() + i * DAY_MS);
      return { date, iso: toISODate(date) };
    });
  }, [cursor]);

  function step(dir: number) {
    const d = new Date(cursor);
    if (mode === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  }

  async function save(s: Session) { await putSession(s); setEditing(null); }
  async function remove(id: string) { await deleteSession(id); setEditing(null); }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Kalender</h2>
        <span className="spacer" />
        <div className="pill-toggle">
          <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>Månad</button>
          <button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>Veke</button>
        </div>
        <button className="small ghost" onClick={() => downloadICS(sessions, "hybrid7r.ics")}>
          Eksporter alt til iCal
        </button>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <button className="small ghost" onClick={() => step(-1)}>‹</button>
        <strong style={{ minWidth: 160, textAlign: "center" }}>{fmtMonthYear(cursor)}</strong>
        <button className="small ghost" onClick={() => step(1)}>›</button>
        <button className="small ghost" onClick={() => setCursor(new Date(today))}>I dag</button>
      </div>

      <div className="weekday-head">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>

      {mode === "month" ? (
        <div className="cal-grid">
          {monthCells.map(({ date, iso, inMonth }) => {
            const list = byDate.get(iso) || [];
            return (
              <div
                key={iso}
                className={`cal-cell${inMonth ? "" : " out"}${iso === today ? " today" : ""}`}
                onClick={() => setEditing(emptySession(iso))}
              >
                <div className="cal-num">{date.getDate()}</div>
                {list.length <= 2 ? (
                  list.map((s) => (
                    <div key={s.id} className="cal-mini" style={{ ["--cat" as any]: categoryColor(s.category) }}>
                      {s.title}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="cal-dot">
                      {list.map((s) => (
                        <span key={s.id} className="dot" style={{ ["--cat" as any]: categoryColor(s.category) }} />
                      ))}
                    </div>
                    <div className="faint" style={{ fontSize: 11 }}>{list.length} økter</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cal-grid">
          {weekCells.map(({ date, iso }) => {
            const list = byDate.get(iso) || [];
            return (
              <div key={iso} className={`cal-cell${iso === today ? " today" : ""}`} style={{ minHeight: 160 }}>
                <div className="cal-num">{date.getDate()}</div>
                {list.map((s) => (
                  <SessionCell key={s.id} session={s} onClick={() => setEditing(s)} />
                ))}
                <button className="small ghost" style={{ fontSize: 11, opacity: 0.6 }} onClick={() => setEditing(emptySession(iso))}>+</button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <SessionEditor initial={editing} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

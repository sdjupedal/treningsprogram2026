import { useState } from "react";
import type { Category, Exercise, Session } from "../types";
import { CATEGORIES } from "../lib/categories";
import { fmtDuration, parseDuration, fmtPace, parsePace } from "../lib/format";

function newId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptySession(date: string): Session {
  return {
    id: newId(),
    date,
    category: "styrke",
    title: "",
    source: "manual",
    status: "completed",
    exercises: [],
  };
}

export function SessionEditor({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Session;
  onSave: (s: Session) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [s, setS] = useState<Session>({ ...initial, exercises: initial.exercises ?? [] });
  const [durText, setDurText] = useState(fmtDuration(initial.durationSec));
  const [paceText, setPaceText] = useState(fmtPace(initial.paceSecPerKm));

  function set<K extends keyof Session>(k: K, v: Session[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function updateExercise(idx: number, ex: Exercise) {
    const list = [...(s.exercises || [])];
    list[idx] = ex;
    set("exercises", list);
  }

  function addExercise() {
    set("exercises", [...(s.exercises || []), { name: "", sets: [{ reps: 5, weightKg: null }] }]);
  }

  function removeExercise(idx: number) {
    set("exercises", (s.exercises || []).filter((_, i) => i !== idx));
  }

  function save() {
    const out: Session = {
      ...s,
      title: s.title.trim() || "Økt",
      durationSec: parseDuration(durText),
      paceSecPerKm: parsePace(paceText),
      distanceM: s.distanceM != null ? Number(s.distanceM) : null,
      line1: undefined,
      line2: undefined,
    };
    onSave(out);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{initial.title ? "Rediger økt" : "Ny økt"}</h3>

        <div className="grid2">
          <div className="field">
            <label>Dato</label>
            <input type="date" value={s.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="field">
            <label>Kategori</label>
            <select value={s.category} onChange={(e) => set("category", e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Tittel</label>
          <input value={s.title} onChange={(e) => set("title", e.target.value)} placeholder="t.d. Texas Method volum" />
        </div>

        <div className="grid2">
          <div className="field">
            <label>Status</label>
            <select value={s.status} onChange={(e) => set("status", e.target.value as Session["status"])}>
              <option value="planned">Planlagt</option>
              <option value="completed">Gjennomført</option>
            </select>
          </div>
          <div className="field">
            <label>Varigheit (t:mm:ss)</label>
            <input value={durText} onChange={(e) => setDurText(e.target.value)} placeholder="1:05:00" />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Distanse (m)</label>
            <input
              type="number"
              value={s.distanceM ?? ""}
              onChange={(e) => set("distanceM", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Fart (m:ss/km)</label>
            <input value={paceText} onChange={(e) => setPaceText(e.target.value)} placeholder="4:00" />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Snitt-puls</label>
            <input
              type="number"
              value={s.avgHr ?? ""}
              onChange={(e) => set("avgHr", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Maks-puls</label>
            <input
              type="number"
              value={s.maxHr ?? ""}
              onChange={(e) => set("maxHr", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="field">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <label style={{ margin: 0 }}>Øvingar (styrke)</label>
            <button className="small ghost" onClick={addExercise}>+ øving</button>
          </div>
          {(s.exercises || []).map((ex, i) => (
            <ExerciseRow
              key={i}
              ex={ex}
              onChange={(e) => updateExercise(i, e)}
              onRemove={() => removeExercise(i)}
            />
          ))}
        </div>

        <div className="field">
          <label>Skildring / kommentar</label>
          <textarea
            rows={3}
            value={s.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Notat, soner, intervalldetaljar…"
          />
        </div>

        <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
          <div>
            {onDelete && initial.title && (
              <button className="danger" onClick={() => onDelete(s.id)}>Slett</button>
            )}
          </div>
          <div className="row">
            <button className="ghost" onClick={onClose}>Avbryt</button>
            <button className="primary" onClick={save}>Lagre</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExerciseRow({
  ex,
  onChange,
  onRemove,
}: {
  ex: Exercise;
  onChange: (e: Exercise) => void;
  onRemove: () => void;
}) {
  const set0 = ex.sets[0] ?? { reps: 0, weightKg: null };
  return (
    <div className="exrow">
      <input
        placeholder="Øving (t.d. Knebøy)"
        value={ex.name}
        onChange={(e) => onChange({ ...ex, name: e.target.value })}
      />
      <input
        type="number"
        placeholder="reps"
        value={set0.reps || ""}
        onChange={(e) => onChange({ ...ex, sets: [{ ...set0, reps: Number(e.target.value) }] })}
      />
      <input
        type="number"
        placeholder="kg"
        value={set0.weightKg ?? ""}
        onChange={(e) =>
          onChange({ ...ex, sets: [{ ...set0, weightKg: e.target.value === "" ? null : Number(e.target.value) }] })
        }
      />
      <button className="small ghost" onClick={onRemove}>✕</button>
    </div>
  );
}

import type { Session } from "../types";
import { categoryColor, categoryEmoji } from "../lib/categories";
import { fmtDuration, fmtPace, fmtDistance } from "../lib/format";
import { zoneLabel } from "../lib/zones";

// Derive the two-line cell text when explicit lines are absent.
export function deriveLines(s: Session): { l1: string; l2: string } {
  if (s.line1 || s.line2) {
    return { l1: s.line1 || s.title, l2: s.line2 || "" };
  }
  const emoji = categoryEmoji(s.category);
  let l1 = `${emoji} ${s.title}`.trim();
  let l2 = "";

  if (s.exercises && s.exercises.length) {
    const ex = s.exercises[0];
    const set = ex.sets[0];
    if (set) {
      const w = set.weightKg != null ? ` @ ${set.weightKg} kg` : "";
      l1 = `${emoji} ${ex.sets.length}×${set.reps} ${ex.name}${w}`.trim();
    }
    if (s.durationSec) l2 = fmtDuration(s.durationSec);
  } else if (s.intervals && s.intervals.length) {
    const iv = s.intervals[0];
    const dist = iv.distanceM ? `${iv.distanceM}m` : iv.durationSec ? fmtDuration(iv.durationSec) : "";
    const pace = iv.targetPace ? ` @ ${iv.targetPace}` : "";
    l1 = `${emoji} ${iv.repeats}×${dist}${pace}`.trim();
    const parts: string[] = [];
    if (iv.restSec != null) parts.push(`${iv.restSec} s pause`);
    if (iv.zone != null) parts.push(zoneLabel(iv.zone));
    l2 = parts.join(" · ");
  } else {
    const parts: string[] = [];
    if (s.distanceM) parts.push(fmtDistance(s.distanceM));
    if (s.durationSec) parts.push(fmtDuration(s.durationSec));
    if (s.paceSecPerKm) parts.push(fmtPace(s.paceSecPerKm));
    if (parts.length) l1 = `${emoji} ${parts.join(" · ")}`;
    if (s.avgHr) l2 = `HR ${s.avgHr}`;
  }
  return { l1, l2 };
}

export function SessionCell({
  session,
  onClick,
  draggable,
  onDragStart,
}: {
  session: Session;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const { l1, l2 } = deriveLines(session);
  return (
    <div
      className={`cell${session.status === "completed" ? " done" : ""}`}
      style={{ ["--cat" as any]: categoryColor(session.category) }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      title={session.description || session.title}
    >
      <div className="l1">
        {session.status === "completed" && <span className="tick">✓ </span>}
        {l1}
      </div>
      {l2 && <div className="l2">{l2}</div>}
    </div>
  );
}

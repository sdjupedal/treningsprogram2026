import type { Session } from "../types";

export interface MergePlan {
  toAdd: Session[];
  duplicates: Session[]; // identical externalId/key already present
  conflicts: { incoming: Session; existing: Session }[]; // would overwrite a completed session
}

function key(s: Session): string {
  if (s.externalId) return `eid:${s.externalId}`;
  return `k:${s.date}:${s.source}:${s.category}:${s.title}`;
}

export function planMerge(incoming: Session[], existing: Session[]): MergePlan {
  const byKey = new Map<string, Session>();
  for (const e of existing) byKey.set(key(e), e);

  const toAdd: Session[] = [];
  const duplicates: Session[] = [];
  const conflicts: { incoming: Session; existing: Session }[] = [];

  for (const inc of incoming) {
    const match = byKey.get(key(inc));
    if (!match) {
      toAdd.push(inc);
      continue;
    }
    if (match.status === "completed") {
      // never silently overwrite a completed session
      conflicts.push({ incoming: inc, existing: match });
    } else {
      duplicates.push(inc);
    }
  }
  return { toAdd, duplicates, conflicts };
}

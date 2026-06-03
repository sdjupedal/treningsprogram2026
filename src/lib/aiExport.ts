import type { Session, Settings } from "../types";
import type { DateRange } from "./stats";
import { summarize, weeklyVolume, focusSeries, inRange } from "./stats";
import { categoryLabel } from "./categories";
import { fmtDuration, fmtPace, fmtDistance } from "./format";

// Produces a compact markdown brief suitable for pasting into Claude.
// Strips GPS streams; keeps per-session key metrics and weekly rollups.
export function buildAIBrief(
  sessions: Session[],
  settings: Settings,
  range: DateRange
): string {
  const sum = summarize(sessions, range);
  const weeks = weeklyVolume(sessions, range);
  const lines: string[] = [];

  lines.push(`# HYBRID 7r — treningsunderlag`);
  lines.push(`Periode: ${range.from} til ${range.to}`);
  lines.push(`HRmax: ${settings.hrMax}. Sonemodell: Olympiatoppen 5-soner.`);
  lines.push("");
  lines.push(`## Samandrag`);
  lines.push(`- Økter totalt: ${sum.sessionCount}`);
  lines.push(`- Løp: ${sum.runKm} km`);
  lines.push(`- SkiErg/RowErg: ${sum.ergMeters} m`);
  lines.push(`- Knebøy totalvolum: ${sum.squatTotalKg} kg`);
  lines.push(`- Knebøy tyngste enkeltløft: ${sum.squatHeaviestKg} kg`);
  lines.push(
    `- Fordeling: ` +
      Object.entries(sum.countByCategory)
        .map(([k, v]) => `${categoryLabel(k as any)} ${v}`)
        .join(", ")
  );
  lines.push("");

  lines.push(`## Vekevolum (tal på økter per kategori)`);
  lines.push(`veke | styrke | løping | sykkel | yoga/mob | kvile`);
  lines.push(`---|---|---|---|---|---`);
  for (const w of weeks) {
    lines.push(
      `${w.week} | ${w.styrke} | ${w.loping} | ${w.sykkel} | ${w.yoga_mob} | ${w.kvile}`
    );
  }
  lines.push("");

  if (settings.focusExercises.length) {
    lines.push(`## Fokusøvingar — trend`);
    for (const name of settings.focusExercises) {
      const series = focusSeries(sessions, range, name);
      if (!series.length) continue;
      lines.push(`### ${name}`);
      for (const p of series) {
        const bits: string[] = [p.date];
        if (p.heaviestKg != null) bits.push(`tyngste ${p.heaviestKg} kg`);
        if (p.totalKg != null) bits.push(`volum ${p.totalKg} kg`);
        if (p.bestTimeSec != null) bits.push(`tid ${fmtDuration(p.bestTimeSec)}`);
        lines.push(`- ${bits.join(", ")}`);
      }
      lines.push("");
    }
  }

  lines.push(`## Økter (utan GPS-spor)`);
  const inWindow = sessions
    .filter((s) => s.status === "completed" && inRange(s, range))
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const s of inWindow) {
    const bits: string[] = [`${s.date}`, categoryLabel(s.category), s.title];
    if (s.distanceM) bits.push(fmtDistance(s.distanceM));
    if (s.durationSec) bits.push(fmtDuration(s.durationSec));
    if (s.paceSecPerKm) bits.push(fmtPace(s.paceSecPerKm));
    if (s.avgHr) bits.push(`HR ${s.avgHr}`);
    const ex = (s.exercises || [])
      .map(
        (e) =>
          `${e.name} ${e.sets
            .map((x) => `${x.reps}${x.weightKg != null ? `×${x.weightKg}` : ""}`)
            .join("/")}`
      )
      .join("; ");
    if (ex) bits.push(ex);
    lines.push(`- ${bits.join(" · ")}`);
  }

  lines.push("");
  lines.push(
    `## Spørsmål til Claude`
  );
  lines.push(
    `Sjå på svakheiter i treningsprogrammet i perioden over og kom med konkrete forslag til forbetringar på innhald, struktur og kva øvingar eg bør prioritere meir.`
  );

  return lines.join("\n");
}

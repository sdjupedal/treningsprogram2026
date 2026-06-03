import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend as RLegend,
} from "recharts";
import type { Session, Settings } from "../types";
import {
  RANGE_LABELS, type RangeKey, rangeFromKey, summarize, weeklyVolume, focusSeries,
} from "../lib/stats";
import { fmtDuration } from "../lib/format";

export function StatsSection({
  sessions, settings, today,
}: { sessions: Session[]; settings: Settings; today: string }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("90d");
  const [custom, setCustom] = useState({ from: "", to: today });

  const range = useMemo(() => {
    if (rangeKey === "custom" && custom.from) return { from: custom.from, to: custom.to || today };
    return rangeFromKey(rangeKey, today);
  }, [rangeKey, custom, today]);

  const sum = useMemo(() => summarize(sessions, range), [sessions, range]);
  const weeks = useMemo(() => weeklyVolume(sessions, range), [sessions, range]);

  const cards = [
    { k: "Økter", v: String(sum.sessionCount) },
    { k: "Løp (km)", v: String(sum.runKm) },
    { k: "SkiErg/RowErg (m)", v: sum.ergMeters.toLocaleString("nn-NO") },
    { k: "Knebøy volum (kg)", v: sum.squatTotalKg.toLocaleString("nn-NO") },
    { k: "Knebøy tyngste (kg)", v: String(sum.squatHeaviestKg) },
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Statistikk</h2>
        <span className="spacer" />
        <div className="range-tabs">
          {RANGE_LABELS.map((r) => (
            <button key={r.key} className={`small${rangeKey === r.key ? " active" : ""}`} onClick={() => setRangeKey(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rangeKey === "custom" && (
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ width: 160 }}>
            <label>Frå</label>
            <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
          </div>
          <div style={{ width: 160 }}>
            <label>Til</label>
            <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
        </div>
      )}

      <div className="stat-cards">
        {cards.map((c) => (
          <div className="stat-card" key={c.k}>
            <div className="v">{c.v}</div>
            <div className="k">{c.k}</div>
          </div>
        ))}
      </div>

      <div className="chart-box">
        <h4>Vekevolum per kategori</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeks}>
            <CartesianGrid stroke="#222934" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "#69727e", fontSize: 11 }} />
            <YAxis tick={{ fill: "#69727e", fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <RLegend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="styrke" stackId="a" name="Styrke" fill="#f5b642" />
            <Bar dataKey="loping" stackId="a" name="Løping" fill="#ff7a5c" />
            <Bar dataKey="sykkel" stackId="a" name="Sykkel" fill="#2ec4b6" />
            <Bar dataKey="yoga_mob" stackId="a" name="Yoga/mob" fill="#93d8a0" />
            <Bar dataKey="kvile" stackId="a" name="Kvile" fill="#6b7480" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {settings.focusExercises.map((name) => (
        <FocusChart key={name} name={name} sessions={sessions} range={range} />
      ))}
    </section>
  );
}

function FocusChart({ name, sessions, range }: { name: string; sessions: Session[]; range: { from: string; to: string } }) {
  const series = useMemo(() => focusSeries(sessions, range, name), [sessions, range, name]);
  if (series.length === 0) return null;
  const hasWeight = series.some((p) => p.heaviestKg != null);
  const hasTime = series.some((p) => p.bestTimeSec != null);

  return (
    <div className="chart-box">
      <h4>Fokus: {name}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={series}>
          <CartesianGrid stroke="#222934" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#69727e", fontSize: 11 }} />
          <YAxis tick={{ fill: "#69727e", fontSize: 11 }}
            tickFormatter={(v) => (hasTime && !hasWeight ? fmtDuration(v) : String(v))} />
          <Tooltip contentStyle={tooltipStyle}
            formatter={(v: any) => (hasTime && !hasWeight ? fmtDuration(Number(v)) : v)} />
          {hasWeight && <Line type="monotone" dataKey="heaviestKg" name="Tyngste (kg)" stroke="#6ea8fe" strokeWidth={2} dot />}
          {hasTime && !hasWeight && <Line type="monotone" dataKey="bestTimeSec" name="Tid" stroke="#ff7a5c" strokeWidth={2} dot />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const tooltipStyle = {
  background: "#13171d",
  border: "1px solid #2a313c",
  borderRadius: 8,
  color: "#eef1f4",
  fontSize: 12,
} as const;

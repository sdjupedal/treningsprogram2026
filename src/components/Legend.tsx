import { CATEGORIES } from "../lib/categories";

export function Legend() {
  return (
    <div className="legend">
      {CATEGORIES.map((c) => (
        <span className="item" key={c.key} style={{ ["--cat" as any]: `var(${c.colorVar})` }}>
          <span className="swatch" />
          {c.emoji} {c.label}
        </span>
      ))}
    </div>
  );
}

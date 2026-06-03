import type { Category } from "../types";

export interface CategoryMeta {
  key: Category;
  label: string; // Nynorsk label
  emoji: string;
  colorVar: string; // CSS variable name
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "styrke", label: "Styrke", emoji: "💪🏼", colorVar: "--cat-styrke" },
  { key: "loping", label: "Løping", emoji: "🏃🏼‍♂️‍➡️", colorVar: "--cat-loping" },
  { key: "sykkel", label: "Sykkel", emoji: "🚴🏼", colorVar: "--cat-sykkel" },
  { key: "yoga_mob", label: "Yoga/mob", emoji: "🧘🏼", colorVar: "--cat-yoga" },
  { key: "kvile", label: "Kvile", emoji: "", colorVar: "--cat-kvile" },
];

const byKey: Record<Category, CategoryMeta> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<Category, CategoryMeta>
);

export function categoryMeta(c: Category): CategoryMeta {
  return byKey[c];
}

export function categoryColor(c: Category): string {
  return `var(${byKey[c].colorVar})`;
}

export function categoryLabel(c: Category): string {
  return byKey[c].label;
}

export function categoryEmoji(c: Category): string {
  return byKey[c].emoji;
}

export function legendLine(c: Category): string {
  const m = byKey[c];
  return m.emoji ? `${m.emoji} ${m.label}` : m.label;
}

import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

// date-fns ships Bokmål (nb); we use it for month/day names which are
// identical enough, then patch the few Nynorsk-specific forms.
const NN_MONTHS = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];
const NN_DAYS_SHORT = ["sø", "må", "ty", "on", "to", "fr", "la"];
const NN_DAYS_LONG = [
  "søndag", "måndag", "tysdag", "onsdag", "torsdag", "fredag", "laurdag",
];

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseDate(iso: string): Date {
  return parseISO(iso);
}

export function fmtDateLong(iso: string): string {
  const d = parseISO(iso);
  return `${NN_DAYS_LONG[d.getDay()]} ${d.getDate()}. ${NN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(iso: string): string {
  const d = parseISO(iso);
  return `${NN_DAYS_SHORT[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
}

export function fmtMonthYear(d: Date): string {
  return `${capitalize(NN_MONTHS[d.getMonth()])} ${d.getFullYear()}`;
}

export function dayName(d: Date): string {
  return NN_DAYS_LONG[d.getDay()];
}

export function dayNameShort(d: Date): string {
  return NN_DAYS_SHORT[d.getDay()];
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Duration: seconds -> "h:mm:ss" or "m:ss"
export function fmtDuration(sec?: number | null): string {
  if (sec == null || isNaN(sec)) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(ss)}`;
  return `${m}:${pad(ss)}`;
}

export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

// Pace: sec/km -> "m:ss/km"
export function fmtPace(secPerKm?: number | null): string {
  if (secPerKm == null || isNaN(secPerKm) || secPerKm <= 0) return "";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad(s)}/km`;
}

export function parsePace(text: string): number | null {
  const m = text.trim().match(/^(\d+):(\d{1,2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function fmtDistance(m?: number | null): string {
  if (m == null || isNaN(m)) return "";
  if (m >= 1000) return `${(m / 1000).toFixed(2).replace(/\.?0+$/, "")} km`;
  return `${Math.round(m)} m`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// re-export for callers that want the date-fns locale
export const nbLocale = nb;

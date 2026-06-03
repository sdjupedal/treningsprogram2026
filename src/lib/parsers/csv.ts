import type { Category } from "../../types";

// Minimal RFC4180-ish CSV parser that handles quoted fields and commas.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export function toRecords(text: string): Record<string, string>[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (r[i] ?? "").trim()));
    return rec;
  });
}

export function num(v: string | undefined): number | null {
  if (v == null) return null;
  const cleaned = v.replace(/[^0-9.,-]/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// "h:mm:ss" / "mm:ss" / "ss" -> seconds
export function timeToSec(v: string | undefined): number | null {
  if (!v) return null;
  const parts = v.trim().split(":").map((p) => parseFloat(p));
  if (parts.some((n) => isNaN(n))) {
    const n = num(v);
    return n;
  }
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

// Map a free-text activity type to one of our categories.
export function mapActivityCategory(raw: string): Category {
  const t = raw.toLowerCase();
  if (/run|løp|lop|treadmill|jogg/.test(t)) return "loping";
  if (/bike|cycl|ride|sykk|virtual ride|spinning/.test(t)) return "sykkel";
  if (/yoga|mobil|stretch|pilates/.test(t)) return "yoga_mob";
  if (/strength|styrke|weight|crossfit|wod|gym/.test(t)) return "styrke";
  return "styrke";
}

export function isoFromAny(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  // already yyyy-mm-dd...
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // dd.mm.yyyy or dd/mm/yyyy
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  // fallback: Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad(String(d.getMonth() + 1))}-${pad(String(d.getDate()))}`;
  }
  return null;
}

function pad(s: string): string {
  return s.length === 1 ? `0${s}` : s;
}

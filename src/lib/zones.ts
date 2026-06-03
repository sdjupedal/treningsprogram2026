import type { ZoneBounds } from "../types";

export interface ZoneInfo {
  zone: number; // 1-5
  label: string; // "Sone 3"
}

// Map a raw HR (bpm) into an Olympiatoppen zone using the configured bounds.
export function hrToZone(hr: number, z: ZoneBounds): number {
  if (hr < z.s1Max) return 1;
  if (hr <= z.s2Max) return 2;
  if (hr <= z.s3Max) return 3;
  if (hr <= z.s4Max) return 4;
  return 5;
}

export function zoneLabel(zone: number): string {
  return `Sone ${zone}`;
}

export function zoneInfoFromHr(hr: number, z: ZoneBounds): ZoneInfo {
  const zone = hrToZone(hr, z);
  return { zone, label: zoneLabel(zone) };
}

// Garmin uses a 5-zone model based on % of max HR (10% increments by default:
// 50-60-70-80-90-100). When an import carries Garmin zone labels they are NOT
// equivalent to Olympiatoppen zones, so we never store them. Instead we keep the
// raw HR and translate via hrToZone above. This helper exists only to make the
// boundary explicit and documented for any future Garmin-zone-aware import.
export function garminPctZoneBoundsBpm(hrMax: number): number[] {
  // returns bpm thresholds at 60/70/80/90% of HRmax
  return [0.6, 0.7, 0.8, 0.9].map((p) => Math.round(hrMax * p));
}

// Describe the configured Olympiatoppen zones as human-readable ranges.
export function describeZones(z: ZoneBounds): string[] {
  return [
    `Sone 1: < ${z.s1Max} bpm`,
    `Sone 2: ${z.s1Max}–${z.s2Max} bpm`,
    `Sone 3: ${z.s2Max + 1}–${z.s3Max} bpm`,
    `Sone 4: ${z.s3Max + 1}–${z.s4Max} bpm`,
    `Sone 5: > ${z.s4Max} bpm`,
  ];
}

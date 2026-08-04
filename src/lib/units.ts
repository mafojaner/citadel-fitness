import type { DistanceUnit, WeightUnit } from '../types/models';

const LB_PER_KG = 2.2046226218;
const MI_PER_KM = 0.62137119;

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;
  return from === 'km' ? value * MI_PER_KM : value / MI_PER_KM;
}

/** Rounds to 1 decimal place — enough precision for logged weights/distances without ugly long floats after a conversion. */
export function roundForDisplay(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Splits a total-seconds duration into the hours/minutes/seconds an entry form shows separately. */
export function secondsToParts(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { hours, minutes, seconds };
}

/** Inverse of secondsToParts — composes hours/minutes/seconds entry fields back into total seconds. */
export function partsToSeconds(hours: number, minutes: number, seconds: number): number {
  return Math.max(0, hours) * 3600 + Math.max(0, minutes) * 60 + Math.max(0, seconds);
}

/** Formats a total-seconds duration for display, e.g. 5025 -> "1h 23m", 45 -> "45s", 330 -> "5m 30s". */
export function formatDuration(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToParts(totalSeconds);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
  return parts.length > 0 ? parts.join(' ') : '0s';
}

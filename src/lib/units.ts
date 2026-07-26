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

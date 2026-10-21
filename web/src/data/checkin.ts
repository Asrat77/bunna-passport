import { distanceMeters, type Coordinate } from "@/lib/distance";
import type { Shop } from "@/api/types";

/** Mirrors CheckIn::DISTANCE_LIMIT_METERS and ACCURACY_LIMIT_METERS. */
export const CHECK_IN_RANGE_METERS = 250;
export const ACCURACY_LIMIT_METERS = 100;

export type Candidate = { shop: Shop; distance: number; inRange: boolean };

/**
 * Shops close enough to show on the radar: everything in range, plus the
 * nearest couple outside it greyed out, so someone just short of a café can
 * see why it isn't offered.
 */
export function candidatesAround(shops: Shop[], at: Coordinate, outside = 2): Candidate[] {
  const all = shops
    .map((shop) => ({ shop, distance: distanceMeters(at, shop) }))
    .sort((a, b) => a.distance - b.distance);
  const inRange = all.filter((c) => c.distance <= CHECK_IN_RANGE_METERS).map((c) => ({ ...c, inRange: true }));
  const beyond = all
    .filter((c) => c.distance > CHECK_IN_RANGE_METERS)
    .slice(0, outside)
    .map((c) => ({ ...c, inRange: false }));
  return [...inRange, ...beyond];
}

/** Compass bearing in radians from `from` to `to`, 0 = north. */
export function bearing(from: Coordinate, to: Coordinate): number {
  const rad = Math.PI / 180;
  const y = Math.sin((to.longitude - from.longitude) * rad) * Math.cos(to.latitude * rad);
  const x =
    Math.cos(from.latitude * rad) * Math.sin(to.latitude * rad) -
    Math.sin(from.latitude * rad) * Math.cos(to.latitude * rad) * Math.cos((to.longitude - from.longitude) * rad);
  return Math.atan2(y, x);
}

export function newIdempotencyKey(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

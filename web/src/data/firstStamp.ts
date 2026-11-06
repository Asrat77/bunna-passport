import type { Shop } from "@/api/types";
import { distanceMeters, type Coordinate } from "@/lib/distance";
import { CHECK_IN_RANGE_METERS } from "./checkin";
import { openStatus } from "@/lib/hours";

/** Where someone is on the way to their first stamp. */
export type FirstStampStep = "location" | "walk" | "checkIn";

export type FirstStampPlan = {
  step: FirstStampStep;
  /** The café to aim for, once we know where they are. */
  target: { shop: Shop; distance: number; closed: boolean } | null;
};

/** How much nearer a closed café must be before it beats one that may be open. */
const CLOSED_PENALTY_METERS = 1500;

/**
 * The first-stamp guide's next step. Without a position the step is sharing
 * it; with one, the café to walk to is the nearest, passing over one that's
 * closed right now unless it's much closer. Unknown hours count as open:
 * most cafés' hours aren't mapped yet. Anything already in check-in range
 * wins outright, since the stamp is one tap away.
 */
export function firstStampPlan(shops: Shop[], at: Coordinate | null, now = new Date()): FirstStampPlan {
  if (!at) return { step: "location", target: null };

  const scored = shops
    .filter((shop) => shop.status === "live")
    .map((shop) => ({ shop, distance: distanceMeters(at, shop), closed: openStatus(shop.hours?.schedule, now) === "closed" }));
  if (scored.length === 0) return { step: "walk", target: null };

  const inRange = scored.filter((c) => c.distance <= CHECK_IN_RANGE_METERS).sort((a, b) => a.distance - b.distance);
  if (inRange.length > 0) return { step: "checkIn", target: inRange[0] };

  const cost = (c: (typeof scored)[number]) => c.distance + (c.closed ? CLOSED_PENALTY_METERS : 0);
  const target = scored.reduce((best, c) => (cost(c) < cost(best) ? c : best));
  return { step: "walk", target };
}

import { describe, expect, it } from "vitest";
import type { Shop } from "@/api/types";
import { firstStampPlan } from "./firstStamp";

const shop = (id: number, latitude: number, extra: Partial<Shop> = {}): Shop => ({
  id,
  name: `Café ${id}`,
  name_am: `ካፌ ${id}`,
  slug: `cafe-${id}`,
  neighborhood: { id: 1, name: "Piassa", name_am: "ፒያሳ" },
  landmark: "by the roundabout",
  latitude,
  longitude: 38.75,
  status: "live",
  price_band: null,
  attributes: {},
  updated_at: "2026-10-01T00:00:00Z",
  ...extra,
});

const here = { latitude: 9.03, longitude: 38.75 };
// 10:00 in Addis on a Friday.
const now = new Date("2026-11-06T07:00:00Z");
const closedAllDay: Shop["hours"] = { schedule: { friday: [{ opens: "20:00", closes: "22:00" }] }, freshness: "fresh", confirmed_at: null };

describe("firstStampPlan", () => {
  it("asks for a position first", () => {
    expect(firstStampPlan([shop(1, 9.031)], null, now)).toEqual({ step: "location", target: null });
  });

  it("offers the check-in when a café is in range", () => {
    const plan = firstStampPlan([shop(1, 9.05), shop(2, 9.0315)], here, now);
    expect(plan.step).toBe("checkIn");
    expect(plan.target?.shop.id).toBe(2);
  });

  it("walks to the nearest café otherwise", () => {
    const plan = firstStampPlan([shop(1, 9.05), shop(2, 9.04)], here, now);
    expect(plan.step).toBe("walk");
    expect(plan.target?.shop.id).toBe(2);
    expect(plan.target?.distance).toBeGreaterThan(1000);
  });

  it("passes over a closed café unless it is much nearer", () => {
    const plan = firstStampPlan([shop(1, 9.04, { hours: closedAllDay }), shop(2, 9.045)], here, now);
    expect(plan.target?.shop.id).toBe(2);
    const farOpen = firstStampPlan([shop(1, 9.04, { hours: closedAllDay }), shop(2, 9.08)], here, now);
    expect(farOpen.target?.shop.id).toBe(1);
    expect(farOpen.target?.closed).toBe(true);
  });

  it("ignores cafés that are gone", () => {
    const plan = firstStampPlan([shop(1, 9.0305, { status: "closed" }), shop(2, 9.04)], here, now);
    expect(plan).toMatchObject({ step: "walk", target: { shop: { id: 2 } } });
  });
});

import { describe, expect, it } from "vitest";
import type { Shop } from "@/api/types";
import { rankShops } from "./nearby";

const shop = (id: number, name: string, name_am: string, latitude: number, extra: Partial<Shop> = {}): Shop => ({
  id,
  name,
  name_am,
  slug: name.toLowerCase(),
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

const shops = [
  shop(1, "Tomoca", "ቶሞካ", 9.035),
  shop(2, "Alem Bunna", "ዓለም ቡና", 9.031, { attributes: { jebena_service: true } }),
  shop(3, "Kaldi's Coffee", "ካልዲስ", 9.02),
];
const base = { origin: null, query: "", filter: "all" as const, stamped: new Set<number>() };

describe("rankShops", () => {
  it("sorts by distance once there is a fix", () => {
    const ranked = rankShops(shops, { ...base, origin: { latitude: 9.03, longitude: 38.75 } });
    expect(ranked.map((r) => r.shop.id)).toEqual([2, 1, 3]);
    expect(ranked[0].distance).toBeGreaterThan(0);
  });

  it("finds a shop by either script and by spelling variants", () => {
    expect(rankShops(shops, { ...base, query: "To.Mo.Ca" }).map((r) => r.shop.id)).toEqual([1]);
    expect(rankShops(shops, { ...base, query: "ቶሞካ" }).map((r) => r.shop.id)).toEqual([1]);
  });

  it("filters to jebena and to shops not yet stamped", () => {
    expect(rankShops(shops, { ...base, filter: "jebena" }).map((r) => r.shop.id)).toEqual([2]);
    expect(rankShops(shops, { ...base, filter: "notYet", stamped: new Set([1, 2]) }).map((r) => r.shop.id)).toEqual([3]);
  });
});

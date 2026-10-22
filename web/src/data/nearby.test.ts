import { describe, expect, it } from "vitest";
import type { Shop } from "@/api/types";
import { catalogStats, findShops, rankShops } from "./nearby";

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

describe("findShops", () => {
  const sunday = { sunday: [{ opens: "06:00", closes: "22:00" }] };
  // 10:00 on a Sunday in Addis.
  const now = new Date("2026-10-18T07:00:00Z");
  const bole = { id: 2, name: "Bole", name_am: "ቦሌ" };
  const catalog = [
    shop(1, "Tomoca", "ቶሞካ", 9.035, { hours: { schedule: sunday, freshness: "fresh", confirmed_at: null } }),
    shop(2, "Alem Bunna", "ዓለም ቡና", 9.031, { neighborhood: bole }),
    shop(3, "Kaldi's Coffee", "ካልዲስ", 9.02, { neighborhood: bole }),
  ];
  const query = { origin: null, query: "", stamped: new Set([2]), now };

  it("filters by neighbourhood, open now and whether it's in the passport", () => {
    expect(findShops(catalog, { ...query, neighborhoodId: 2 }).map((r) => r.shop.id)).toEqual([2, 3]);
    expect(findShops(catalog, { ...query, openNow: true }).map((r) => r.shop.id)).toEqual([1]);
    expect(findShops(catalog, { ...query, visited: true }).map((r) => r.shop.id)).toEqual([2]);
    expect(findShops(catalog, { ...query, visited: false }).map((r) => r.shop.id)).toEqual([3, 1]);
  });

  it("sorts by neighbourhood, then name", () => {
    expect(findShops(catalog, { ...query, sort: "neighborhood" }).map((r) => r.shop.id)).toEqual([2, 3, 1]);
  });

  it("counts the catalog for the stats strip", () => {
    const stats = catalogStats(catalog, new Set([2]), now);
    expect(stats).toMatchObject({ total: 3, openNow: 1, visited: 1 });
    expect(stats.neighborhoods.map((n) => [n.name, n.count])).toEqual([["Bole", 2], ["Piassa", 1]]);
  });
});

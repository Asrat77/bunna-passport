import { describe, expect, it } from "vitest";
import type { Shop } from "@/api/types";
import { activeFilterCount, NO_FILTERS, toggleIn } from "./cafeFilters";
import { findShops, rankShops } from "./nearby";

const shop = (id: number, extra: Partial<Shop> = {}): Shop => ({
  id,
  name: `Café ${id}`,
  name_am: `ካፌ ${id}`,
  slug: `cafe-${id}`,
  neighborhood: { id: 1, name: "Piassa", name_am: "ፒያሳ" },
  landmark: "by the roundabout",
  latitude: 9.03,
  longitude: 38.75,
  status: "live",
  price_band: null,
  attributes: {},
  updated_at: "2026-10-01T00:00:00Z",
  ...extra,
});

const shops = [
  shop(1, { price_band: "budget", review_tags: { quiet: 2, cozy: 1 } }),
  shop(2, { price_band: "premium", attributes: { wifi: true }, review_tags: { good_for_work: 1, quiet: 1 } }),
  shop(3, { attributes: { wifi: true } }),
  // An older cached catalog, from before review tags were sent.
  shop(4, { price_band: "budget" }),
];
const base = { origin: null, query: "", stamped: new Set<number>() };
const ids = (results: { shop: Shop }[]) => results.map((r) => r.shop.id);

describe("café filters", () => {
  it("keeps any of the picked price levels and drops cafés with no price yet", () => {
    expect(ids(findShops(shops, { ...base, prices: ["budget"] }))).toEqual([1, 4]);
    expect(ids(findShops(shops, { ...base, prices: ["budget", "premium"] }))).toEqual([1, 2, 4]);
    expect(ids(findShops(shops, { ...base, prices: [] }))).toEqual([1, 2, 3, 4]);
  });

  it("needs every picked tag, with Wi-Fi from the map and the rest from reviews", () => {
    expect(ids(findShops(shops, { ...base, tags: ["quiet"] }))).toEqual([1, 2]);
    expect(ids(findShops(shops, { ...base, tags: ["wifi"] }))).toEqual([2, 3]);
    expect(ids(findShops(shops, { ...base, tags: ["wifi", "quiet"] }))).toEqual([2]);
    expect(ids(findShops(shops, { ...base, tags: ["lively"] }))).toEqual([]);
  });

  it("applies the shared filters on Explore alongside its quick filter", () => {
    const filters = { ...NO_FILTERS, tags: ["quiet" as const], prices: ["premium" as const] };
    expect(ids(rankShops(shops, { ...base, filter: "all", filters }))).toEqual([2]);
    expect(ids(rankShops(shops, { ...base, filter: "notYet", stamped: new Set([2]), filters }))).toEqual([]);
  });

  it("counts what's switched on and toggles list items", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ openNow: true, prices: ["budget"], tags: ["wifi", "quiet"] })).toBe(4);
    expect(toggleIn(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleIn(["a"], "b")).toEqual(["a", "b"]);
  });
});

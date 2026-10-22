import type { OpaqueId, Shop } from "@/api/types";
import { distanceMeters, type Coordinate } from "@/lib/distance";
import { openStatus } from "@/lib/hours";
import { normalizeName } from "@/lib/searchKey";

export type ShopWithDistance = { shop: Shop; distance: number | null };

export type ShopFilter = "all" | "jebena" | "notYet";

export type ShopSort = "nearest" | "name" | "neighborhood";

export type ShopQuery = {
  origin: Coordinate | null;
  query: string;
  stamped: Set<OpaqueId>;
  jebena?: boolean;
  openNow?: boolean;
  /** Only shops in the passport (true), only shops not in it (false), or both. */
  visited?: boolean | null;
  neighborhoodId?: OpaqueId | null;
  sort?: ShopSort;
  now?: Date;
};

/**
 * Search, filter and sort the catalog. Search runs through the ported
 * searchKey, so "Tomoca", "To.Mo.Ca" and "ቶሞካ" all find the same shop, and
 * also matches the neighbourhood so "Bole" lists Bole's cafés. Nearest falls
 * back to A–Z until there is a fix.
 */
export function findShops(shops: Shop[], options: ShopQuery): ShopWithDistance[] {
  const needle = normalizeName(options.query.trim());
  const now = options.now ?? new Date();
  const sort = options.sort ?? "nearest";
  const byName = (a: ShopWithDistance, b: ShopWithDistance) => a.shop.name.localeCompare(b.shop.name);

  return shops
    .filter((shop) => {
      if (options.jebena && !shop.attributes.jebena_service) return false;
      if (options.visited === true && !options.stamped.has(shop.id)) return false;
      if (options.visited === false && options.stamped.has(shop.id)) return false;
      if (options.neighborhoodId != null && shop.neighborhood.id !== options.neighborhoodId) return false;
      if (options.openNow && !isOpen(shop, now)) return false;
      if (!needle) return true;
      return [shop.name, shop.name_am, shop.neighborhood.name, shop.neighborhood.name_am].some((text) =>
        normalizeName(text).includes(needle),
      );
    })
    .map((shop) => ({ shop, distance: options.origin ? distanceMeters(options.origin, shop) : null }))
    .sort((a, b) => {
      if (sort === "neighborhood") {
        return a.shop.neighborhood.name.localeCompare(b.shop.neighborhood.name) || byName(a, b);
      }
      if (sort === "nearest" && a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return byName(a, b);
    });
}

/** The Explore tab's view: one quick filter at a time, nearest first. */
export function rankShops(
  shops: Shop[],
  options: { origin: Coordinate | null; query: string; filter: ShopFilter; stamped: Set<OpaqueId> },
): ShopWithDistance[] {
  return findShops(shops, {
    origin: options.origin,
    query: options.query,
    stamped: options.stamped,
    jebena: options.filter === "jebena",
    visited: options.filter === "notYet" ? false : null,
  });
}

/** Closing soon still counts: you can get a cup in. */
export function isOpen(shop: Shop, now = new Date()): boolean {
  const status = openStatus(shop.hours?.schedule, now);
  return status === "open" || status === "closingSoon";
}

export type CatalogStats = {
  total: number;
  openNow: number;
  visited: number;
  neighborhoods: { id: OpaqueId; name: string; name_am: string; count: number }[];
};

/** Counts for the All cafés page; neighbourhoods busiest first. */
export function catalogStats(shops: Shop[], stamped: Set<OpaqueId>, now = new Date()): CatalogStats {
  const areas = new Map<OpaqueId, CatalogStats["neighborhoods"][number]>();
  let openNow = 0;
  let visited = 0;
  for (const shop of shops) {
    if (isOpen(shop, now)) openNow += 1;
    if (stamped.has(shop.id)) visited += 1;
    const area = areas.get(shop.neighborhood.id) ?? { ...shop.neighborhood, count: 0 };
    area.count += 1;
    areas.set(area.id, area);
  }
  const neighborhoods = [...areas.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total: shops.length, openNow, visited, neighborhoods };
}

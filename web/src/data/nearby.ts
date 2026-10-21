import type { OpaqueId, Shop } from "@/api/types";
import { distanceMeters, type Coordinate } from "@/lib/distance";
import { normalizeName } from "@/lib/searchKey";

export type ShopWithDistance = { shop: Shop; distance: number | null };

export type ShopFilter = "all" | "jebena" | "notYet";

/**
 * Search, filter and sort the catalog. Search runs through the ported
 * searchKey, so "Tomoca", "To.Mo.Ca" and "ቶሞካ" all find the same shop, and
 * also matches the neighbourhood so "Bole" lists Bole's cafés.
 */
export function rankShops(
  shops: Shop[],
  options: { origin: Coordinate | null; query: string; filter: ShopFilter; stamped: Set<OpaqueId> },
): ShopWithDistance[] {
  const needle = normalizeName(options.query.trim());
  return shops
    .filter((shop) => {
      if (options.filter === "jebena" && !shop.attributes.jebena_service) return false;
      if (options.filter === "notYet" && options.stamped.has(shop.id)) return false;
      if (!needle) return true;
      return [shop.name, shop.name_am, shop.neighborhood.name, shop.neighborhood.name_am].some((text) =>
        normalizeName(text).includes(needle),
      );
    })
    .map((shop) => ({ shop, distance: options.origin ? distanceMeters(options.origin, shop) : null }))
    .sort((a, b) =>
      a.distance !== null && b.distance !== null ? a.distance - b.distance : a.shop.name.localeCompare(b.shop.name),
    );
}

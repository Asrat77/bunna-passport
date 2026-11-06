import { useSyncExternalStore } from "react";
import type { PriceBand, ReviewTag, Shop } from "@/api/types";
import { REVIEW_TAGS } from "./reviews";

/** Wi-Fi is a mapped amenity; the rest are what reviewers say a café is like. */
export type FeatureTag = "wifi" | ReviewTag;

export const FEATURE_TAGS: readonly FeatureTag[] = ["wifi", ...REVIEW_TAGS];

/** The few that get a chip of their own; the sheet has all of them. */
export const QUICK_TAGS: readonly FeatureTag[] = ["quiet", "wifi", "good_for_work"];

export const PRICE_BANDS: readonly PriceBand[] = ["budget", "standard", "premium", "splurge"];

export type CafeFilters = {
  openNow: boolean;
  /** Any of these price levels; none picked means any price. */
  prices: PriceBand[];
  /** All of these; none picked means anything. */
  tags: FeatureTag[];
};

export const NO_FILTERS: CafeFilters = { openNow: false, prices: [], tags: [] };

export function activeFilterCount(filters: CafeFilters): number {
  return (filters.openNow ? 1 : 0) + filters.prices.length + filters.tags.length;
}

/**
 * Whether a café has this: Wi-Fi when it's mapped, a review tag when at least
 * one public review picked it.
 */
export function hasFeature(shop: Shop, tag: FeatureTag): boolean {
  if (tag === "wifi") return shop.attributes.wifi === true;
  return (shop.review_tags?.[tag] ?? 0) > 0;
}

/** A café with no price level yet drops out once you pick one. */
export function matchesPrice(shop: Shop, prices: readonly PriceBand[]): boolean {
  return prices.length === 0 || (shop.price_band !== null && prices.includes(shop.price_band));
}

// One set of filters for Explore, All cafés and the map, so picking "Quiet"
// on Explore still holds when you open the map or see them all. It lasts for
// the session, like the search box.
let current: CafeFilters = NO_FILTERS;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCafeFilters(next: CafeFilters | ((filters: CafeFilters) => CafeFilters)) {
  current = typeof next === "function" ? next(current) : next;
  for (const listener of listeners) listener();
}

export function toggleIn<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export function useCafeFilters(): CafeFilters {
  return useSyncExternalStore(subscribe, () => current);
}

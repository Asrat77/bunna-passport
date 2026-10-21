import { fnv1a } from "@/design/hash";

export const PAGE_WIDTH = 358;
export const PAGE_HEIGHT = 318;
export const SLOTS_PER_PAGE = 5;

/**
 * The five places a page can press a stamp, drawn from the canvas's Piassa
 * page: big ones up top, smaller ones lower down, overlapping a little the
 * way a real passport fills up.
 */
const SLOTS = [
  { x: 10, y: 34, size: 142 },
  { x: 196, y: 26, size: 128 },
  { x: 136, y: 156, size: 118 },
  { x: 22, y: 184, size: 112 },
  { x: 250, y: 178, size: 108 },
] as const;

export const UNSTAMPED_SIZE = 92;

export type Placement = { x: number; y: number; size: number; rotation: number };

/**
 * Where a stamp sits on its page. The slot comes from its position on the
 * page; the small nudge and the tilt come from a hash of the shop id, so the
 * same page looks the same on every visit.
 */
export function placeOnPage(index: number, shopId: number): Placement {
  const slot = SLOTS[index % SLOTS_PER_PAGE];
  const h = fnv1a(`page:${shopId}`);
  const nudge = (bits: number) => ((bits % 13) - 6);
  return {
    x: slot.x + nudge(h),
    y: slot.y + nudge(h >>> 8),
    size: slot.size,
    rotation: ((h >>> 16) % 25) - 12,
  };
}

/** Splits a list into passport pages of five. */
export function paginate<T>(items: T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += SLOTS_PER_PAGE) pages.push(items.slice(i, i + SLOTS_PER_PAGE));
  return pages.length ? pages : [[]];
}

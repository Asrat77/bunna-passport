import type { MiniappKey } from "@/i18n/miniapp";

/**
 * The app tour's stops, in order. Each one points at an element on Explore
 * marked with data-tour="<id>". A stop whose element isn't on screen (the
 * first-stamp card once you have a stamp, say) is left out.
 */
export type TourStepId = "picture" | "search" | "map" | "checkIn" | "passport" | "stats" | "firstStamp";

export type TourStep = { id: TourStepId; title: MiniappKey; body: MiniappKey };

export const TOUR_STEPS: TourStep[] = [
  { id: "picture", title: "tour.picture.title", body: "tour.picture.body" },
  { id: "search", title: "tour.search.title", body: "tour.search.body" },
  { id: "map", title: "tour.map.title", body: "tour.map.body" },
  { id: "checkIn", title: "tour.checkIn.title", body: "tour.checkIn.body" },
  { id: "passport", title: "tour.passport.title", body: "tour.passport.body" },
  { id: "stats", title: "tour.stats.title", body: "tour.stats.body" },
  // Last, so the tour hands a new person straight to the first-stamp guide.
  { id: "firstStamp", title: "tour.firstStamp.title", body: "tour.firstStamp.body" },
];

/** The stops that have something to point at right now. */
export function availableSteps(present: (id: TourStepId) => boolean): TourStep[] {
  return TOUR_STEPS.filter((step) => present(step.id));
}

export type Rect = { top: number; left: number; width: number; height: number };

/** Space between the highlighted element and the ring around it. */
export const SPOTLIGHT_PAD = 6;
const GAP = 12;
const EDGE = 12;

/**
 * Where the explanation card goes: under the highlight when the highlight sits
 * in the top half of the screen, over it otherwise, so it never covers what
 * it's talking about. Returned as a distance from the top or the bottom of
 * the viewport, clamped to stay on screen. When a tall highlight (the
 * first-stamp card) leaves no room on its side, the card goes to whichever
 * edge has more space and overlaps the highlight rather than leaving the screen.
 */
export function placeCard(
  target: Rect,
  viewportHeight: number,
  cardHeight: number,
): { top: number } | { bottom: number } {
  const below = target.top + target.height + SPOTLIGHT_PAD + GAP;
  const above = viewportHeight - target.top + SPOTLIGHT_PAD + GAP;
  const fitsBelow = below + cardHeight <= viewportHeight - EDGE;
  const fitsAbove = above + cardHeight <= viewportHeight - EDGE;
  const center = target.top + target.height / 2;
  const preferBelow = center < viewportHeight / 2;

  if (preferBelow ? fitsBelow : !fitsAbove && fitsBelow) return { top: Math.max(EDGE, below) };
  if (fitsAbove) return { bottom: Math.max(EDGE, above) };
  // Neither side fits: pin to the edge farther from the highlight's middle.
  return preferBelow ? { bottom: EDGE } : { top: EDGE };
}

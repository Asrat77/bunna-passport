/** Mirrors Stamp::LEVELS on the server. */
export type StampLevel = "bronze" | "silver" | "gold" | "diamond";

/**
 * Counted visits each level asks for, mirrored from app/models/stamp.rb via
 * mobile/src/design/components/Seal.tsx. The server owns the level a stamp
 * actually holds; this copy only lets the UI say how far the next one is.
 */
export const LEVEL_THRESHOLDS: [StampLevel, number][] = [
  ["bronze", 1],
  ["silver", 5],
  ["gold", 15],
  ["diamond", 30],
];

/** Visits still owed before the next level, or null at the top. */
export function visitsToNextLevel(visits: number): number | null {
  const next = LEVEL_THRESHOLDS.find(([, required]) => visits < required);
  return next ? next[1] - visits : null;
}

/** The level a visit count would reach next, or null at the top. */
export function nextLevel(visits: number): StampLevel | null {
  return LEVEL_THRESHOLDS.find(([, required]) => visits < required)?.[0] ?? null;
}

/**
 * Metals read as metals in either theme, so these are fixed rather than
 * themed. Each paper is dark enough to carry the light ink printed on it.
 */
export const LEVEL_PAINT: Record<StampLevel, { paper: string; ink: string }> = {
  bronze: { paper: "#8C5A2B", ink: "#FDF1E4" },
  silver: { paper: "#71757A", ink: "#FFFFFF" },
  gold: { paper: "#A8811A", ink: "#FFF8DC" },
  diamond: { paper: "#2A6F7F", ink: "#E6FAFF" },
};

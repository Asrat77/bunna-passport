/**
 * Counted visits each level asks for, mirrored from app/models/stamp.rb via
 * mobile/src/design/components/Seal.tsx. The server owns the level a stamp
 * actually holds; this copy only lets the UI say how far the next one is.
 */
export const LEVEL_THRESHOLDS = [
    ["bronze", 1],
    ["silver", 5],
    ["gold", 15],
    ["diamond", 30],
];
/** Visits still owed before the next level, or null at the top. */
export function visitsToNextLevel(visits) {
    const next = LEVEL_THRESHOLDS.find(([, required]) => visits < required);
    return next ? next[1] - visits : null;
}
/** The level a visit count would reach next, or null at the top. */
export function nextLevel(visits) {
    return LEVEL_THRESHOLDS.find(([, required]) => visits < required)?.[0] ?? null;
}
export const LEVEL_METAL = {
    bronze: { light: "#E7B07C", face: "#B4723D", dark: "#6E3F1C", deep: "#47260F" },
    silver: { light: "#FBFCFD", face: "#C4CAD1", dark: "#858E98", deep: "#454C55" },
    gold: { light: "#FCEAA6", face: "#DDAE3E", dark: "#9A7414", deep: "#5C4306" },
    diamond: { light: "#DDF8FB", face: "#6FC5D2", dark: "#2A7E8E", deep: "#11434F" },
};
/** Pips under the bean, one per level reached, so tiers differ beyond colour. */
export const LEVEL_PIPS = { bronze: 1, silver: 2, gold: 3, diamond: 4 };

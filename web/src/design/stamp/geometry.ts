/**
 * The hero ink stamp's geometry (handoff, InkStamp), copied from the canvas's
 * InkStamp.dc.html. Kept apart from the React component so the server-rendered
 * share card can draw from the same numbers.
 *
 * Everything is in a 232 × 232 viewBox.
 */
import { fnv1a } from "../hash";

export type InkLevel = "clay" | "bronze" | "silver" | "gold" | "diamond" | "none";

export const VIEWBOX = 232;
export const CENTER = 116;

export const RINGS = [
  { r: 110, width: 4, dash: "9 7" },
  { r: 104, width: 1.2, dash: "4 5" },
  { r: 72, width: 2, dash: "4 5" },
] as const;

/** The circle of r86 that the ring text runs along. */
export const TEXT_ARC = "M30 116a86 86 0 1 1 172 0a86 86 0 1 1 -172 0";
export const RING_TEXT = "BUNNA PASSPORT · ቡና ፓስፖርት · ADDIS ABABA · ";

export const LAYOUT = {
  ringText: { size: 12.5, letterSpacing: 2.6 },
  name: { y: 102, letterSpacing: 1 },
  amharic: { y: 125, size: 16 },
  rule: { x1: 80, x2: 152, y: 137, width: 1.2 },
  date: { y: 156, size: 12, letterSpacing: 2 },
} as const;

/** Clay follows the theme's primary ink; metals mirror LEVEL_PAINT in Seal. */
export const INK: Record<InkLevel, string> = {
  clay: "var(--primary)",
  bronze: "#8C5A2B",
  silver: "#71757A",
  gold: "#A8811A",
  diamond: "#2A6F7F",
  none: "var(--border-strong)",
};

/** Long names shrink so they stay inside the inner ring. */
export function nameFontSize(name: string): number {
  return Math.min(25, 138 / (name.length * 0.7 + 0.2));
}

/** Turbulence seed for the speckle and wobble, stable per shop name. */
export function inkNoiseSeed(name: string): number {
  return (fnv1a(name) % 89) + 2;
}

/** A deterministic tilt within about ±12°, so a stamp never re-rotates. */
export function stampRotation(key: string): number {
  const h = fnv1a(`rot:${key}`);
  return Math.round(((h % 2401) / 100 - 12) * 10) / 10;
}

/** "21 OCT 2026", the way a rubber date stamp prints it. */
export function stampDate(iso: string): string {
  const date = new Date(iso);
  const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][
    date.getMonth()
  ];
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

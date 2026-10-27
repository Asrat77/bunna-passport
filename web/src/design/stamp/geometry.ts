/**
 * The hero ink stamp's geometry (handoff, InkStamp), copied from the canvas's
 * InkStamp.dc.html. Kept apart from the React component so the server-rendered
 * share card can draw from the same numbers.
 *
 * Everything is in a 232 × 232 viewBox.
 */
import { phCoffeeBeanFill } from "@/ui/icons";
import { fnv1a } from "../hash";

export type InkLevel = "clay" | "bronze" | "silver" | "gold" | "diamond" | "none";

export const VIEWBOX = 232;
export const CENTER = 116;

export const RINGS = [
  { r: 110, width: 4, dash: "9 7", dotted: false },
  { r: 104, width: 1.2, dash: "4 5", dotted: false },
  { r: 77, width: 0.8, dash: "2 4", dotted: true },
  { r: 72, width: 2, dash: "4 5", dotted: false },
] as const;

/** Unearned stamps keep only the outer and inner rings, dashed. */
export const EMPTY_RINGS = [RINGS[0], RINGS[3]] as const;

/**
 * The ring band carries two arcs: Latin over the top, Amharic under the
 * bottom (read upright), each centred, with a dot at three and nine o'clock.
 * Top glyphs sit on r86; bottom glyphs hang from r95 so their caps meet r86.
 */
export const RING_ARCS = [
  { text: "BUNNA PASSPORT", size: 12.5, letterSpacing: 4, radius: 86, centre: -90, direction: 1 },
  { text: "ቡና ፓስፖርት", size: 15.5, letterSpacing: 4, radius: 95, centre: 90, direction: -1 },
] as const;
export const RING_DOTS = [
  { x: CENTER - 90, y: CENTER, r: 2.6 },
  { x: CENTER + 90, y: CENTER, r: 2.6 },
] as const;

/**
 * Advance widths in ems: Geist Mono is 0.6 for every glyph; the Ethiopic
 * letters fall back to Noto Sans Ethiopic, read from its hmtx table.
 */
const MONO_ADVANCE = 0.6;
const ETHIOPIC_ADVANCE: Record<string, number> = {
  ቡ: 0.74, ና: 0.511, ፓ: 0.611, ስ: 0.618, ፖ: 0.671, ር: 0.51, ት: 0.601,
};

export type RingGlyph = { char: string; x: number; y: number; rotate: number; size: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Each ring glyph centred on its spot of the arc and turned to the tangent.
 * Placed one by one (rather than with textPath) because the share card's
 * librsvg can't lay text along a path, and both must print the same stamp.
 */
export function ringGlyphs(): RingGlyph[] {
  return RING_ARCS.flatMap((arc) => {
    const chars = [...arc.text];
    const advances = chars.map((c) => (ETHIOPIC_ADVANCE[c] ?? MONO_ADVANCE) * arc.size);
    const total = advances.reduce((a, b) => a + b, 0) + arc.letterSpacing * (chars.length - 1);
    let offset = -total / 2;
    return chars.flatMap((char, i) => {
      const middle = offset + advances[i] / 2;
      offset += advances[i] + arc.letterSpacing;
      if (char === " ") return [];
      const angle = (arc.centre * Math.PI) / 180 + (arc.direction * middle) / arc.radius;
      return [
        {
          char,
          x: round2(CENTER + Math.cos(angle) * arc.radius),
          y: round2(CENTER + Math.sin(angle) * arc.radius),
          rotate: round2((angle * 180) / Math.PI + 90 * arc.direction),
          size: arc.size,
        },
      ];
    });
  });
}

/** Phosphor's coffee-bean-fill on its 256 grid, set small above the name. */
export const BEAN = {
  path: phCoffeeBeanFill,
  transform: `translate(${CENTER - 8} 54) scale(0.0625)`,
};

/** Where the centre lines sit for a one- or two-line name. */
export const LAYOUT = {
  one: { name: [102], amharic: 125, rule: 137, date: 156 },
  /** The second name line sits on 114; the first rises with the size. */
  two: { name: [114], amharic: 134, rule: 143, date: 160 },
  name: { letterSpacing: 1 },
  rule: { x1: 80, x2: 152, width: 1.2 },
  date: { size: 12, letterSpacing: 2 },
} as const;

export type NameLayout = { lines: string[]; size: number };

/** Baselines for the name lines, from the layout and the size. */
export function nameBaselines(layout: NameLayout): number[] {
  if (layout.lines.length === 1) return [LAYOUT.one.name[0]];
  const last = LAYOUT.two.name[0];
  return [Math.round((last - layout.size * 1.15) * 100) / 100, last];
}

const fit = (width: number, length: number) => width / (length * 0.7 + 0.2);
const ONE_LINE_MIN = 17;
const TWO_LINE_MAX = 20;
const TWO_LINE_MIN = 10;

/**
 * Short names print large on one line. Longer ones break at the space that
 * best balances two lines, so they stay readable instead of shrinking to a
 * whisper; anything still too long is cut with an ellipsis.
 */
export function nameLayout(name: string): NameLayout {
  const single = Math.min(25, fit(128, name.length));
  const words = name.split(" ").filter(Boolean);
  if (single >= ONE_LINE_MIN || words.length < 2) {
    return single >= TWO_LINE_MIN ? { lines: [name], size: single } : { lines: [cut(name, 128)], size: TWO_LINE_MIN };
  }

  let best: [string, string] = [name, ""];
  for (let i = 1; i < words.length; i++) {
    const pair: [string, string] = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    if (Math.max(...pair.map((l) => l.length)) < Math.max(...best.map((l) => l.length))) best = pair;
  }
  const size = Math.min(TWO_LINE_MAX, fit(120, Math.max(best[0].length, best[1].length)));
  if (size >= TWO_LINE_MIN) return { lines: best, size };
  return { lines: best.map((line) => cut(line, 120)), size: TWO_LINE_MIN };
}

/** Cuts a line with an ellipsis so it fits `width` at the smallest size. */
function cut(line: string, width: number): string {
  const room = Math.floor((width / TWO_LINE_MIN - 0.2) / 0.7);
  return line.length > room ? `${line.slice(0, room - 1).trimEnd()}…` : line;
}

/** The Amharic line shrinks a little for long names, never below 11. */
export function amharicFontSize(text: string): number {
  return Math.max(11, Math.min(16, 124 / (text.length * 0.68)));
}

/** Clay follows the theme's primary ink; metals echo LEVEL_METAL in Seal. */
export const INK: Record<InkLevel, string> = {
  clay: "var(--primary)",
  bronze: "#8C5A2B",
  silver: "#5E6A78",
  gold: "#A8811A",
  diamond: "#2A6F7F",
  none: "var(--border-strong)",
};

/** Unearned stamps print their words a shade darker than the rings. */
export const EMPTY_TEXT = "var(--faint)";

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

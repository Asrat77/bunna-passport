/**
 * The generative pencil face behind every profile picture, ported 1:1 from
 * the design canvas (Doodle.dc.html) and extended with editable parts.
 *
 * Pure: the same seed and traits always draw the same face. The seed's random
 * draws happen in the canvas's exact order whatever the traits say, so a face
 * with no edits matches the canvas fixture, and an edit only changes the part
 * it touches. Every random draw happens before mood is applied so both moods
 * share one face.
 *
 * Paths are in a 100 × 100 viewBox. app/models/share_card/doodle.rb is a line
 * for line Ruby port; change both together (the fixtures check they agree).
 */
import { fnv1a, mulberry32 } from "../hash";
import { traitsFromChoices, type AvatarTraits } from "./traits";

export type Mood = "sleepy" | "awake";

export type DoodlePaths = {
  hash: number;
  /** Every trait this face was drawn with, the seed's own filled in. */
  traits: AvatarTraits;
  /** Long hair and locs, drawn behind the head. */
  hairBack: string;
  earsFill: string;
  earsStroke: string;
  head: string;
  headStroke: string;
  neck: string;
  /** The hair on top of the head, or the hat that covers it. */
  hairFill: string;
  hairLine: string;
  /** Colour-only fill under a buzz cut. */
  hairShade: string;
  /** True when hairFill is a hat rather than hair. */
  topIsHat: boolean;
  brows: string;
  /** Eye whites, for the open eye shapes. */
  whites: string;
  eyes: string;
  pupils: string;
  /** Dark centres inside coloured irises. */
  pupilCores: string;
  nose: string;
  mouth: string;
  mouthLine: string;
  /** True when the mouth is filled with the hatch pattern. */
  mouthHatched: boolean;
  facialHair: string;
  glasses: string;
  /** Filled lenses, for shades. */
  lenses: string;
  lensGlints: string;
  dots: string;
  headphonesBand: string;
  headphonesCups: string;
  earringsFill: string;
  earringsLine: string;
  extra: string;
  cheeks: string;
};

type Point = [number, number];

const f = (n: number) => String(Math.round(n * 10) / 10);

const circ = (x: number, y: number, rad: number) =>
  `M${f(x - rad)} ${f(y)}a${f(rad)} ${f(rad)} 0 1 0 ${f(rad * 2)} 0a${f(rad)} ${f(rad)} 0 1 0 ${f(-rad * 2)} 0Z`;

/** A rounded rectangle centred on (x, y). */
const roundRect = (x: number, y: number, w: number, h: number, rad: number) =>
  `M${f(x - w / 2 + rad)} ${f(y - h / 2)}h${f(w - rad * 2)}q${f(rad)} 0 ${f(rad)} ${f(rad)}v${f(h - rad * 2)}q0 ${f(rad)} ${f(-rad)} ${f(rad)}h${f(-(w - rad * 2))}q${f(-rad)} 0 ${f(-rad)} ${f(-rad)}v${f(-(h - rad * 2))}q0 ${f(-rad)} ${f(rad)} ${f(-rad)}Z`;

const mid = (p: Point, q: Point): Point => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

// Streams of their own for parts the seed never drew (stubble or freckles
// added in the editor), so turning one on doesn't move the other.
const STUBBLE_STREAM = 0x9e3779b9;
const FRECKLE_STREAM = 0x85ebca6b;

// How far above the crown the headphone band clears whatever is up there.
const BAND_LIFT: Record<string, number> = {
  wrap: 18,
  beanie: 16,
  cap: 9,
  afro: 15,
  bun: 15,
  curls: 10,
  locs: 8,
};

export function generateDoodle(seed: string, mood: Mood, overrides: Partial<AvatarTraits> = {}): DoodlePaths {
  const awake = mood === "awake";
  const hash = fnv1a(seed);
  const rnd = mulberry32(hash);
  const stubbleRnd = mulberry32((hash ^ STUBBLE_STREAM) >>> 0);
  const freckleRnd = mulberry32((hash ^ FRECKLE_STREAM) >>> 0);
  const r = (a: number, b: number) => a + (b - a) * rnd();
  const ri = (n: number) => Math.floor(rnd() * n);

  const cx = 50 + r(-1.5, 1.5);
  const cy = 55;
  const rx = r(23, 28);
  const ry = r(27, 31);
  const chin = r(0.8, 0.98);
  const N = 12;
  const pts: Point[] = [];
  for (let k = 0; k < N; k++) {
    const a = (Math.PI * 2 * k) / N - Math.PI / 2;
    const j = r(0.95, 1.05);
    const sx = Math.sin(a) > 0.3 ? chin : 1;
    pts.push([cx + Math.cos(a) * rx * j * sx, cy + Math.sin(a) * ry * j]);
  }
  const m0 = mid(pts[N - 1], pts[0]);
  let outline = `M${f(m0[0])} ${f(m0[1])}`;
  for (let k = 0; k < N; k++) {
    const p = pts[k];
    const m = mid(p, pts[(k + 1) % N]);
    outline += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  const head = `${outline}Z`;
  // A pencil outline runs past where it started instead of closing neatly.
  const m1 = mid(pts[0], pts[1]);
  const headStroke = `${outline}Q${f(pts[0][0] + 0.4)} ${f(pts[0][1] - 1.3)} ${f(m1[0] + 0.8)} ${f(m1[1] - 1.1)}`;

  const L = cx - rx;
  const R = cx + rx;
  const top = cy - ry;
  const ey = cy - ry * 0.02 + r(-1.5, 1.5);
  const hl = cy - ry * 0.32;

  const hasEars = rnd() < 0.75;
  const earL = `M${f(L + 1)} ${f(ey - 4)}c-7 -3 -8 11 0 10`;
  const earR = `M${f(R - 1)} ${f(ey - 4)}c7 -3 8 11 0 10`;
  const earsFill = hasEars ? `${earL}Z${earR}Z` : "";
  const earsStroke = hasEars
    ? `${earL}${earR}M${f(L - 2.5)} ${f(ey - 1)}q-1.5 2.5 0.5 4.5M${f(R + 2.5)} ${f(ey - 1)}q1.5 2.5 -0.5 4.5`
    : "";

  const hairStyle = ri(6);
  const eyeStyle = ri(3);
  const es = r(9, 11.5);
  const gaze = r(-1.4, 1.4);
  const ex1 = cx - es;
  const ex2 = cx + es;
  const browLift = r(-1, 1.5);
  const noseStyle = ri(3);
  const nx = cx + r(-1, 3);
  const my = cy + ry * 0.5 + r(-1, 1.5);
  const mw = r(6.5, 10);
  const openMouth = rnd() < 0.5;
  const hasGlasses = rnd() < 0.28;
  const hasStubble = rnd() < 0.3;
  const hasFreckles = rnd() < 0.25;

  const t: AvatarTraits = {
    ...traitsFromChoices({ hairStyle, eyeStyle, noseStyle, hasGlasses, hasStubble, hasFreckles }),
    ...overrides,
  };

  // Hair first, then the hat that replaces whatever is on top. Hair behind
  // the head (long hair, locs) still shows under a hat.
  let hairFill = "";
  let hairLine = "";
  let hairBack = "";
  // Colour under a buzz cut, which has no outline of its own.
  let hairShade = "";
  const topIsHat = t.hat !== "none";
  if (t.hair === "afro") {
    // Afro: bumps along an arc above the head.
    const bumps = 9;
    let d = `M${f(L - 2)} ${f(cy - ry * 0.1)}`;
    for (let b = 0; b <= bumps; b++) {
      const a = Math.PI + (Math.PI * b) / bumps;
      const x = cx + Math.cos(a) * (rx + 7);
      const y = cy - ry * 0.25 + Math.sin(a) * (ry + 2);
      d += `A6 6 0 0 1 ${f(x)} ${f(y)}`;
    }
    d += `L${f(R + 2)} ${f(cy - ry * 0.1)}Q${f(R - 3)} ${f(hl - 6)} ${f(cx)} ${f(hl - 5)}Q${f(L + 3)} ${f(hl - 6)} ${f(L - 2)} ${f(cy - ry * 0.1)}Z`;
    hairFill = d;
  } else if (t.hair === "buzz") {
    // Buzz cut: short hatching.
    let d = "";
    for (let b = 0; b < 15; b++) {
      const a = Math.PI * 1.1 + (Math.PI * 0.8 * b) / 14;
      d += `M${f(cx + Math.cos(a) * rx * 0.99)} ${f(cy + Math.sin(a) * ry * 0.99)}L${f(cx + Math.cos(a + 0.05) * rx * 0.8)} ${f(cy + Math.sin(a + 0.05) * ry * 0.8 + 1)}`;
    }
    hairLine = d;
    hairShade = `M${f(L + 1)} ${f(hl + 3)}Q${f(L - 0.5)} ${f(top - 0.5)} ${f(cx)} ${f(top - 0.8)}Q${f(R + 0.5)} ${f(top - 0.5)} ${f(R - 1)} ${f(hl + 3)}Q${f(cx)} ${f(hl - 3)} ${f(L + 1)} ${f(hl + 3)}Z`;
  } else if (t.hair === "bald") {
    // Bald, with a shine.
    hairLine = `M${f(cx - 9)} ${f(top + 6)}q5 -3 10 -1`;
  } else if (t.hair === "side") {
    // Side part.
    hairFill = `M${f(L)} ${f(cy - ry * 0.12)}Q${f(L - 3)} ${f(top - 3)} ${f(cx - 2)} ${f(top - 4)}Q${f(R + 2)} ${f(top - 3)} ${f(R + 1)} ${f(cy - ry * 0.25)}Q${f(cx + 8)} ${f(hl - 8)} ${f(cx - 5)} ${f(hl - 3)}Q${f(L + 4)} ${f(hl)} ${f(L)} ${f(cy - ry * 0.12)}Z`;
  } else if (t.hair === "curls") {
    // A short crop of curls, lower than the afro.
    const bumps = 10;
    let d = `M${f(L - 1)} ${f(cy - ry * 0.2)}`;
    for (let b = 0; b <= bumps; b++) {
      const a = Math.PI + (Math.PI * b) / bumps;
      const x = cx + Math.cos(a) * (rx + 2.5);
      const y = cy - ry * 0.18 + Math.sin(a) * (ry * 0.92 + 3);
      d += `A3.6 3.6 0 0 1 ${f(x)} ${f(y)}`;
    }
    d += `L${f(R + 1)} ${f(cy - ry * 0.2)}Q${f(R - 4)} ${f(hl - 4)} ${f(cx)} ${f(hl - 3)}Q${f(L + 4)} ${f(hl - 4)} ${f(L - 1)} ${f(cy - ry * 0.2)}Z`;
    hairFill = d;
  } else if (t.hair === "cornrows") {
    // Close to the scalp, with braided rows running back.
    hairFill = `M${f(L + 0.5)} ${f(hl + 2)}Q${f(L - 1.5)} ${f(top - 2)} ${f(cx)} ${f(top - 2.5)}Q${f(R + 1.5)} ${f(top - 2)} ${f(R - 0.5)} ${f(hl + 2)}Q${f(cx)} ${f(hl - 5)} ${f(L + 0.5)} ${f(hl + 2)}Z`;
    for (let k = -2; k <= 2; k++) {
      const x0 = cx + k * 6.5;
      const y0 = hl - 3.5 + Math.abs(k) * 1.6;
      const x1 = cx + k * 8.5;
      const y1 = top - 1 + Math.abs(k) * 2.5;
      hairLine += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
      for (let s = 1; s <= 3; s++) {
        const px = x0 + ((x1 - x0) * s) / 4;
        const py = y0 + ((y1 - y0) * s) / 4;
        hairLine += `M${f(px - 1.6)} ${f(py + 1)}L${f(px)} ${f(py - 0.6)}L${f(px + 1.6)} ${f(py + 1)}`;
      }
    }
  } else if (t.hair === "bun") {
    // Pulled back smooth into a bun on top.
    hairFill = `M${f(L)} ${f(cy - ry * 0.15)}Q${f(L - 3)} ${f(top - 3)} ${f(cx)} ${f(top - 4)}Q${f(R + 3)} ${f(top - 3)} ${f(R)} ${f(cy - ry * 0.15)}Q${f(R - 3)} ${f(hl - 6)} ${f(cx)} ${f(hl - 5)}Q${f(L + 3)} ${f(hl - 6)} ${f(L)} ${f(cy - ry * 0.15)}Z${circ(cx, top - 9, 7)}`;
    hairLine = `M${f(cx - 6)} ${f(top - 3.5)}q6 2.5 12 0`;
  } else if (t.hair === "long") {
    // Curtains parted in the middle, falling past the shoulders behind.
    hairFill = `M${f(L - 0.5)} ${f(cy - ry * 0.05)}Q${f(L - 3)} ${f(top - 3)} ${f(cx)} ${f(top - 3.5)}Q${f(R + 3)} ${f(top - 3)} ${f(R + 0.5)} ${f(cy - ry * 0.05)}Q${f(R - 2)} ${f(hl - 2)} ${f(cx + 1)} ${f(hl - 6)}Q${f(L + 2)} ${f(hl - 2)} ${f(L - 0.5)} ${f(cy - ry * 0.05)}Z`;
    hairBack = `M${f(cx)} ${f(top - 3)}C${f(L - 10)} ${f(top - 3)} ${f(L - 9)} ${f(cy + 6)} ${f(L - 8)} ${f(cy + ry * 0.95)}Q${f(L - 2)} ${f(cy + ry + 3)} ${f(cx)} ${f(cy + ry * 0.6)}Q${f(R + 2)} ${f(cy + ry + 3)} ${f(R + 8)} ${f(cy + ry * 0.95)}C${f(R + 9)} ${f(cy + 6)} ${f(R + 10)} ${f(top - 3)} ${f(cx)} ${f(top - 3)}Z`;
  } else {
    // Locs: a full crown and rounded strands hanging behind.
    hairFill = `M${f(L - 2)} ${f(cy - ry * 0.05)}Q${f(L - 4)} ${f(top - 4)} ${f(cx)} ${f(top - 5)}Q${f(R + 4)} ${f(top - 4)} ${f(R + 2)} ${f(cy - ry * 0.05)}L${f(R - 1)} ${f(hl)}Q${f(cx)} ${f(hl - 8)} ${f(L + 1)} ${f(hl)}Z`;
    for (let k = -2; k <= 2; k++) {
      const x = cx + k * 6;
      hairLine += `M${f(x)} ${f(hl - 5 + Math.abs(k))}Q${f(x + k * 0.8)} ${f(top + 2)} ${f(x + k * 1.6)} ${f(top - 3 + Math.abs(k) * 1.5)}`;
    }
    const strand = (x: number, y0: number, y1: number) =>
      `M${f(x - 2.6)} ${f(y0)}L${f(x - 2.6)} ${f(y1)}a2.6 2.6 0 0 0 5.2 0L${f(x + 2.6)} ${f(y0)}Z`;
    const y0 = cy - ry * 0.3;
    hairBack =
      strand(L - 5.5, y0, cy + ry * 0.7) +
      strand(L - 0.5, y0, cy + ry * 0.88) +
      strand(R + 0.5, y0, cy + ry * 0.88) +
      strand(R + 5.5, y0, cy + ry * 0.7);
  }

  if (topIsHat) hairShade = "";
  if (t.hat === "cap") {
    // Flat cap with a short brim.
    hairFill = `M${f(L - 1)} ${f(hl)}Q${f(L - 1)} ${f(top - 5)} ${f(cx)} ${f(top - 6)}Q${f(R + 2)} ${f(top - 5)} ${f(R + 2)} ${f(hl - 1)}Q${f(cx)} ${f(hl - 7)} ${f(L - 1)} ${f(hl)}Z`;
    hairLine = `M${f(R - 4)} ${f(hl - 1)}q9 -1 13 4`;
  } else if (t.hat === "beanie") {
    // Beanie with a cuff and pompom.
    const band = cy - ry * 0.38;
    hairFill = `M${f(L - 2)} ${f(band)}Q${f(L - 3)} ${f(top - 9)} ${f(cx)} ${f(top - 10)}Q${f(R + 3)} ${f(top - 9)} ${f(R + 2)} ${f(band)}Z${circ(cx, top - 12, 4.5)}`;
    hairLine = `M${f(L - 3)} ${f(band)}L${f(R + 3)} ${f(band)}L${f(R + 3)} ${f(band + 6)}L${f(L - 3)} ${f(band + 6)}Z`;
  } else if (t.hat === "wrap") {
    // A tall head wrap with a knot at the front.
    hairFill = `M${f(L - 2.5)} ${f(hl + 1)}Q${f(L - 5)} ${f(top - 14)} ${f(cx - 2)} ${f(top - 13)}Q${f(R + 5)} ${f(top - 13)} ${f(R + 2.5)} ${f(hl + 1)}Q${f(cx)} ${f(hl - 6)} ${f(L - 2.5)} ${f(hl + 1)}Z`;
    hairFill += `M${f(cx - 1)} ${f(top - 9)}q-9 -9 -1.5 -12.5q4 3.5 1.5 12.5ZM${f(cx + 1)} ${f(top - 9)}q9 -8 2 -12.5q-4.5 3.5 -2 12.5Z`;
    hairLine = `M${f(L - 1)} ${f(hl - 3)}Q${f(cx)} ${f(hl - 13)} ${f(R + 1)} ${f(hl - 3)}M${f(L + 1)} ${f(hl - 10)}Q${f(cx)} ${f(hl - 20)} ${f(R - 1)} ${f(hl - 10)}`;
  }

  // Stubble and freckles keep their seed's own positions when the seed drew
  // them, and come from their own streams when added in the editor.
  let dots = "";
  if (hasStubble || t.facial_hair === "stubble") {
    const draw = hasStubble ? rnd : stubbleRnd;
    let stubble = "";
    for (let k = 0; k < 14; k++) {
      const a = Math.PI * (0.15 + 0.7 * (k / 13));
      const rr = 0.72 + (0.9 - 0.72) * draw();
      stubble += circ(cx + Math.cos(a) * rx * chin * rr, cy + Math.sin(a) * ry * rr, 0.5);
    }
    if (t.facial_hair === "stubble") dots += stubble;
  }
  if (hasFreckles || t.freckles === "freckles") {
    const draw = hasFreckles ? rnd : freckleRnd;
    const d = (a: number, b: number) => a + (b - a) * draw();
    let freckles = "";
    for (let k = 0; k < 3; k++) {
      freckles += circ(ex1 + d(-3, 3), ey + 7 + d(0, 2), 0.55) + circ(ex2 + d(-3, 3), ey + 7 + d(0, 2), 0.55);
    }
    if (t.freckles === "freckles") dots += freckles;
  }

  const nl = cx - rx * chin * 0.36;
  const nr = cx + rx * chin * 0.36;
  const ny = cy + ry * 0.9;
  const neck = `M${f(nl)} ${f(ny)}q-0.6 6 -1.8 12M${f(nr)} ${f(ny)}q0.4 6 1.6 12`;

  let nose: string;
  if (t.nose === "point") nose = `M${f(nx)} ${f(ey + 3)}l-3.5 9.5l4.5 0.5`;
  else if (t.nose === "round") nose = `M${f(nx - 2)} ${f(ey + 5)}q-4.5 8 1.5 9q4 0.3 3 -3`;
  else nose = `M${f(nx)} ${f(ey + 3)}q3.5 6 -1.5 10.5`;

  // Frames sit across the eyes and reach back to the ears.
  const temples = (half: number) =>
    `M${f(ex1 - half)} ${f(ey - 1)}L${f(L + 1)} ${f(ey - 3)}M${f(ex2 + half)} ${f(ey - 1)}L${f(R - 1)} ${f(ey - 3)}`;
  let glasses = "";
  let lenses = "";
  let lensGlints = "";
  if (t.glasses === "round") {
    glasses = `${circ(ex1, ey, 6.6)}${circ(ex2, ey, 6.6)}M${f(ex1 + 6.6)} ${f(ey - 1)}Q${f(cx)} ${f(ey - 3.5)} ${f(ex2 - 6.6)} ${f(ey - 1)}${temples(6.6)}`;
  } else if (t.glasses === "square") {
    glasses = `${roundRect(ex1, ey, 13, 10.5, 2.4)}${roundRect(ex2, ey, 13, 10.5, 2.4)}M${f(ex1 + 6.5)} ${f(ey - 1.5)}Q${f(cx)} ${f(ey - 3.5)} ${f(ex2 - 6.5)} ${f(ey - 1.5)}${temples(6.5)}`;
  } else if (t.glasses === "shades") {
    const lens = (x: number) =>
      `M${f(x - 7)} ${f(ey - 4)}Q${f(x)} ${f(ey - 5.5)} ${f(x + 7)} ${f(ey - 4)}Q${f(x + 6.5)} ${f(ey + 6)} ${f(x)} ${f(ey + 5.5)}Q${f(x - 6.5)} ${f(ey + 6)} ${f(x - 7)} ${f(ey - 4)}Z`;
    lenses = lens(ex1) + lens(ex2);
    lensGlints = `M${f(ex1 - 4)} ${f(ey - 1)}l2.6 -1.6M${f(ex2 - 4)} ${f(ey - 1)}l2.6 -1.6`;
    glasses = `${lenses}M${f(ex1 + 7)} ${f(ey - 3.5)}Q${f(cx)} ${f(ey - 5.5)} ${f(ex2 - 7)} ${f(ey - 3.5)}${temples(7)}`;
  }

  // Mood only changes eyes, brows, mouth, cheeks and the marks beside the head.
  let eyes = "";
  let pupils = "";
  let whites = "";
  let brows = "";
  const coloured = t.eye_color !== "graphite";
  let pupilCores = "";
  const iris = (x: number, y: number, rad: number) => {
    pupils += circ(x, y, rad);
    if (coloured) pupilCores += circ(x, y, rad * 0.5);
  };
  [ex1, ex2].forEach((ex, i) => {
    const left = i === 0;
    if (awake) {
      if (t.eyes === "dot") {
        // A coloured dot needs a white around it to read on deeper skin.
        if (coloured) whites += circ(ex, ey, 3.4);
        iris(ex, ey, coloured ? 2.3 : 2.1);
      } else if (t.eyes === "round") {
        const white = circ(ex, ey, 4.6);
        eyes += white;
        whites += white;
        iris(ex + gaze, ey + 0.5, coloured ? 2.3 : 1.8);
      } else {
        const white = `M${f(ex - 3.2)} ${f(ey)}a3.2 4.3 0 1 0 6.4 0a3.2 4.3 0 1 0 -6.4 0Z`;
        eyes += white;
        whites += white;
        iris(ex + gaze * 0.7, ey + 1, coloured ? 2 : 1.5);
      }
      brows += `M${f(ex - 4.5)} ${f(ey - 8.5 - browLift)}q4.5 -3.5 9 0`;
    } else {
      if (t.eyes === "dot") {
        eyes += `M${f(ex - 3.5)} ${f(ey)}q3.5 2.5 7 0`;
      } else {
        eyes += `M${f(ex - 4.6)} ${f(ey)}a4.6 4.6 0 0 0 9.2 0`;
        whites += `M${f(ex - 4.6)} ${f(ey)}a4.6 4.6 0 0 0 9.2 0Z`;
        eyes += `M${f(ex - 5.2)} ${f(ey)}h10.4`;
        iris(ex, ey + 2.4, coloured ? 1.6 : 1.2);
      }
      eyes += `M${f(ex - 3.5)} ${f(ey + 6.5)}q3.5 2 7 0`;
      brows += `M${f(ex - 4.5)} ${f(ey - (left ? 6 : 7.5))}L${f(ex + 4.5)} ${f(ey - (left ? 7.5 : 6))}`;
    }
  });

  let mouth: string;
  let mouthLine: string;
  let mouthHatched = false;
  if (awake) {
    mouthLine = `M${f(cx - mw)} ${f(my - 1)}Q${f(cx)} ${f(my + 7)} ${f(cx + mw)} ${f(my - 1.5)}`;
    mouth = mouthLine;
    if (openMouth) {
      mouth += "Z";
      mouthLine += `L${f(cx - mw)} ${f(my - 1)}`;
      mouthHatched = true;
    }
  } else if (openMouth) {
    mouth = `M${f(cx - 3)} ${f(my + 1)}a3 4 0 1 0 6 0a3 4 0 1 0 -6 0Z`;
    mouthLine = mouth;
    mouthHatched = true;
  } else {
    mouth = `M${f(cx - mw * 0.7)} ${f(my + 1.5)}q${f(mw * 0.35)} -2 ${f(mw * 0.7)} 0t${f(mw * 0.7)} 0`;
    mouthLine = mouth;
  }

  // Facial hair. The beard follows the jaw from cheek to cheek and leaves the
  // mouth clear; both styles carry a mustache.
  const mustache = `M${f(cx - mw * 0.75)} ${f(my - 2.4)}Q${f(cx - mw * 0.4)} ${f(my - 5.6)} ${f(cx)} ${f(my - 4.3)}Q${f(cx + mw * 0.4)} ${f(my - 5.6)} ${f(cx + mw * 0.75)} ${f(my - 2.4)}Q${f(cx + mw * 0.4)} ${f(my - 3.4)} ${f(cx)} ${f(my - 2.6)}Q${f(cx - mw * 0.4)} ${f(my - 3.4)} ${f(cx - mw * 0.75)} ${f(my - 2.4)}Z`;
  let facialHair = "";
  if (t.facial_hair === "mustache") {
    facialHair = mustache;
  } else if (t.facial_hair === "beard") {
    // The head's own outline from the right cheek round the chin to the left,
    // grown a touch so the beard covers the jaw line.
    const g = pts.map((p): Point => [cx + (p[0] - cx) * 1.04, cy + (p[1] - cy) * 1.05 + 0.6]);
    const start = mid(g[3], g[4]);
    let d = `M${f(start[0])} ${f(start[1])}`;
    for (let k = 4; k <= 8; k++) {
      const m = mid(g[k], g[k + 1]);
      d += `Q${f(g[k][0])} ${f(g[k][1])} ${f(m[0])} ${f(m[1])}`;
    }
    d += `Q${f(cx - mw - 2)} ${f(my - 2)} ${f(cx - mw - 1.5)} ${f(my + 1)}Q${f(cx)} ${f(my + 12)} ${f(cx + mw + 1.5)} ${f(my + 1)}Q${f(cx + mw + 2)} ${f(my - 2)} ${f(start[0])} ${f(start[1])}Z`;
    facialHair = d + mustache;
  }

  // Headphones: a band over whatever is on the head, cups over the ears.
  let headphonesBand = "";
  let headphonesCups = "";
  if (t.headphones === "headphones") {
    const tall = (topIsHat ? BAND_LIFT[t.hat] : BAND_LIFT[t.hair]) ?? 6;
    const y0 = ey - 6;
    const apex = top - tall;
    const c = y0 - (y0 - apex) / 0.75;
    headphonesBand = `M${f(L - 3)} ${f(y0)}C${f(L - 4)} ${f(c)} ${f(R + 4)} ${f(c)} ${f(R + 3)} ${f(y0)}`;
    headphonesCups = roundRect(L - 3, ey + 0.5, 7.5, 14, 3) + roundRect(R + 3, ey + 0.5, 7.5, 14, 3);
  }

  // Earrings hang from the lobes, or from where the lobes would be.
  let earringsFill = "";
  let earringsLine = "";
  const lobeL: Point = [hasEars ? L - 1.5 : L + 0.8, ey + 7];
  const lobeR: Point = [hasEars ? R + 1.5 : R - 0.8, ey + 7];
  if (t.earrings === "studs") {
    earringsFill = circ(lobeL[0], lobeL[1], 1.4) + circ(lobeR[0], lobeR[1], 1.4);
  } else if (t.earrings === "hoops") {
    earringsLine = circ(lobeL[0], lobeL[1] + 2.6, 2.8) + circ(lobeR[0], lobeR[1] + 2.6, 2.8);
  }

  const extra = awake
    ? `M${f(R + 4)} ${f(top + 10)}l6 -3M${f(R + 5)} ${f(top + 17)}l6.5 0.5M${f(R + 1)} ${f(top + 3)}l3.5 -5`
    : `M${f(R + 2)} ${f(top + 2)}h6l-6 6h6M${f(R + 11)} ${f(top - 7)}h4l-4 4h4`;

  // Colored-pencil blush once the coffee kicks in.
  let cheeks = "";
  if (awake) {
    [ex1 - 2, ex2 + 2].forEach((x) => {
      const y = ey + 9;
      cheeks += `M${f(x - 3.5)} ${f(y + 1.5)}l3 -3M${f(x - 2)} ${f(y + 3)}l4 -4M${f(x)} ${f(y + 3.5)}l3 -3`;
    });
  }

  return {
    hash,
    traits: t,
    hairBack,
    earsFill,
    earsStroke,
    head,
    headStroke,
    neck,
    hairFill,
    hairLine,
    hairShade,
    topIsHat,
    brows,
    whites,
    eyes,
    pupils,
    pupilCores,
    nose,
    mouth,
    mouthLine,
    mouthHatched,
    facialHair,
    glasses,
    lenses,
    lensGlints,
    dots,
    headphonesBand,
    headphonesCups,
    earringsFill,
    earringsLine,
    extra,
    cheeks,
  };
}

/**
 * Candidate seeds for face shapes, as the canvas draws them: the first round
 * leads with your own face, and each Shuffle deals `{base}-{n}` onwards.
 */
export function shuffleSeeds(base: string, round: number, count = 8): string[] {
  return Array.from({ length: count }, (_, i) =>
    round === 0 && i === 0 ? base : `${base}-${round * count + i}`,
  );
}

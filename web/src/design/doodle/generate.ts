/**
 * The generative pencil doodle, ported 1:1 from the design canvas
 * (Doodle.dc.html). Pure: the same seed always draws the same face, and every
 * random draw happens before mood is applied so both moods share one face.
 *
 * Paths are in a 100 × 100 viewBox.
 */
import { fnv1a, mulberry32 } from "../hash";

export type Mood = "sleepy" | "awake";

export type DoodlePaths = {
  hash: number;
  earsFill: string;
  earsStroke: string;
  head: string;
  headStroke: string;
  neck: string;
  hairFill: string;
  hairLine: string;
  brows: string;
  eyes: string;
  pupils: string;
  nose: string;
  mouth: string;
  mouthLine: string;
  /** True when the mouth is filled with the hatch pattern. */
  mouthHatched: boolean;
  glasses: string;
  dots: string;
  extra: string;
  cheeks: string;
};

type Point = [number, number];

const f = (n: number) => String(Math.round(n * 10) / 10);

const circ = (x: number, y: number, rad: number) =>
  `M${f(x - rad)} ${f(y)}a${f(rad)} ${f(rad)} 0 1 0 ${f(rad * 2)} 0a${f(rad)} ${f(rad)} 0 1 0 ${f(-rad * 2)} 0Z`;

const mid = (p: Point, q: Point): Point => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

export function generateDoodle(seed: string, mood: Mood): DoodlePaths {
  const awake = mood === "awake";
  const hash = fnv1a(seed);
  const rnd = mulberry32(hash);
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
  let hairFill = "";
  let hairLine = "";
  if (hairStyle === 0) {
    // Flat cap with a short brim.
    hairFill = `M${f(L - 1)} ${f(hl)}Q${f(L - 1)} ${f(top - 5)} ${f(cx)} ${f(top - 6)}Q${f(R + 2)} ${f(top - 5)} ${f(R + 2)} ${f(hl - 1)}Q${f(cx)} ${f(hl - 7)} ${f(L - 1)} ${f(hl)}Z`;
    hairLine = `M${f(R - 4)} ${f(hl - 1)}q9 -1 13 4`;
  } else if (hairStyle === 1) {
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
  } else if (hairStyle === 2) {
    // Buzz cut: short hatching.
    let d = "";
    for (let b = 0; b < 15; b++) {
      const a = Math.PI * 1.1 + (Math.PI * 0.8 * b) / 14;
      d += `M${f(cx + Math.cos(a) * rx * 0.99)} ${f(cy + Math.sin(a) * ry * 0.99)}L${f(cx + Math.cos(a + 0.05) * rx * 0.8)} ${f(cy + Math.sin(a + 0.05) * ry * 0.8 + 1)}`;
    }
    hairLine = d;
  } else if (hairStyle === 3) {
    // Bald, with a shine.
    hairLine = `M${f(cx - 9)} ${f(top + 6)}q5 -3 10 -1`;
  } else if (hairStyle === 4) {
    // Beanie with a cuff and pompom.
    const band = cy - ry * 0.38;
    hairFill = `M${f(L - 2)} ${f(band)}Q${f(L - 3)} ${f(top - 9)} ${f(cx)} ${f(top - 10)}Q${f(R + 3)} ${f(top - 9)} ${f(R + 2)} ${f(band)}Z${circ(cx, top - 12, 4.5)}`;
    hairLine = `M${f(L - 3)} ${f(band)}L${f(R + 3)} ${f(band)}L${f(R + 3)} ${f(band + 6)}L${f(L - 3)} ${f(band + 6)}Z`;
  } else {
    // Side part.
    hairFill = `M${f(L)} ${f(cy - ry * 0.12)}Q${f(L - 3)} ${f(top - 3)} ${f(cx - 2)} ${f(top - 4)}Q${f(R + 2)} ${f(top - 3)} ${f(R + 1)} ${f(cy - ry * 0.25)}Q${f(cx + 8)} ${f(hl - 8)} ${f(cx - 5)} ${f(hl - 3)}Q${f(L + 4)} ${f(hl)} ${f(L)} ${f(cy - ry * 0.12)}Z`;
  }

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

  let dots = "";
  if (hasStubble) {
    for (let k = 0; k < 14; k++) {
      const a = Math.PI * (0.15 + 0.7 * (k / 13));
      const rr = r(0.72, 0.9);
      dots += circ(cx + Math.cos(a) * rx * chin * rr, cy + Math.sin(a) * ry * rr, 0.5);
    }
  }
  if (hasFreckles) {
    for (let k = 0; k < 3; k++) {
      dots += circ(ex1 + r(-3, 3), ey + 7 + r(0, 2), 0.55) + circ(ex2 + r(-3, 3), ey + 7 + r(0, 2), 0.55);
    }
  }

  const nl = cx - rx * chin * 0.36;
  const nr = cx + rx * chin * 0.36;
  const ny = cy + ry * 0.9;
  const neck = `M${f(nl)} ${f(ny)}q-0.6 6 -1.8 12M${f(nr)} ${f(ny)}q0.4 6 1.6 12`;

  let nose: string;
  if (noseStyle === 0) nose = `M${f(nx)} ${f(ey + 3)}l-3.5 9.5l4.5 0.5`;
  else if (noseStyle === 1) nose = `M${f(nx - 2)} ${f(ey + 5)}q-4.5 8 1.5 9q4 0.3 3 -3`;
  else nose = `M${f(nx)} ${f(ey + 3)}q3.5 6 -1.5 10.5`;

  const glasses = hasGlasses
    ? `${circ(ex1, ey, 6.6)}${circ(ex2, ey, 6.6)}M${f(ex1 + 6.6)} ${f(ey - 1)}Q${f(cx)} ${f(ey - 3.5)} ${f(ex2 - 6.6)} ${f(ey - 1)}M${f(ex1 - 6.6)} ${f(ey - 1)}L${f(L + 1)} ${f(ey - 3)}M${f(ex2 + 6.6)} ${f(ey - 1)}L${f(R - 1)} ${f(ey - 3)}`
    : "";

  // Mood only changes eyes, brows, mouth, cheeks and the marks beside the head.
  let eyes = "";
  let pupils = "";
  let brows = "";
  [ex1, ex2].forEach((ex, i) => {
    const left = i === 0;
    if (awake) {
      if (eyeStyle === 0) {
        pupils += circ(ex, ey, 2.1);
      } else if (eyeStyle === 1) {
        eyes += circ(ex, ey, 4.6);
        pupils += circ(ex + gaze, ey + 0.5, 1.8);
      } else {
        eyes += `M${f(ex - 3.2)} ${f(ey)}a3.2 4.3 0 1 0 6.4 0a3.2 4.3 0 1 0 -6.4 0Z`;
        pupils += circ(ex + gaze * 0.7, ey + 1, 1.5);
      }
      brows += `M${f(ex - 4.5)} ${f(ey - 8.5 - browLift)}q4.5 -3.5 9 0`;
    } else {
      if (eyeStyle === 0) {
        eyes += `M${f(ex - 3.5)} ${f(ey)}q3.5 2.5 7 0`;
      } else {
        eyes += `M${f(ex - 4.6)} ${f(ey)}a4.6 4.6 0 0 0 9.2 0`;
        eyes += `M${f(ex - 5.2)} ${f(ey)}h10.4`;
        pupils += circ(ex, ey + 2.4, 1.2);
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
    earsFill,
    earsStroke,
    head,
    headStroke,
    neck,
    hairFill,
    hairLine,
    brows,
    eyes,
    pupils,
    nose,
    mouth,
    mouthLine,
    mouthHatched,
    glasses,
    dots,
    extra,
    cheeks,
  };
}

/** Candidate seeds for the Studio's Shuffle: `{base}-{n}`. */
export function shuffleSeeds(base: string, round: number, count = 8): string[] {
  return Array.from({ length: count }, (_, i) => `${base}-${round * count + i + 1}`);
}

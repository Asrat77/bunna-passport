import { useId, useMemo } from "react";
import { generateDoodle, type Mood } from "./generate";

const GRAPHITE = "#3A3733";
const PAPER = "#F8F4EC";
const BLUSH = "#C8664A";

type Props = {
  seed: string;
  mood: Mood;
  size: number;
  /** "mood" draws the sleepy or awake disc and ring behind the face. */
  background?: "mood" | "none";
  label?: string;
  /** Hidden from assistive tech when the surrounding control already says it. */
  decorative?: boolean;
};

/**
 * The pencil doodle avatar (handoff, Doodle avatar). Rendering mirrors the
 * canvas: a wobble filter on the paper fills, wobble plus graphite grain on
 * the lines, cross-hatched hair and open mouths, and a faint offset second
 * pass. Lines thicken below 70px so a small face still reads.
 */
export function Doodle({ seed, mood, size, background = "mood", label, decorative = false }: Props) {
  const paths = useMemo(() => generateDoodle(seed, mood), [seed, mood]);
  const id = `dd${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const awake = mood === "awake";
  const small = size < 70;

  const sw = small ? 2.6 : 1.6;
  const sw2 = small ? 1.5 : 0.9;
  const swThin = small ? 2 : 1.1;
  const noiseSeed = (paths.hash % 97) + 1;
  const grainMatrix = small
    ? "0 0 0 0 0.23 0 0 0 0 0.22 0 0 0 0 0.2 0 0 0 -1 1.35"
    : "0 0 0 0 0.23 0 0 0 0 0.22 0 0 0 0 0.2 0 0 0 -2 1.6";
  const or = (d: string) => d || "M0 0";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label ?? (awake ? "Your doodle, awake after coffee" : "Your doodle, sleepy before coffee")}
      style={{ display: "block", overflow: "visible", flexShrink: 0 }}
    >
      <defs>
        <filter id={`${id}w`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={noiseSeed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`${id}p`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={noiseSeed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="wobbly" />
          <feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves={1} seed={3} result="grain" />
          <feColorMatrix in="grain" type="matrix" values={grainMatrix} result="grainAlpha" />
          <feComposite in="wobbly" in2="grainAlpha" operator="in" />
        </filter>
        <pattern id={`${id}h`} patternUnits="userSpaceOnUse" width="2.3" height="2.3" patternTransform="rotate(38)">
          <line x1="0.6" y1="0" x2="0.6" y2="2.3" stroke={GRAPHITE} strokeWidth="1.05" />
        </pattern>
        <pattern id={`${id}x`} patternUnits="userSpaceOnUse" width="3.2" height="3.2" patternTransform="rotate(-48)">
          <line x1="0.6" y1="0" x2="0.6" y2="3.2" stroke={GRAPHITE} strokeWidth="0.8" />
        </pattern>
      </defs>

      {background === "mood" ? (
        <>
          {/* Same language as the seals: dashed ring = not yet today, solid saffron = had a cup. */}
          <circle cx="50" cy="50" r="50" fill={awake ? "var(--accent-soft)" : "var(--sunken)"} />
          <circle
            cx="50"
            cy="50"
            r={small ? 47.8 : 48.7}
            fill="none"
            strokeLinecap="round"
            stroke={awake ? "var(--accent)" : "var(--border-strong)"}
            strokeWidth={small ? 4.5 : 2.6}
            strokeDasharray={awake ? undefined : small ? "7 6" : "5 4.5"}
          />
        </>
      ) : null}

      <g filter={`url(#${id}w)`}>
        <path d={or(paths.earsFill)} fill={PAPER} />
        <path d={paths.head} fill={PAPER} />
      </g>

      <g filter={`url(#${id}p)`} fill="none" stroke={GRAPHITE} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={or(paths.hairFill)} fill={`url(#${id}h)`} strokeWidth={swThin} />
        <path d={or(paths.hairFill)} fill={`url(#${id}x)`} stroke="none" opacity={0.8} />
        <path d={paths.neck} />
        <path d={or(paths.earsStroke)} />
        <path d={paths.headStroke} />
        <path d={or(paths.hairLine)} />
        <path d={paths.brows} />
        <path d={or(paths.eyes)} />
        <path d={or(paths.pupils)} fill={GRAPHITE} stroke="none" />
        <path d={paths.nose} />
        <path d={paths.mouth} fill={paths.mouthHatched ? `url(#${id}h)` : "none"} />
        <path d={or(paths.glasses)} />
        <path d={or(paths.dots)} fill={GRAPHITE} stroke="none" />
        <path d={paths.extra} strokeWidth={swThin} />
      </g>

      <g
        filter={`url(#${id}p)`}
        fill="none"
        stroke={GRAPHITE}
        strokeWidth={sw2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.42}
        transform="translate(0.8 -0.6) rotate(-1.2 50 55)"
      >
        <path d={paths.headStroke} />
        <path d={paths.neck} />
        <path d={or(paths.hairLine)} />
        <path d={paths.brows} />
        <path d={or(paths.eyes)} />
        <path d={paths.nose} />
        <path d={paths.mouthLine} />
        <path d={or(paths.glasses)} />
      </g>

      <g filter={`url(#${id}p)`} fill="none" stroke={BLUSH} strokeWidth={swThin} strokeLinecap="round" opacity={0.6}>
        <path d={or(paths.cheeks)} />
      </g>
    </svg>
  );
}

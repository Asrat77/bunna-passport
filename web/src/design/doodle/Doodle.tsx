import { useId, useMemo } from "react";
import { generateDoodle, type Mood } from "./generate";
import {
  EARRINGS_COLOR,
  EYE_COLORS,
  EYE_WHITE,
  HAIR_COLORS,
  HAT_COLORS,
  HEADPHONES_COLOR,
  INK_COLORS,
  SKIN_COLORS,
  type AvatarTraits,
} from "./traits";

const GRAPHITE = "#3A3733";
const BLUSH = "#C8664A";

/** Close-ups the editor uses for its option tiles, in the 100 viewBox. */
const CROPS = {
  full: "0 0 100 100",
  top: "8 -2 84 84",
  eyes: "20 26 60 60",
  lower: "14 40 72 72",
} as const;

export type DoodleCrop = keyof typeof CROPS;

type Props = {
  seed: string;
  mood: Mood;
  size: number;
  /** The person's chosen parts and colours; anything missing comes from the seed. */
  traits?: Partial<AvatarTraits> | null;
  /** "mood" draws the sleepy or awake disc and ring behind the face. */
  background?: "mood" | "none";
  crop?: DoodleCrop;
  label?: string;
  /**
   * The pencil wobble and grain filters. Option tiles turn them off: a screen
   * of filtered faces is more than a phone's GPU will paint.
   */
  rough?: boolean;
  /** Hidden from assistive tech when the surrounding control already says it. */
  decorative?: boolean;
};

/**
 * The pencil profile picture (handoff, Doodle avatar). Rendering mirrors the
 * canvas: a wobble filter on the paper fills, wobble plus graphite grain on
 * the lines, cross-hatched hair and open mouths, and a faint offset second
 * pass. Lines thicken below 70px so a small face still reads.
 *
 * Colour is coloured pencil laid under the graphite: skin, hair and eye
 * colours fill under the same lines, so a face with the defaults ("paper"
 * skin, "graphite" hair and eyes) draws exactly as the original doodle.
 */
export function Doodle({ seed, mood, size, traits, background = "mood", crop = "full", label, rough = true, decorative = false }: Props) {
  // Callers often build traits inline, so the drawing keys on their contents.
  const traitsKey = traits ? JSON.stringify(traits) : "";
  const paths = useMemo(() => generateDoodle(seed, mood, traits ?? undefined), [seed, mood, traitsKey]);
  const id = `dd${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const awake = mood === "awake";
  // Lines thicken for small faces; a close-up shows less face at the same size.
  const scale = crop === "full" ? 1 : 100 / Number(CROPS[crop].split(" ")[2]);
  const small = size * scale < 70;

  const sw = small ? 2.6 : 1.6;
  const sw2 = small ? 1.5 : 0.9;
  const swThin = small ? 2 : 1.1;
  const noiseSeed = (paths.hash % 97) + 1;
  const grainMatrix = small
    ? "0 0 0 0 0.23 0 0 0 0 0.22 0 0 0 0 0.2 0 0 0 -1 1.35"
    : "0 0 0 0 0.23 0 0 0 0 0.22 0 0 0 0 0.2 0 0 0 -2 1.6";
  const or = (d: string) => d || "M0 0";
  const wobble = rough ? `url(#${id}w)` : undefined;
  const pencil = rough ? `url(#${id}p)` : undefined;

  const t = paths.traits;
  const skin = SKIN_COLORS[t.skin];
  const ink = INK_COLORS[t.skin];
  const hairTint = HAIR_COLORS[t.hair_color];
  const topTint = paths.topIsHat ? HAT_COLORS[t.hat] : hairTint;
  const tinted = (fill: string) => fill !== "none";
  // Under coloured hair the hatching lightens so the colour reads.
  const hatchOpacity = (fill: string) => (tinted(fill) ? 0.35 : 1);
  const crossOpacity = (fill: string) => (tinted(fill) ? 0 : 0.8);
  // Eye whites only show against coloured skin; on paper they'd be invisible anyway.
  const whites = t.skin === "paper" ? "" : paths.whites;

  return (
    <svg
      viewBox={CROPS[crop]}
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label ?? (awake ? "Your profile picture, awake after coffee" : "Your profile picture, sleepy before coffee")}
      style={{ display: "block", overflow: crop === "full" ? "visible" : "hidden", flexShrink: 0 }}
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

      {paths.hairBack ? (
        <>
          <g filter={wobble}>
            {tinted(hairTint) ? <path d={paths.hairBack} fill={hairTint} /> : null}
          </g>
          <g filter={pencil} fill="none" stroke={GRAPHITE} strokeWidth={swThin} strokeLinecap="round" strokeLinejoin="round">
            <path d={paths.hairBack} fill={`url(#${id}h)`} fillOpacity={hatchOpacity(hairTint)} />
            <path d={paths.hairBack} fill={`url(#${id}x)`} stroke="none" opacity={crossOpacity(hairTint)} />
          </g>
        </>
      ) : null}

      <g filter={wobble}>
        <path d={or(paths.earsFill)} fill={skin} />
        <path d={paths.head} fill={skin} />
        {tinted(hairTint) && paths.hairShade ? <path d={paths.hairShade} fill={hairTint} opacity={0.7} /> : null}
        {tinted(topTint) && paths.hairFill ? <path d={paths.hairFill} fill={topTint} /> : null}
        {tinted(hairTint) && paths.facialHair ? <path d={paths.facialHair} fill={hairTint} /> : null}
        {whites ? <path d={whites} fill={EYE_WHITE} /> : null}
      </g>

      <g filter={pencil} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={or(paths.hairFill)} fill={`url(#${id}h)`} fillOpacity={hatchOpacity(topTint)} strokeWidth={swThin} />
        <path d={or(paths.hairFill)} fill={`url(#${id}x)`} stroke="none" opacity={crossOpacity(topTint)} />
        <path d={paths.neck} />
        <path d={or(paths.earsStroke)} />
        <path d={paths.headStroke} />
        <path d={or(paths.hairLine)} />
        {tinted(hairTint) && !paths.topIsHat && paths.hairLine ? (
          <path d={paths.hairLine} stroke={EYE_WHITE} strokeWidth={swThin * 0.55} opacity={0.4} transform="translate(0.45 0.45)" />
        ) : null}
        {paths.facialHair ? (
          <path d={paths.facialHair} fill={`url(#${id}h)`} fillOpacity={hatchOpacity(hairTint)} strokeWidth={swThin} />
        ) : null}
        <path d={paths.brows} />
        <path d={or(paths.eyes)} />
        <path d={or(paths.pupils)} fill={EYE_COLORS[t.eye_color]} stroke="none" />
        {paths.pupilCores ? <path d={paths.pupilCores} fill={ink} stroke="none" /> : null}
        <path d={paths.nose} />
        <path d={paths.mouth} fill={paths.mouthHatched ? `url(#${id}h)` : "none"} />
        <path d={or(paths.glasses)} />
        <path d={or(paths.dots)} fill={ink} stroke="none" />
        <path d={paths.extra} strokeWidth={swThin} />
      </g>

      <g
        filter={pencil}
        fill="none"
        stroke={ink}
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

      <g filter={pencil} fill="none" stroke={BLUSH} strokeWidth={swThin} strokeLinecap="round" opacity={0.6}>
        <path d={or(paths.cheeks)} />
      </g>

      {paths.lenses || paths.headphonesCups || paths.earringsFill || paths.earringsLine ? (
        <>
          <g filter={wobble}>
            {/* Shades sit over everything on the face, the second pass included. */}
            {paths.lenses ? <path d={paths.lenses} fill={ink} /> : null}
            {paths.headphonesCups ? <path d={paths.headphonesCups} fill={HEADPHONES_COLOR} /> : null}
            {paths.earringsFill ? <path d={paths.earringsFill} fill={EARRINGS_COLOR} /> : null}
          </g>
          <g filter={pencil} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            {paths.lenses ? <path d={paths.lenses} /> : null}
            {paths.lensGlints ? <path d={paths.lensGlints} stroke={EYE_WHITE} strokeWidth={swThin} opacity={0.75} /> : null}
            {paths.headphonesBand ? (
              <>
                <path d={paths.headphonesBand} strokeWidth={sw + 3.2} />
                <path d={paths.headphonesBand} stroke={HEADPHONES_COLOR} strokeWidth={3.2} />
              </>
            ) : null}
            {paths.headphonesCups ? <path d={paths.headphonesCups} /> : null}
            {paths.earringsLine ? <path d={paths.earringsLine} stroke={EARRINGS_COLOR} strokeWidth={sw * 0.9} /> : null}
          </g>
        </>
      ) : null}
    </svg>
  );
}

import { useId } from "react";
import { phCoffeeBean, phCoffeeBeanFill } from "@/ui/icons";
import { LEVEL_METAL, LEVEL_PIPS, type StampLevel } from "./levels";

type Props = {
  name: string;
  /** null until the shop is stamped. */
  level: StampLevel | null;
  size: number;
  rotation?: number;
  /** Overrides the default "{name}, {level} stamp" label. */
  label?: string;
  decorative?: boolean;
};

/** The bean sits on Phosphor's 256 grid; this centres it a little above middle. */
const BEAN = "translate(32 27) scale(0.1406)";
const BEAN_SMALL = "translate(30 30) scale(0.1563)";

/**
 * The small stamp seal: a struck coin in the level's metal, with a debossed
 * coffee bean and one pip per level. The shop's name always sits beside the
 * seal, so the seal carries the level, not the name. Unearned seals are dashed
 * outlines, because visible absence is the completion hook. Below 32px the rim
 * detail and pips drop out. Use at 60px or smaller; the hero stamp is InkStamp.
 */
export function Seal({ name, level, size, rotation = 0, label, decorative = false }: Props) {
  const id = `seal${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const small = size < 32;
  const svgProps = {
    viewBox: "0 0 100 100",
    width: size,
    height: size,
    role: decorative ? undefined : "img",
    "aria-hidden": decorative || undefined,
    "aria-label": decorative ? undefined : label ?? (level ? `${name}, ${level} stamp` : `${name}, not stamped yet`),
    style: { display: "block", flexShrink: 0, transform: rotation ? `rotate(${rotation}deg)` : undefined },
  } as const;

  if (!level) {
    return (
      <svg {...svgProps}>
        <circle cx="50" cy="50" r="47" fill="var(--raised)" stroke="var(--border-strong)" strokeWidth={2.5} strokeDasharray="6 5" strokeLinecap="round" />
        <path d={phCoffeeBean} transform={small ? BEAN_SMALL : BEAN} fill="var(--faint)" opacity={0.7} />
      </svg>
    );
  }

  const metal = LEVEL_METAL[level];
  const pips = LEVEL_PIPS[level];
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id={`${id}f`} x1="0.2" y1="0.05" x2="0.8" y2="0.95">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.55" stopColor={metal.face} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        {/* The rim runs the other way, so it reads as a raised bevel. */}
        <linearGradient id={`${id}r`} x1="0.2" y1="0.05" x2="0.8" y2="0.95">
          <stop offset="0" stopColor={metal.dark} />
          <stop offset="0.5" stopColor={metal.face} />
          <stop offset="1" stopColor={metal.light} />
        </linearGradient>
        <radialGradient id={`${id}s`} cx="0.34" cy="0.26" r="0.62">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${id}f)`} />
      <circle cx="50" cy="50" r="48" fill="none" stroke={metal.deep} strokeOpacity={0.35} strokeWidth={1} />
      <circle cx="50" cy="50" r="41" fill={`url(#${id}r)`} />
      <circle cx="50" cy="50" r="39" fill={`url(#${id}f)`} />
      <circle cx="50" cy="50" r="39" fill={`url(#${id}s)`} />
      {small ? null : (
        <circle cx="50" cy="50" r="44.5" fill="none" stroke={metal.deep} strokeOpacity={0.3} strokeWidth={3} strokeDasharray="0.8 2.2" />
      )}
      {/* Debossed: a light lip below, the deep tone on top. */}
      <g transform={small ? BEAN_SMALL : BEAN}>
        <path d={phCoffeeBeanFill} fill={metal.light} opacity={0.8} transform="translate(0 7)" />
        <path d={phCoffeeBeanFill} fill={metal.deep} opacity={0.88} />
      </g>
      {small
        ? null
        : Array.from({ length: pips }, (_, i) => (
            <circle key={i} cx={50 + (i - (pips - 1) / 2) * 6} cy={76} r={1.9} fill={metal.deep} opacity={0.75} />
          ))}
    </svg>
  );
}

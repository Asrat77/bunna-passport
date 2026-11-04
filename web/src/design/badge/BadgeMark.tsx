import { useId } from "react";
import { LEVEL_METAL, type StampLevel } from "@/design/seal/levels";
import { phCoffee, phPencilSimple, phStamp } from "@/ui/icons";

type Props = {
  artworkKey: string;
  tier: StampLevel | null;
  earned: boolean;
  size: number;
  label?: string;
};

/** Artwork by what the badge counts: cups, stamps, or things you put on the map. */
function artwork(key: string): string {
  if (key.includes("contribution")) return phPencilSimple;
  if (key.includes("shop")) return phStamp;
  return phCoffee;
}

/** A milled rosette, so a badge never reads as a café's round stamp seal. */
function rosette(lobes: number, outer: number, inner: number): string {
  const step = (Math.PI * 2) / lobes;
  const at = (angle: number, r: number) => `${(50 + r * Math.sin(angle)).toFixed(2)} ${(50 - r * Math.cos(angle)).toFixed(2)}`;
  let d = `M ${at(0, inner)}`;
  for (let i = 0; i < lobes; i++) {
    d += ` Q ${at(step * (i + 0.5), outer + 3)} ${at(step * (i + 1), inner)}`;
  }
  return `${d} Z`;
}

const EDGE = rosette(14, 46, 43);
/** The icon on Phosphor's 256 grid, centred in the field. */
const ICON = "translate(30 30) scale(0.15625)";

/**
 * A badge (DESIGN.md §6.3): one mark per kind of badge, struck in the tier's
 * metal, the same ladder stamps climb. Unearned badges are the blank,
 * embossed silhouette, because visible absence is the hook.
 */
export function BadgeMark({ artworkKey, tier, earned, size, label }: Props) {
  const id = `badge${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const icon = artwork(artworkKey);
  const svgProps = {
    viewBox: "0 0 100 100",
    width: size,
    height: size,
    role: label ? "img" : undefined,
    "aria-hidden": label ? undefined : true,
    "aria-label": label,
    style: { display: "block", flexShrink: 0 },
  } as const;

  if (!earned) {
    const fill = "var(--seal-empty-fill, var(--border))";
    const ring = "var(--seal-empty-ring, var(--border-strong))";
    return (
      <svg {...svgProps}>
        <path d={EDGE} fill={fill} stroke={ring} strokeOpacity={0.55} strokeWidth={1} />
        <circle cx="50" cy="50" r="33" fill="none" stroke={ring} strokeWidth={1.4} strokeDasharray="3 3.2" strokeLinecap="round" />
        <path d={icon} transform={ICON} fill="var(--seal-empty-bean, var(--faint))" opacity={0.8} />
      </svg>
    );
  }

  const metal = LEVEL_METAL[tier ?? "bronze"];
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id={`${id}f`} x1="0.2" y1="0.05" x2="0.8" y2="0.95">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.55" stopColor={metal.face} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0.2" y1="0.05" x2="0.8" y2="0.95">
          <stop offset="0" stopColor={metal.dark} />
          <stop offset="0.5" stopColor={metal.face} />
          <stop offset="1" stopColor={metal.light} />
        </linearGradient>
      </defs>
      <path d={EDGE} fill={`url(#${id}r)`} stroke={metal.deep} strokeOpacity={0.35} strokeWidth={1} />
      <circle cx="50" cy="50" r="36" fill={`url(#${id}f)`} stroke={metal.dark} strokeOpacity={0.5} strokeWidth={1.2} />
      <path d={icon} transform={ICON} fill={metal.deep} />
    </svg>
  );
}

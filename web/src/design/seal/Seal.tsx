import { isEthiopic } from "../script";
import { initialsFor } from "./initials";
import { LEVEL_PAINT, type StampLevel } from "./levels";

type Props = {
  name: string;
  nameAm: string;
  /** null until the shop is stamped. */
  level: StampLevel | null;
  size: number;
  /** Prefer the Amharic name for the initials. */
  amharic?: boolean;
  rotation?: number;
  /** Overrides the default "{name}, {level} stamp" label. */
  label?: string;
  decorative?: boolean;
};

/**
 * The small stamp seal, a port of mobile/src/design/components/Seal.tsx in the
 * canvas's 100-unit geometry. Earned seals are filled metal; unearned ones are
 * dashed outlines, because visible absence is the completion hook. Use at 60px
 * or smaller; the hero stamp is InkStamp.
 */
export function Seal({ name, nameAm, level, size, amharic = false, rotation = 0, label, decorative = false }: Props) {
  const paint = level ? LEVEL_PAINT[level] : null;
  const source = amharic && isEthiopic(nameAm) ? nameAm : name;
  const initials = initialsFor(source);
  const ethiopic = isEthiopic(initials);
  const fs = ethiopic ? (initials.length > 2 ? 21 : 25) : 27;
  const print = paint ? paint.ink : "var(--faint)";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label ?? (level ? `${name}, ${level} stamp` : `${name}, not stamped yet`)}
      style={{ display: "block", flexShrink: 0, transform: rotation ? `rotate(${rotation}deg)` : undefined }}
    >
      <circle cx="50" cy="50" r="47" fill={paint ? paint.paper : "var(--raised)"} />
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="none"
        strokeLinecap="round"
        stroke={paint ? paint.paper : "var(--border-strong)"}
        strokeWidth={3}
        strokeDasharray={paint ? undefined : "6 5"}
      />
      <circle
        cx="50"
        cy="50"
        r="38.5"
        fill="none"
        strokeLinecap="round"
        stroke={paint ? paint.ink : "var(--border-strong)"}
        strokeWidth={1.8}
        strokeDasharray={paint ? "1 4" : undefined}
        opacity={0.75}
      />
      <path d="M39 35c5-5 17-5 22 0-7-2-15-2-22 0Z" fill={print} opacity={0.88} />
      <path d="M41 67c5 4 13 4 18 0-6 2-12 2-18 0Z" fill={print} opacity={0.88} />
      <text
        x="50"
        y={50 + fs * 0.36}
        textAnchor="middle"
        fontWeight={700}
        fill={print}
        fontSize={fs}
        fontFamily={ethiopic ? "'Noto Serif Ethiopic', serif" : "Geist, sans-serif"}
      >
        {initials}
      </text>
    </svg>
  );
}

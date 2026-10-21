import { useId } from "react";
import {
  CENTER,
  INK,
  LAYOUT,
  RING_TEXT,
  RINGS,
  TEXT_ARC,
  VIEWBOX,
  inkNoiseSeed,
  nameFontSize,
  type InkLevel,
} from "./geometry";

type Props = {
  /** Latin name, printed in capitals. */
  name: string;
  /** The Amharic line: name, then neighbourhood. */
  amharic: string;
  /** Already formatted, e.g. "21 OCT 2026" or "YOUR STAMP". */
  date: string;
  level: InkLevel;
  size: number;
  rotation?: number;
  label: string;
};

/**
 * The passport stamp (handoff, InkStamp). Fractal-noise speckle masks the ink,
 * then a low-frequency displacement adds wobble, both seeded from the shop
 * name so the print never changes between renders. Use at 90px or larger;
 * below that use Seal.
 */
export function InkStamp({ name, amharic, date, level, size, rotation = 0, label }: Props) {
  const id = `ink${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ink = INK[level];
  const earned = level !== "none";
  const noise = inkNoiseSeed(name);
  const title = name.toUpperCase();

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      style={{ display: "block", overflow: "visible", flexShrink: 0, transform: `rotate(${rotation}deg)` }}
    >
      <defs>
        <path id={`${id}a`} d={TEXT_ARC} />
        <filter id={`${id}f`} x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={noise} result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.1" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={1} seed={noise} result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#${id}f)`} fill={ink}>
        {RINGS.map((ring) => (
          <circle
            key={ring.r}
            cx={CENTER}
            cy={CENTER}
            r={ring.r}
            fill="none"
            stroke={ink}
            strokeWidth={ring.width}
            strokeDasharray={earned ? undefined : ring.dash}
          />
        ))}
        <text fontFamily="Geist Mono, monospace" fontSize={LAYOUT.ringText.size} letterSpacing={LAYOUT.ringText.letterSpacing}>
          <textPath href={`#${id}a`}>{RING_TEXT}</textPath>
        </text>
        <text
          x={CENTER}
          y={LAYOUT.name.y}
          textAnchor="middle"
          fontFamily="Geist, sans-serif"
          fontWeight={700}
          letterSpacing={LAYOUT.name.letterSpacing}
          fontSize={nameFontSize(title)}
        >
          {title}
        </text>
        <text
          x={CENTER}
          y={LAYOUT.amharic.y}
          textAnchor="middle"
          fontFamily="Noto Serif Ethiopic, serif"
          fontWeight={700}
          fontSize={LAYOUT.amharic.size}
        >
          {amharic}
        </text>
        <line x1={LAYOUT.rule.x1} y1={LAYOUT.rule.y} x2={LAYOUT.rule.x2} y2={LAYOUT.rule.y} stroke={ink} strokeWidth={LAYOUT.rule.width} />
        <text
          x={CENTER}
          y={LAYOUT.date.y}
          textAnchor="middle"
          fontFamily="Geist Mono, monospace"
          fontSize={LAYOUT.date.size}
          letterSpacing={LAYOUT.date.letterSpacing}
        >
          {date}
        </text>
      </g>
    </svg>
  );
}

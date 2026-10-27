import { useId } from "react";
import {
  BEAN,
  CENTER,
  EMPTY_RINGS,
  EMPTY_TEXT,
  INK,
  LAYOUT,
  RING_DOTS,
  RINGS,
  VIEWBOX,
  amharicFontSize,
  inkNoiseSeed,
  nameBaselines,
  nameLayout,
  ringGlyphs,
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

const GLYPHS = ringGlyphs();

/**
 * The passport stamp (handoff, InkStamp). Fractal-noise speckle masks the ink,
 * then a low-frequency displacement adds wobble, both seeded from the shop
 * name so the print never changes between renders. An unearned stamp is the
 * empty slot: dashed rings and the shop's words, no ring band. Use at 90px or
 * larger; below that use Seal.
 */
export function InkStamp({ name, amharic, date, level, size, rotation = 0, label }: Props) {
  const id = `ink${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const earned = level !== "none";
  const ink = INK[level];
  const words = earned ? ink : EMPTY_TEXT;
  const noise = inkNoiseSeed(name);
  const title = nameLayout(name.toUpperCase());
  const rows = title.lines.length > 1 ? LAYOUT.two : LAYOUT.one;
  const baselines = nameBaselines(title);

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
        <filter id={`${id}f`} x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={noise} result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.1" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={1} seed={noise} result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={earned ? `url(#${id}f)` : undefined} fill={words}>
        {(earned ? RINGS : EMPTY_RINGS).map((ring) => (
          <circle
            key={ring.r}
            cx={CENTER}
            cy={CENTER}
            r={ring.r}
            fill="none"
            stroke={ink}
            strokeWidth={ring.width}
            strokeDasharray={earned && !ring.dotted ? undefined : ring.dash}
          />
        ))}
        {earned ? (
          <>
            {GLYPHS.map((glyph, i) => (
              <text
                key={i}
                x={glyph.x}
                y={glyph.y}
                transform={`rotate(${glyph.rotate} ${glyph.x} ${glyph.y})`}
                textAnchor="middle"
                fontFamily="Geist Mono, Noto Sans Ethiopic, monospace"
                fontSize={glyph.size}
              >
                {glyph.char}
              </text>
            ))}
            {RING_DOTS.map((dot) => (
              <circle key={dot.x} cx={dot.x} cy={dot.y} r={dot.r} />
            ))}
          </>
        ) : null}
        <path d={BEAN.path} transform={BEAN.transform} />
        {title.lines.map((line, i) => (
          <text
            key={i}
            x={CENTER}
            y={baselines[i]}
            textAnchor="middle"
            fontFamily="Geist, sans-serif"
            fontWeight={700}
            letterSpacing={LAYOUT.name.letterSpacing}
            fontSize={title.size}
          >
            {line}
          </text>
        ))}
        <text
          x={CENTER}
          y={rows.amharic}
          textAnchor="middle"
          fontFamily="Noto Serif Ethiopic, serif"
          fontWeight={700}
          fontSize={amharicFontSize(amharic)}
        >
          {amharic}
        </text>
        <line x1={LAYOUT.rule.x1} y1={rows.rule} x2={LAYOUT.rule.x2} y2={rows.rule} stroke={words} strokeWidth={LAYOUT.rule.width} />
        <text
          x={CENTER}
          y={rows.date}
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

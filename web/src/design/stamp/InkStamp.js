import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useId } from "react";
import { BEAN, CENTER, EMPTY_RINGS, EMPTY_TEXT, INK, LAYOUT, RING_DOTS, RINGS, VIEWBOX, amharicFontSize, inkNoiseSeed, nameBaselines, nameLayout, ringGlyphs, } from "./geometry";
const GLYPHS = ringGlyphs();
/**
 * The passport stamp (handoff, InkStamp). Fractal-noise speckle masks the ink,
 * then a low-frequency displacement adds wobble, both seeded from the shop
 * name so the print never changes between renders. An unearned stamp is the
 * empty slot: dashed rings and the shop's words, no ring band. Use at 90px or
 * larger; below that use Seal.
 */
export function InkStamp({ name, amharic, date, level, size, rotation = 0, label }) {
    const id = `ink${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    const earned = level !== "none";
    const ink = INK[level];
    const words = earned ? ink : EMPTY_TEXT;
    const noise = inkNoiseSeed(name);
    const title = nameLayout(name.toUpperCase());
    const rows = title.lines.length > 1 ? LAYOUT.two : LAYOUT.one;
    const baselines = nameBaselines(title);
    return (_jsxs("svg", { viewBox: `0 0 ${VIEWBOX} ${VIEWBOX}`, width: size, height: size, role: "img", "aria-label": label, style: { display: "block", overflow: "visible", flexShrink: 0, transform: `rotate(${rotation}deg)` }, children: [_jsx("defs", { children: _jsxs("filter", { id: `${id}f`, x: "-6%", y: "-6%", width: "112%", height: "112%", children: [_jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.85", numOctaves: 2, seed: noise, result: "speck" }), _jsx("feColorMatrix", { in: "speck", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.1", result: "mask" }), _jsx("feComposite", { in: "SourceGraphic", in2: "mask", operator: "in", result: "inked" }), _jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.035", numOctaves: 1, seed: noise, result: "warp" }), _jsx("feDisplacementMap", { in: "inked", in2: "warp", scale: "2.6", xChannelSelector: "R", yChannelSelector: "G" })] }) }), _jsxs("g", { filter: earned ? `url(#${id}f)` : undefined, fill: words, children: [(earned ? RINGS : EMPTY_RINGS).map((ring) => (_jsx("circle", { cx: CENTER, cy: CENTER, r: ring.r, fill: "none", stroke: ink, strokeWidth: ring.width, strokeDasharray: earned && !ring.dotted ? undefined : ring.dash }, ring.r))), earned ? (_jsxs(_Fragment, { children: [GLYPHS.map((glyph, i) => (_jsx("text", { x: glyph.x, y: glyph.y, transform: `rotate(${glyph.rotate} ${glyph.x} ${glyph.y})`, textAnchor: "middle", fontFamily: "Geist Mono, Noto Sans Ethiopic, monospace", fontSize: glyph.size, children: glyph.char }, i))), RING_DOTS.map((dot) => (_jsx("circle", { cx: dot.x, cy: dot.y, r: dot.r }, dot.x)))] })) : null, _jsx("path", { d: BEAN.path, transform: BEAN.transform }), title.lines.map((line, i) => (_jsx("text", { x: CENTER, y: baselines[i], textAnchor: "middle", fontFamily: "Geist, sans-serif", fontWeight: 700, letterSpacing: LAYOUT.name.letterSpacing, fontSize: title.size, children: line }, i))), _jsx("text", { x: CENTER, y: rows.amharic, textAnchor: "middle", fontFamily: "Noto Serif Ethiopic, serif", fontWeight: 700, fontSize: amharicFontSize(amharic), children: amharic }), _jsx("line", { x1: LAYOUT.rule.x1, y1: rows.rule, x2: LAYOUT.rule.x2, y2: rows.rule, stroke: words, strokeWidth: LAYOUT.rule.width }), _jsx("text", { x: CENTER, y: rows.date, textAnchor: "middle", fontFamily: "Geist Mono, monospace", fontSize: LAYOUT.date.size, letterSpacing: LAYOUT.date.letterSpacing, children: date })] })] }));
}

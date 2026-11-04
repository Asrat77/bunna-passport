import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useId, useMemo } from "react";
import { generateDoodle } from "./generate";
import { EARRINGS_COLOR, EYE_COLORS, EYE_WHITE, HAIR_COLORS, HAT_COLORS, HEADPHONES_COLOR, INK_COLORS, SKIN_COLORS, } from "./traits";
const GRAPHITE = "#3A3733";
const BLUSH = "#C8664A";
/** Close-ups the editor uses for its option tiles, in the 100 viewBox. */
const CROPS = {
    full: "0 0 100 100",
    top: "8 -2 84 84",
    eyes: "20 26 60 60",
    lower: "14 40 72 72",
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
export function Doodle({ seed, mood, size, traits, background = "mood", crop = "full", label, rough = true, decorative = false }) {
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
    const or = (d) => d || "M0 0";
    const wobble = rough ? `url(#${id}w)` : undefined;
    const pencil = rough ? `url(#${id}p)` : undefined;
    const t = paths.traits;
    const skin = SKIN_COLORS[t.skin];
    const ink = INK_COLORS[t.skin];
    const hairTint = HAIR_COLORS[t.hair_color];
    const topTint = paths.topIsHat ? HAT_COLORS[t.hat] : hairTint;
    const tinted = (fill) => fill !== "none";
    // Under coloured hair the hatching lightens so the colour reads.
    const hatchOpacity = (fill) => (tinted(fill) ? 0.35 : 1);
    const crossOpacity = (fill) => (tinted(fill) ? 0 : 0.8);
    // Eye whites only show against coloured skin; on paper they'd be invisible anyway.
    const whites = t.skin === "paper" ? "" : paths.whites;
    return (_jsxs("svg", { viewBox: CROPS[crop], width: size, height: size, role: decorative ? undefined : "img", "aria-hidden": decorative || undefined, "aria-label": decorative ? undefined : label ?? (awake ? "Your profile picture, awake after coffee" : "Your profile picture, sleepy before coffee"), style: { display: "block", overflow: crop === "full" ? "visible" : "hidden", flexShrink: 0 }, children: [_jsxs("defs", { children: [_jsxs("filter", { id: `${id}w`, x: "-15%", y: "-15%", width: "130%", height: "130%", children: [_jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.035", numOctaves: 2, seed: noiseSeed, result: "warp" }), _jsx("feDisplacementMap", { in: "SourceGraphic", in2: "warp", scale: "2.4", xChannelSelector: "R", yChannelSelector: "G" })] }), _jsxs("filter", { id: `${id}p`, x: "-15%", y: "-15%", width: "130%", height: "130%", children: [_jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.035", numOctaves: 2, seed: noiseSeed, result: "warp" }), _jsx("feDisplacementMap", { in: "SourceGraphic", in2: "warp", scale: "2.4", xChannelSelector: "R", yChannelSelector: "G", result: "wobbly" }), _jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "1.7", numOctaves: 1, seed: 3, result: "grain" }), _jsx("feColorMatrix", { in: "grain", type: "matrix", values: grainMatrix, result: "grainAlpha" }), _jsx("feComposite", { in: "wobbly", in2: "grainAlpha", operator: "in" })] }), _jsx("pattern", { id: `${id}h`, patternUnits: "userSpaceOnUse", width: "2.3", height: "2.3", patternTransform: "rotate(38)", children: _jsx("line", { x1: "0.6", y1: "0", x2: "0.6", y2: "2.3", stroke: GRAPHITE, strokeWidth: "1.05" }) }), _jsx("pattern", { id: `${id}x`, patternUnits: "userSpaceOnUse", width: "3.2", height: "3.2", patternTransform: "rotate(-48)", children: _jsx("line", { x1: "0.6", y1: "0", x2: "0.6", y2: "3.2", stroke: GRAPHITE, strokeWidth: "0.8" }) })] }), background === "mood" ? (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "50", cy: "50", r: "50", fill: awake ? "var(--accent-soft)" : "var(--sunken)" }), _jsx("circle", { cx: "50", cy: "50", r: small ? 47.8 : 48.7, fill: "none", strokeLinecap: "round", stroke: awake ? "var(--accent)" : "var(--border-strong)", strokeWidth: small ? 4.5 : 2.6, strokeDasharray: awake ? undefined : small ? "7 6" : "5 4.5" })] })) : null, paths.hairBack ? (_jsxs(_Fragment, { children: [_jsx("g", { filter: wobble, children: tinted(hairTint) ? _jsx("path", { d: paths.hairBack, fill: hairTint }) : null }), _jsxs("g", { filter: pencil, fill: "none", stroke: GRAPHITE, strokeWidth: swThin, strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: paths.hairBack, fill: `url(#${id}h)`, fillOpacity: hatchOpacity(hairTint) }), _jsx("path", { d: paths.hairBack, fill: `url(#${id}x)`, stroke: "none", opacity: crossOpacity(hairTint) })] })] })) : null, _jsxs("g", { filter: wobble, children: [_jsx("path", { d: or(paths.earsFill), fill: skin }), _jsx("path", { d: paths.head, fill: skin }), tinted(hairTint) && paths.hairShade ? _jsx("path", { d: paths.hairShade, fill: hairTint, opacity: 0.7 }) : null, tinted(topTint) && paths.hairFill ? _jsx("path", { d: paths.hairFill, fill: topTint }) : null, tinted(hairTint) && paths.facialHair ? _jsx("path", { d: paths.facialHair, fill: hairTint }) : null, whites ? _jsx("path", { d: whites, fill: EYE_WHITE }) : null] }), _jsxs("g", { filter: pencil, fill: "none", stroke: ink, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: or(paths.hairFill), fill: `url(#${id}h)`, fillOpacity: hatchOpacity(topTint), strokeWidth: swThin }), _jsx("path", { d: or(paths.hairFill), fill: `url(#${id}x)`, stroke: "none", opacity: crossOpacity(topTint) }), _jsx("path", { d: paths.neck }), _jsx("path", { d: or(paths.earsStroke) }), _jsx("path", { d: paths.headStroke }), _jsx("path", { d: or(paths.hairLine) }), tinted(hairTint) && !paths.topIsHat && paths.hairLine ? (_jsx("path", { d: paths.hairLine, stroke: EYE_WHITE, strokeWidth: swThin * 0.55, opacity: 0.4, transform: "translate(0.45 0.45)" })) : null, paths.facialHair ? (_jsx("path", { d: paths.facialHair, fill: `url(#${id}h)`, fillOpacity: hatchOpacity(hairTint), strokeWidth: swThin })) : null, _jsx("path", { d: paths.brows }), _jsx("path", { d: or(paths.eyes) }), _jsx("path", { d: or(paths.pupils), fill: EYE_COLORS[t.eye_color], stroke: "none" }), paths.pupilCores ? _jsx("path", { d: paths.pupilCores, fill: ink, stroke: "none" }) : null, _jsx("path", { d: paths.nose }), _jsx("path", { d: paths.mouth, fill: paths.mouthHatched ? `url(#${id}h)` : "none" }), _jsx("path", { d: or(paths.glasses) }), _jsx("path", { d: or(paths.dots), fill: ink, stroke: "none" }), _jsx("path", { d: paths.extra, strokeWidth: swThin })] }), _jsxs("g", { filter: pencil, fill: "none", stroke: ink, strokeWidth: sw2, strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.42, transform: "translate(0.8 -0.6) rotate(-1.2 50 55)", children: [_jsx("path", { d: paths.headStroke }), _jsx("path", { d: paths.neck }), _jsx("path", { d: or(paths.hairLine) }), _jsx("path", { d: paths.brows }), _jsx("path", { d: or(paths.eyes) }), _jsx("path", { d: paths.nose }), _jsx("path", { d: paths.mouthLine }), _jsx("path", { d: or(paths.glasses) })] }), _jsx("g", { filter: pencil, fill: "none", stroke: BLUSH, strokeWidth: swThin, strokeLinecap: "round", opacity: 0.6, children: _jsx("path", { d: or(paths.cheeks) }) }), paths.lenses || paths.headphonesCups || paths.earringsFill || paths.earringsLine ? (_jsxs(_Fragment, { children: [_jsxs("g", { filter: wobble, children: [paths.lenses ? _jsx("path", { d: paths.lenses, fill: ink }) : null, paths.headphonesCups ? _jsx("path", { d: paths.headphonesCups, fill: HEADPHONES_COLOR }) : null, paths.earringsFill ? _jsx("path", { d: paths.earringsFill, fill: EARRINGS_COLOR }) : null] }), _jsxs("g", { filter: pencil, fill: "none", stroke: ink, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", children: [paths.lenses ? _jsx("path", { d: paths.lenses }) : null, paths.lensGlints ? _jsx("path", { d: paths.lensGlints, stroke: EYE_WHITE, strokeWidth: swThin, opacity: 0.75 }) : null, paths.headphonesBand ? (_jsxs(_Fragment, { children: [_jsx("path", { d: paths.headphonesBand, strokeWidth: sw + 3.2 }), _jsx("path", { d: paths.headphonesBand, stroke: HEADPHONES_COLOR, strokeWidth: 3.2 })] })) : null, paths.headphonesCups ? _jsx("path", { d: paths.headphonesCups }) : null, paths.earringsLine ? _jsx("path", { d: paths.earringsLine, stroke: EARRINGS_COLOR, strokeWidth: sw * 0.9 }) : null] })] })) : null] }));
}

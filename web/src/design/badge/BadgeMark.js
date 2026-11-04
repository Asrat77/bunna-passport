import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
import { LEVEL_METAL } from "@/design/seal/levels";
import { phCoffee, phPencilSimple, phStamp } from "@/ui/icons";
/** Artwork by what the badge counts: cups, stamps, or things you put on the map. */
function artwork(key) {
    if (key.includes("contribution"))
        return phPencilSimple;
    if (key.includes("shop"))
        return phStamp;
    return phCoffee;
}
/** A milled rosette, so a badge never reads as a café's round stamp seal. */
function rosette(lobes, outer, inner) {
    const step = (Math.PI * 2) / lobes;
    const at = (angle, r) => `${(50 + r * Math.sin(angle)).toFixed(2)} ${(50 - r * Math.cos(angle)).toFixed(2)}`;
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
export function BadgeMark({ artworkKey, tier, earned, size, label }) {
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
    };
    if (!earned) {
        const fill = "var(--seal-empty-fill, var(--border))";
        const ring = "var(--seal-empty-ring, var(--border-strong))";
        return (_jsxs("svg", { ...svgProps, children: [_jsx("path", { d: EDGE, fill: fill, stroke: ring, strokeOpacity: 0.55, strokeWidth: 1 }), _jsx("circle", { cx: "50", cy: "50", r: "33", fill: "none", stroke: ring, strokeWidth: 1.4, strokeDasharray: "3 3.2", strokeLinecap: "round" }), _jsx("path", { d: icon, transform: ICON, fill: "var(--seal-empty-bean, var(--faint))", opacity: 0.8 })] }));
    }
    const metal = LEVEL_METAL[tier ?? "bronze"];
    return (_jsxs("svg", { ...svgProps, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: `${id}f`, x1: "0.2", y1: "0.05", x2: "0.8", y2: "0.95", children: [_jsx("stop", { offset: "0", stopColor: metal.light }), _jsx("stop", { offset: "0.55", stopColor: metal.face }), _jsx("stop", { offset: "1", stopColor: metal.dark })] }), _jsxs("linearGradient", { id: `${id}r`, x1: "0.2", y1: "0.05", x2: "0.8", y2: "0.95", children: [_jsx("stop", { offset: "0", stopColor: metal.dark }), _jsx("stop", { offset: "0.5", stopColor: metal.face }), _jsx("stop", { offset: "1", stopColor: metal.light })] })] }), _jsx("path", { d: EDGE, fill: `url(#${id}r)`, stroke: metal.deep, strokeOpacity: 0.35, strokeWidth: 1 }), _jsx("circle", { cx: "50", cy: "50", r: "36", fill: `url(#${id}f)`, stroke: metal.dark, strokeOpacity: 0.5, strokeWidth: 1.2 }), _jsx("path", { d: icon, transform: ICON, fill: metal.deep })] }));
}

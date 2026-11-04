import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useState } from "react";
import { phCheck, phWarning } from "@/ui/icons";
import { ACCURACY_LIMIT_METERS, CHECK_IN_RANGE_METERS, bearing } from "@/data/checkin";
import { useI18n } from "@/i18n/context";
import { formatMeters } from "@/lib/distance";
import { useMapStyle } from "@/screens/map/useMapStyle";
import { Icon } from "@/ui/Icon";
// MapLibre is most of the bundle, so the sketch shows until it has loaded.
const CheckInMap = lazy(() => import("./CheckInMap"));
const W = 358;
const H = 180;
const CX = 179;
const CY = 96;
const RANGE_R = 80;
const OUTSIDE_R = 86;
/**
 * The check-in radar (DESIGN.md §5.3): the real map round you with the 250 m
 * range on it. Until MapLibre loads, or where no map is configured or it
 * fails, the drawn sketch below stands in. Your GPS accuracy sits on top.
 */
export function Radar({ fix, candidates, selectedId }) {
    const { t } = useI18n();
    const styleUrl = useMapStyle();
    const [mapFailed, setMapFailed] = useState(false);
    const good = fix.accuracyMeters <= ACCURACY_LIMIT_METERS;
    const description = t("checkin.radar", {
        list: candidates
            .map((c) => t("checkin.radarEntry", { shop: c.shop.name, distance: formatMeters(c.distance) }))
            .join(", "),
    });
    const sketch = _jsx(RadarSketch, { fix: fix, candidates: candidates, selectedId: selectedId, description: description });
    const showMap = styleUrl && !mapFailed;
    return (_jsxs("div", { className: "radar card", children: [showMap ? (_jsx(Suspense, { fallback: sketch, children: _jsx(CheckInMap, { fix: fix, candidates: candidates, selectedId: selectedId, styleUrl: styleUrl, description: description, onFail: () => setMapFailed(true) }) })) : (sketch), _jsxs("span", { className: good ? "radar__accuracy mono" : "radar__accuracy radar__accuracy--weak mono", children: [_jsx(Icon, { path: good ? phCheck : phWarning, size: 14 }), t(good ? "checkin.goodSignal" : "checkin.weakSignal", { meters: fix.accuracyMeters })] })] }));
}
/**
 * The drawn radar: the 250 m range and its half as dashed
 * rings, a sweep, you in the middle with your accuracy as a halo, and a pin
 * per candidate placed by real bearing and distance. Shops out of range sit
 * greyed at the edge.
 */
function RadarSketch({ fix, candidates, selectedId, description }) {
    const { t } = useI18n();
    const halo = Math.max(9, Math.min(RANGE_R, (fix.accuracyMeters / CHECK_IN_RANGE_METERS) * RANGE_R));
    const at = fix;
    const pins = candidates.map((candidate) => {
        const r = candidate.inRange ? (candidate.distance / CHECK_IN_RANGE_METERS) * RANGE_R : OUTSIDE_R;
        const angle = bearing(at, candidate.shop);
        return {
            candidate,
            x: Math.max(14, Math.min(W - 14, CX + Math.sin(angle) * r)),
            y: Math.max(14, Math.min(H - 22, CY - Math.cos(angle) * r)),
        };
    });
    // Label the selected shop first, then any others that still fit; a crowded
    // corner keeps its dots and the list below names them.
    const labels = new Map();
    const placed = [
        { left: CX - 22, right: CX + 22, top: CY + 10, bottom: CY + 26 },
    ];
    const order = [...pins].sort((a, b) => Number(b.candidate.shop.id === selectedId) - Number(a.candidate.shop.id === selectedId));
    for (const { candidate, x, y } of order) {
        const text = candidate.inRange ? candidate.shop.name : `${candidate.shop.name} · ${formatMeters(candidate.distance)}`;
        const half = (text.length * 6.4) / 2;
        const lx = Math.max(half + 4, Math.min(W - half - 4, x));
        const ly = y > CY ? y + (candidate.inRange ? 24 : 20) : y - (candidate.inRange ? 15 : 12);
        const box = { left: lx - half, right: lx + half, top: ly - 12, bottom: ly + 3 };
        if (box.top < 0 || box.bottom > H)
            continue;
        if (placed.some((o) => box.left < o.right && box.right > o.left && box.top < o.bottom && box.bottom > o.top))
            continue;
        placed.push(box);
        labels.set(candidate.shop.id, { x: lx, y: ly, text });
    }
    return (_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": description, className: "radar__svg", children: [_jsx("circle", { cx: CX, cy: CY, r: RANGE_R, fill: "none", stroke: "var(--border-strong)", strokeWidth: 1.5, strokeDasharray: "4 5" }), _jsx("circle", { cx: CX, cy: CY, r: RANGE_R / 2, fill: "none", stroke: "var(--border)", strokeWidth: 1.5, strokeDasharray: "4 5" }), _jsx("path", { className: "radar__sweep", d: `M${CX} ${CY}L${CX} ${CY - RANGE_R}A${RANGE_R} ${RANGE_R} 0 0 1 ${CX + 69} ${CY - 40}Z`, fill: "var(--primary)", opacity: 0.16 }), pins.map(({ candidate, x, y }) => {
                const label = labels.get(candidate.shop.id);
                return candidate.inRange ? (_jsxs("g", { children: [_jsx("circle", { cx: x, cy: y, r: candidate.shop.id === selectedId ? 10 : 9, fill: "var(--primary)" }), candidate.shop.id === selectedId ? _jsx("circle", { cx: x, cy: y, r: 4, fill: "var(--raised)" }) : null, label ? (_jsx("text", { x: label.x, y: label.y, textAnchor: "middle", fontSize: 11.5, fontWeight: 600, fill: "var(--ink)", children: label.text })) : null] }, candidate.shop.id)) : (_jsxs("g", { children: [_jsx("circle", { cx: x, cy: y, r: 6, fill: "var(--border-strong)" }), label ? (_jsx("text", { x: label.x, y: label.y, textAnchor: "middle", fontSize: 11, fill: "var(--faint)", children: label.text })) : null] }, candidate.shop.id));
            }), _jsx("circle", { cx: CX, cy: CY, r: halo, fill: "var(--accent)", opacity: 0.3 }), _jsx("circle", { cx: CX, cy: CY, r: 5, fill: "var(--ink)", stroke: "var(--raised)", strokeWidth: 2 }), _jsx("text", { x: CX, y: CY + 22, textAnchor: "middle", fontFamily: "Geist Mono, monospace", fontSize: 10.5, fill: "var(--muted)", children: t("checkin.you") })] }));
}

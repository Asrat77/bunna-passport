import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Three cells in one raised card, a mono value over a small label. */
export function StatStrip({ stats }) {
    return (_jsx("dl", { className: "stat-strip", children: stats.map((stat) => (_jsxs("div", { className: "stat-strip__cell", children: [_jsx("dd", { className: "stat-strip__value mono", children: stat.value }), _jsx("dt", { className: "stat-strip__label", children: stat.label })] }, stat.label))) }));
}

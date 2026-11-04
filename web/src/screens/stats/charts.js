import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useI18n } from "@/i18n/context";
/**
 * Upright bars for a rhythm: hours, weekdays, months. One hue; the tallest
 * bar is picked out until you tap another, and the line underneath reads out
 * whichever is picked, so no number depends on colour alone.
 */
export function ColumnChart({ columns, title, describePeak, }) {
    const { t } = useI18n();
    const max = Math.max(...columns.map((column) => column.value));
    const peak = columns.findIndex((column) => column.value === max);
    const [picked, setPicked] = useState(null);
    const shown = picked ?? peak;
    const caption = max === 0
        ? t("stats.quiet")
        : picked === null
            ? describePeak(columns[peak])
            : t("stats.barValue", { label: columns[picked].label, count: columns[picked].value.toLocaleString() });
    return (_jsxs("figure", { className: "columns", children: [_jsx("figcaption", { className: "columns__title", children: title }), _jsx("div", { className: "columns__plot", style: { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }, children: columns.map((column, index) => (_jsx("button", { type: "button", className: "columns__hit", "aria-pressed": max > 0 && index === shown, "aria-label": t("stats.barValue", { label: column.label, count: column.value }), onClick: () => setPicked(picked === index ? null : index), children: _jsx("span", { className: "columns__bar", style: { height: max > 0 ? `${Math.max((column.value / max) * 100, column.value > 0 ? 4 : 0)}%` : 0 } }) }, column.label))) }), _jsx("div", { className: "columns__axis", style: { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }, "aria-hidden": "true", children: columns.map((column) => (_jsx("span", { children: column.tick === false ? "" : column.label }, column.label))) }), _jsx("p", { className: "columns__caption mono", "aria-live": "polite", children: caption })] }));
}
/** A ranked list where each row's bar is its share of the top row. */
export function BarList({ rows, onOpen }) {
    const most = Math.max(1, ...rows.map((row) => row.value));
    return (_jsx("ol", { className: "bar-list", children: rows.map((row, index) => {
            const body = (_jsxs(_Fragment, { children: [_jsx("span", { className: "bar-list__rank mono", children: index + 1 }), _jsxs("span", { className: "bar-list__text", children: [_jsx("span", { className: "bar-list__label", children: row.label }), row.note ? _jsx("span", { className: "bar-list__note", children: row.note }) : null, _jsx("span", { className: "bar-list__track", children: _jsx("span", { className: "bar-list__fill", style: { width: `${(row.value / most) * 100}%` } }) })] }), _jsx("span", { className: "bar-list__value mono", children: row.display ?? row.value.toLocaleString() })] }));
            return (_jsx("li", { children: onOpen ? (_jsx("button", { type: "button", className: "bar-list__row", onClick: () => onOpen(row), children: body })) : (_jsx("div", { className: "bar-list__row", children: body })) }, row.key));
        }) }));
}
/** A titled card; the stats pages are a stack of these. */
export function StatCard({ title, aside, children }) {
    return (_jsxs("section", { className: "card stat-card", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { className: "stat-card__title", children: title }), aside ? _jsx("span", { className: "stat-card__aside mono", children: aside }) : null] }), children] }));
}
/** Two-up cells: a big number, what it counts, and an optional note. */
export function FactGrid({ facts }) {
    return (_jsx("dl", { className: "fact-grid", children: facts.map((fact) => (_jsxs("div", { className: "fact-grid__cell", children: [_jsx("dt", { className: "fact-grid__label", children: fact.label }), _jsx("dd", { className: "fact-grid__value mono", children: fact.value }), fact.note ? _jsx("dd", { className: "fact-grid__note", children: fact.note }) : null] }, fact.label))) }));
}
/** A filled track with its reading on the right. */
export function Meter({ percent, label }) {
    return (_jsxs("div", { className: "meter", role: "img", "aria-label": label, children: [_jsx("div", { className: "meter__fill", style: { width: `${Math.min(100, Math.max(percent, percent > 0 ? 2 : 0))}%` } }), _jsx("span", { className: "mono", children: label })] }));
}
/** Hour, weekday and month columns, labelled for the current language. */
export function useRhythmColumns() {
    const { t, language } = useI18n();
    const hours = (counts) => counts.map((value, hour) => ({
        label: t("stats.hourLabel", { hour: String(hour).padStart(2, "0") }),
        value,
        tick: hour % 6 === 0,
    }));
    const weekdays = (counts) => counts.map((value, day) => ({ label: t(`stats.day.${day}`), value }));
    const months = (rows) => rows.map(({ month, cups }) => ({
        label: new Date(`${month}-15T12:00:00Z`).toLocaleDateString(language === "am" ? "am-ET" : "en-GB", { month: "short" }),
        value: cups,
    }));
    const dayName = (label) => {
        const index = weekdays(Array(7).fill(0)).findIndex((column) => column.label === label);
        return t(`stats.dayLong.${index}`);
    };
    return { hours, weekdays, months, dayName };
}

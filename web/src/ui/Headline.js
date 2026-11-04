import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The two-tone headline on every main screen: two lines, the second in
 * primary ("Where's your / first cup?"). `oneLine` sets both halves on one
 * line, as Explore does.
 */
export function Headline({ first, second, size = 34, align = "left", as: Tag = "h1", oneLine = false, }) {
    return (_jsxs(Tag, { className: oneLine ? "headline headline--one-line" : "headline", style: { fontSize: size, textAlign: align }, children: [first, oneLine ? " " : _jsx("br", {}), _jsx("span", { className: "headline__second", children: second })] }));
}

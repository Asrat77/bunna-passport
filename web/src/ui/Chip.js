import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** A filter or segment chip; selected is ink on surface. */
export function FilterChip({ selected, onClick, children, }) {
    return (_jsx("button", { type: "button", className: "chip chip--filter", "aria-pressed": selected, onClick: onClick, children: children }));
}
export function TagChip({ children }) {
    return _jsx("span", { className: "chip chip--tag", children: children });
}
/** The dashed "add something" chip: Suggest edit, Note. */
export function AddChip({ onClick, icon, children, pressed }) {
    return (_jsxs("button", { type: "button", className: "chip chip--add", onClick: onClick, "aria-pressed": pressed, children: [icon, children] }));
}

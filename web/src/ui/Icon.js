import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Phosphor icons (DESIGN.md §2.4), drawn from the paths in ./icons so only the
 * icons used end up in the bundle.
 */
export function Icon({ path, size = 22, label }) {
    return (_jsx("svg", { viewBox: "0 0 256 256", width: size, height: size, fill: "currentColor", role: label ? "img" : undefined, "aria-label": label, "aria-hidden": label ? undefined : true, style: { display: "block", flexShrink: 0 }, children: _jsx("path", { d: path }) }));
}

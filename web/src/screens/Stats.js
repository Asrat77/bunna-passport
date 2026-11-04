import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { Dock } from "@/ui/Dock";
import { BoardsSection } from "./stats/BoardsSection";
import { CitySection } from "./stats/CitySection";
import { FriendsSection } from "./stats/FriendsSection";
import { YouSection } from "./stats/YouSection";
import "./stats/stats.css";
const SECTIONS = [
    { section: "boards", label: "stats.boards" },
    { section: "friends", label: "stats.friends" },
    { section: "you", label: "stats.you" },
    { section: "city", label: "stats.city" },
];
// The tab unmounts whenever a shop is opened from it, so the last section
// picked is kept here and comes back on Back.
let lastSection = "boards";
/** Opens Friends the next time the tab shows, as after accepting an invite. */
export function showFriendsNext() {
    lastSection = "friends";
}
/**
 * The Stats tab: this week's boards, your friends' visits, your own numbers,
 * and the city's, picked from a switch at the top.
 */
export function Stats() {
    const { t } = useI18n();
    const [section, setSection] = useState(lastSection);
    const pick = (next) => {
        lastSection = next;
        setSection(next);
    };
    return (_jsxs("main", { className: "screen screen--with-dock stats", children: [_jsx("div", { className: "stats-switch", role: "tablist", "aria-label": t("stats.sections"), children: SECTIONS.map(({ section: value, label }) => (_jsx("button", { type: "button", role: "tab", id: `stats-tab-${value}`, "aria-selected": section === value, "aria-controls": "stats-panel", onClick: () => pick(value), children: t(label) }, value))) }), _jsx("div", { className: "stats__panel", id: "stats-panel", role: "tabpanel", "aria-labelledby": `stats-tab-${section}`, children: section === "boards" ? (_jsx(BoardsSection, {})) : section === "friends" ? (_jsx(FriendsSection, {})) : section === "you" ? (_jsx(YouSection, {})) : (_jsx(CitySection, {})) }), _jsx(Dock, {})] }));
}

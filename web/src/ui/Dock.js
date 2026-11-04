import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { phChartBar, phHouse, phPlus, phStamp } from "./icons";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { Icon } from "./Icon";
const TABS = [
    { tab: "explore", icon: phHouse, label: "tab.explore" },
    { tab: "passport", icon: phStamp, label: "tab.passport" },
    { tab: "stats", icon: phChartBar, label: "tab.stats" },
];
/**
 * The navigation dock, in Mocha on every screen (docs/DESIGN.md §2.2.1): a
 * full-width blurred bar with icon tabs on the left, the current one widened
 * into a rounded rectangle, and Check in as a light circle on the right.
 * Tab names stay as the accessible labels.
 */
export function Dock() {
    const { t } = useI18n();
    const { tab: current, switchTab, push } = useNavigation();
    return (_jsxs("div", { className: "dock", children: [_jsx("nav", { className: "dock__tabs", "aria-label": t("dock.label"), children: TABS.map(({ tab, icon, label }) => (_jsx("button", { type: "button", className: "dock__tab", "aria-label": t(label), "aria-current": tab === current ? "page" : undefined, onClick: () => switchTab(tab), children: _jsx(Icon, { path: icon, size: 20 }) }, tab))) }), _jsx("button", { type: "button", className: "dock__checkin", "aria-label": t("checkin.action"), onClick: () => push({ name: "checkin" }), children: _jsx(Icon, { path: phPlus, size: 22 }) })] }));
}

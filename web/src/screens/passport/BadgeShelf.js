import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { badgeText, useBadges } from "@/data/badges";
import { BadgeMark } from "@/design/badge/BadgeMark";
import { useI18n } from "@/i18n/context";
/**
 * Every badge on one shelf (DESIGN.md §6.3): earned ones struck in their
 * metal, the rest as embossed blanks with how far along they are.
 */
export function BadgeShelf() {
    const { t } = useI18n();
    const { data: badges } = useBadges();
    if (!badges || badges.length === 0)
        return null;
    const earned = badges.filter((badge) => badge.earned_at).length;
    return (_jsxs("section", { className: "badge-shelf", "aria-labelledby": "badge-shelf-title", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { className: "section-title", id: "badge-shelf-title", children: t("badge.shelfTitle") }), _jsx("span", { className: "muted badge-shelf__count mono", children: t("badge.shelfCount", { count: earned, total: badges.length }) })] }), _jsx("ul", { className: "badge-shelf__row", children: badges.map((badge) => (_jsx(BadgeTile, { badge: badge }, badge.id))) })] }));
}
function BadgeTile({ badge }) {
    const { t, language } = useI18n();
    const text = badgeText(badge, t);
    const earned = Boolean(badge.earned_at);
    const progress = Math.min(badge.progress, badge.threshold);
    const date = badge.earned_at
        ? new Intl.DateTimeFormat(language === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short" }).format(new Date(badge.earned_at))
        : null;
    return (_jsxs("li", { className: earned ? "badge-tile" : "badge-tile badge-tile--locked", title: text.description, children: [_jsx(BadgeMark, { artworkKey: badge.artwork_key, tier: badge.tier, earned: earned, size: 56, label: t("badge.label", { name: text.name, state: t(earned ? "badge.stateEarned" : "badge.stateLocked") }) }), _jsx("span", { className: "badge-tile__name", children: text.name }), date ? (_jsx("span", { className: "badge-tile__foot muted", children: t("badge.earnedOn", { date }) })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "progress badge-tile__bar", "aria-hidden": "true", children: _jsx("span", { className: "progress__fill", style: { width: `${(progress / badge.threshold) * 100}%` } }) }), _jsx("span", { className: "badge-tile__foot muted mono", children: t("badge.progress", { progress, threshold: badge.threshold }) })] }))] }));
}

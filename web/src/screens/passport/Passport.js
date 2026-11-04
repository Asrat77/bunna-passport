import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phCaretLeft, phCaretRight, phFire, phPencilSimple } from "@/ui/icons";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useMyDoodle } from "@/data/me";
import { useCatalog, usePassport, useProfile, useRecentCheckIns } from "@/data/queries";
import { coffeeWeeks } from "@/data/streak";
import { Doodle } from "@/design/doodle/Doodle";
import { Seal } from "@/design/seal/Seal";
import { useI18n } from "@/i18n/context";
import { distanceMeters } from "@/lib/distance";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { FilterChip } from "@/ui/Chip";
import { Dock } from "@/ui/Dock";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { BadgeShelf } from "./BadgeShelf";
import { paginate } from "./layout";
import { PassportPage } from "./PassportPage";
import "./passport.css";
export function Passport() {
    const { t, language } = useI18n();
    const { push } = useNavigation();
    const { firstName } = useAuth();
    const { data: profile } = useProfile();
    const { data: passport } = usePassport();
    const { data: checkIns } = useRecentCheckIns();
    const catalog = useCatalog();
    const { fix } = useLocation();
    const doodle = useMyDoodle();
    const stampsByShop = useMemo(() => new Map((passport?.stamps ?? []).map((s) => [s.shop.id, s])), [passport]);
    const newestId = passport?.stamps[0]?.shop.id;
    const areas = useMemo(() => {
        const byId = new Map();
        for (const shop of catalog.data ?? []) {
            const area = byId.get(shop.neighborhood.id) ?? { neighborhood: shop.neighborhood, shops: [], stamped: 0 };
            area.shops.push(shop);
            if (stampsByShop.has(shop.id))
                area.stamped++;
            byId.set(shop.neighborhood.id, area);
        }
        // Areas with stamps first, most stamped leading; the rest alphabetically.
        return [...byId.values()].sort((a, b) => b.stamped - a.stamped || a.neighborhood.name.localeCompare(b.neighborhood.name));
    }, [catalog.data, stampsByShop]);
    const newestArea = catalog.data?.find((s) => s.id === newestId)?.neighborhood.id;
    const [chosenArea, setChosenArea] = useState(null);
    const areaId = chosenArea ?? newestArea ?? profile?.home_neighborhood_id ?? areas[0]?.neighborhood.id ?? null;
    const area = areas.find((a) => a.neighborhood.id === areaId) ?? areas[0];
    const [pageIndex, setPageIndex] = useState(0);
    const pages = useMemo(() => {
        if (!area)
            return [[]];
        // Stamps in the order they were earned so a filled page never reshuffles;
        // unstamped cafés fill in after, nearest first.
        const earned = area.shops
            .filter((shop) => stampsByShop.has(shop.id))
            .map((shop) => ({ kind: "stamped", shop, stamp: stampsByShop.get(shop.id), isNewest: shop.id === newestId }))
            .sort((a, b) => a.stamp.earned_at.localeCompare(b.stamp.earned_at));
        const missing = area.shops
            .filter((shop) => !stampsByShop.has(shop.id))
            .map((shop) => ({ kind: "missing", shop, distance: fix ? distanceMeters(fix, shop) : null }))
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || a.shop.name.localeCompare(b.shop.name));
        return paginate([...earned, ...missing]);
    }, [area, stampsByShop, newestId, fix]);
    const page = Math.min(pageIndex, pages.length - 1);
    // Page numbers run through the whole passport, area after area.
    const pageOffset = areas
        .slice(0, Math.max(0, areas.indexOf(area)))
        .reduce((sum, a) => sum + Math.max(1, Math.ceil(a.shops.length / 5)), 0);
    const me = profile;
    // The server counts every verified cup; the recent page is a stand-in until it answers.
    const streak = passport?.streak;
    const weeks = streak?.current_weeks ?? coffeeWeeks(checkIns ?? []);
    const areaName = area ? (language === "am" ? area.neighborhood.name_am : area.neighborhood.name) : "";
    return (_jsxs("main", { className: "screen screen--with-dock passport", children: [_jsxs("header", { className: "passport__header", children: [_jsxs("button", { type: "button", className: "passport__profile", onClick: () => push({ name: "profile" }), "aria-label": t("profile.open"), children: [_jsx(Doodle, { seed: doodle.seed, traits: doodle.traits, mood: doodle.awake ? "awake" : "sleepy", size: 64, label: t(doodle.awake ? "doodle.mineAwake" : "doodle.mineSleepy") }), _jsxs("span", { className: "passport__who", children: [_jsx("span", { className: "passport__name", children: me?.display_name ?? firstName ?? "" }), me ? _jsx("span", { className: "passport__handle", children: handleLine(me, t, language) }) : null] }), _jsx(Icon, { path: phCaretRight, size: 18 })] }), _jsxs("button", { type: "button", className: "pill-button", onClick: () => push({ name: "studio" }), children: [_jsx(Icon, { path: phPencilSimple, size: 16 }), t("passport.editDoodle")] })] }), passport && passport.stamped_count === 0 ? (_jsx(Headline, { first: t("passport.emptyTitle"), second: t("passport.emptyTitleB"), size: 30, as: "h2" })) : null, _jsxs("div", { className: "counters", children: [_jsxs("div", { className: "card counter", children: [_jsx("span", { className: "counter__label", children: t("passport.stamps") }), _jsx("span", { className: "counter__value mono", children: passport?.stamped_count ?? "–" }), _jsxs("span", { className: "counter__foot", children: [_jsx("span", { className: "seal-stack", "aria-hidden": "true", children: (passport?.stamps ?? []).slice(0, 3).map((stamp) => (_jsx(Seal, { name: stamp.shop.name, level: stamp.level, size: 24, decorative: true }, stamp.id))) }), t("passport.differentCafes")] })] }), _jsxs("div", { className: "card counter counter--cups", children: [_jsx("span", { className: "counter__label", children: t("passport.cups") }), _jsx("span", { className: "counter__value counter__value--cups mono", children: me?.verified_check_ins_count ?? "–" }), _jsxs("span", { className: "counter__foot", children: [_jsx("span", { className: "counter__flame", children: _jsx(Icon, { path: phFire, size: 16 }) }), weeks === 0
                                        ? t("passport.noStreak")
                                        : weeks === 1
                                            ? t("passport.coffeeWeekOne")
                                            : t("passport.coffeeWeeks", { count: weeks })] })] })] }), streak && streak.current_weeks > 0 ? _jsx(StreakLine, { ...streak }) : null, areas.length > 0 && area ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "chip-row", role: "group", "aria-label": t("passport.neighborhoods"), children: areas.map((a) => (_jsxs(FilterChip, { selected: a.neighborhood.id === area.neighborhood.id, onClick: () => {
                                setChosenArea(a.neighborhood.id);
                                setPageIndex(0);
                            }, children: [language === "am" ? a.neighborhood.name_am : a.neighborhood.name, " ", _jsxs("span", { className: "mono chip-count", children: [a.stamped, "/", a.shops.length] })] }, a.neighborhood.id))) }), _jsxs("div", { className: "area-progress", children: [_jsxs("div", { className: "section-head", children: [_jsx("h2", { className: "section-title", children: t("passport.page", { area: areaName }) }), _jsx("span", { className: "muted area-progress__left", children: area.stamped >= area.shops.length
                                            ? t("passport.complete")
                                            : t("passport.toGo", { count: area.shops.length - area.stamped }) })] }), _jsx("div", { className: "progress", "aria-hidden": "true", children: _jsx("div", { className: "progress__fill", style: { width: `${(area.stamped / Math.max(1, area.shops.length)) * 100}%` } }) })] }), _jsx(PassportPage, { neighborhood: area.neighborhood, entries: pages[page], pageNumber: pageOffset + page + 1 }), pages.length > 1 ? (_jsxs("div", { className: "page-turn", children: [_jsx("button", { type: "button", className: "pill-button", disabled: page === 0, onClick: () => setPageIndex(page - 1), "aria-label": t("passport.prevPage"), children: _jsx(Icon, { path: phCaretLeft, size: 20 }) }), _jsxs("span", { className: "mono muted", children: [page + 1, " / ", pages.length] }), _jsx("button", { type: "button", className: "pill-button", disabled: page === pages.length - 1, onClick: () => setPageIndex(page + 1), "aria-label": t("passport.nextPage"), children: _jsx(Icon, { path: phCaretRight, size: 20 }) })] })) : null] })) : null, _jsx(BadgeShelf, {}), _jsx(Dock, {})] }));
}
/** One line on what this week does for the run. A lost run resets quietly (DESIGN.md §6.4). */
function StreakLine({ current_weeks, longest_weeks, this_week }) {
    const { t } = useI18n();
    const record = longest_weeks < 2 ? "" : current_weeks >= longest_weeks ? t("streak.bestNow") : t("streak.best", { count: longest_weeks });
    const text = this_week ? `${t("streak.inThisWeek")} ${record}`.trim() : t("streak.keepGoing", { count: current_weeks + 1 });
    return (_jsxs("p", { className: "streak-line", children: [_jsx("span", { "aria-hidden": "true", children: _jsx(Icon, { path: phFire, size: 14 }) }), _jsx("span", { children: text })] }));
}
export function handleLine(user, t, language) {
    const since = new Intl.DateTimeFormat(language === "am" ? "am-ET" : "en-GB", { month: "short", year: "numeric" }).format(new Date(user.joined_at));
    return t("passport.handleLine", { handle: user.handle, trust: t(`trust.${user.trust_level}`), date: since });
}

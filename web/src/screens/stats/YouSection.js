import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "@/auth/AuthProvider";
import { usePersonalStats } from "@/data/queries";
import { INK } from "@/design/stamp/geometry";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { Headline } from "@/ui/Headline";
import { StatStrip } from "@/ui/StatStrip";
import { BarList, ColumnChart, FactGrid, Meter, StatCard, useRhythmColumns } from "./charts";
const LEVELS = ["bronze", "silver", "gold", "diamond"];
/** One person's passport, added up. Verified cups only, like the boards. */
export function YouSection() {
    const { t, language } = useI18n();
    const { status } = useAuth();
    const { push } = useNavigation();
    const stats = usePersonalStats();
    const rhythm = useRhythmColumns();
    const name = (place) => (language === "am" ? place.name_am : place.name);
    const date = (iso) => new Date(iso).toLocaleDateString(language === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
    const headline = _jsx(Headline, { first: t("stats.youTitle"), second: t("stats.youTitleB"), size: 32 });
    if (status !== "signedIn") {
        return (_jsxs(_Fragment, { children: [headline, _jsx("p", { className: "notice", children: t("stats.signIn") })] }));
    }
    if (stats.isPending) {
        return (_jsxs(_Fragment, { children: [headline, _jsx("div", { className: "skeleton", style: { height: 72 } }), _jsx("div", { className: "skeleton", style: { height: 220 } })] }));
    }
    if (stats.isError || !stats.data) {
        return (_jsxs(_Fragment, { children: [headline, _jsxs("div", { className: "notice notice--caution", children: [t("stats.loadFailed"), " ", _jsx("button", { type: "button", className: "link-button", onClick: () => void stats.refetch(), children: t("common.retry") })] })] }));
    }
    const data = stats.data;
    const { totals, streaks } = data;
    if (totals.cups === 0) {
        return (_jsxs(_Fragment, { children: [headline, _jsx("p", { className: "notice", children: t("stats.youEmpty") })] }));
    }
    const share = totals.catalog_cafes > 0 ? Math.round((totals.cafes / totals.catalog_cafes) * 1000) / 10 : 0;
    return (_jsxs(_Fragment, { children: [headline, _jsx(StatStrip, { stats: [
                    { value: totals.cups.toLocaleString(), label: t("stats.statCups") },
                    { value: totals.cafes.toLocaleString(), label: t("stats.statCafes") },
                    { value: totals.areas.toLocaleString(), label: t("stats.statAreas") },
                ] }), _jsx(Meter, { percent: share, label: t("stats.passportShare", { percent: share }) }), _jsx(Meter, { percent: totals.catalog_areas > 0 ? (totals.areas / totals.catalog_areas) * 100 : 0, label: t("stats.areasShare", { count: totals.areas, total: totals.catalog_areas }) }), data.city_rank ? (_jsxs("section", { className: "rank-card", children: [_jsx("span", { className: "rank-card__rank", children: t("stats.rank", { rank: data.city_rank.rank.toLocaleString() }) }), _jsx("span", { className: "rank-card__note", children: t("stats.rankNote", { count: data.city_rank.drinkers.toLocaleString() }) })] })) : null, _jsx(StatCard, { title: t("stats.streaks"), children: _jsx(FactGrid, { facts: [
                        { label: t("stats.streakNow"), value: streaks.current_weeks },
                        { label: t("stats.streakBest"), value: streaks.longest_weeks },
                        { label: t("stats.coffeeDays"), value: streaks.coffee_days.toLocaleString() },
                        { label: t("stats.bestDay"), value: t("stats.cupsCount", { count: streaks.best_day_cups }) },
                    ] }) }), data.favorite_cafe ? (_jsxs("button", { type: "button", className: "card regular", onClick: () => push({ name: "shop", id: data.favorite_cafe.shop.id }), children: [_jsx("span", { className: "regular__eyebrow", children: t("stats.regular") }), _jsx("span", { className: "regular__name", children: name(data.favorite_cafe.shop) }), _jsx("span", { className: "regular__note mono", children: t("stats.regularNote", { count: data.favorite_cafe.cups, level: t(`level.${data.favorite_cafe.level}`) }) })] })) : null, _jsxs(StatCard, { title: t("stats.yourRhythm"), children: [_jsx(ColumnChart, { title: t("stats.byHour"), columns: rhythm.hours(data.by_hour), describePeak: (column) => t("stats.peakHour", { hour: column.label }) }), _jsx(ColumnChart, { title: t("stats.byWeekday"), columns: rhythm.weekdays(data.by_weekday), describePeak: (column) => t("stats.peakDay", { day: rhythm.dayName(column.label) }) }), _jsx(ColumnChart, { title: t("stats.byMonth"), columns: rhythm.months(data.by_month), describePeak: (column) => t("stats.barValue", { label: column.label, count: column.value }) })] }), data.top_areas.length > 0 ? (_jsx(StatCard, { title: t("stats.whereYouDrink"), children: _jsx(BarList, { rows: data.top_areas.map((area) => ({ key: area.id, label: name(area), value: area.cups })) }) })) : null, _jsx(StatCard, { title: t("stats.levels"), children: _jsx("ul", { className: "levels", children: LEVELS.map((level) => (_jsxs("li", { className: "levels__cell", children: [_jsx("span", { className: "levels__dot", style: { background: INK[level] }, "aria-hidden": "true" }), _jsx("span", { className: "levels__count mono", children: data.stamp_levels[level] }), _jsx("span", { className: "levels__name", children: t(`level.${level}`) })] }, level))) }) }), _jsx(FactGrid, { facts: [
                    { label: t("stats.usual"), value: data.favorite_drink?.name ?? t("stats.none"), note: data.favorite_drink ? t("stats.cupsCount", { count: data.favorite_drink.cups }) : undefined },
                    { label: t("stats.avgRating"), value: data.average_rating ? `${data.average_rating.toFixed(1)} ★` : t("stats.none") },
                    { label: t("stats.reviews"), value: totals.reviews },
                    { label: t("stats.contributions"), value: totals.contributions },
                    { label: t("stats.badges"), value: t("stats.badgesShare", { count: totals.badges, total: totals.catalog_badges }) },
                    { label: t("stats.firstCup"), value: data.first_cup_at ? date(data.first_cup_at) : t("stats.none") },
                ] })] }));
}

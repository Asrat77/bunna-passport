import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCityStats } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { PRICE_GLYPHS } from "@/lib/price";
import { useNavigation } from "@/nav/Navigation";
import { Headline } from "@/ui/Headline";
import { StatStrip } from "@/ui/StatStrip";
import { BarList, ColumnChart, FactGrid, StatCard, useRhythmColumns } from "./charts";
const SHOWN_AREAS = 8;
const BANDS = ["budget", "standard", "premium", "splurge"];
/** What every passport in Addis adds up to. Public; the server recounts every ten minutes. */
export function CitySection() {
    const { t, language } = useI18n();
    const { push } = useNavigation();
    const stats = useCityStats();
    const rhythm = useRhythmColumns();
    const name = (place) => (language === "am" ? place.name_am : place.name);
    const openShop = (shop) => push({ name: "shop", id: shop.id });
    const headline = _jsx(Headline, { first: t("stats.cityTitle"), second: t("stats.cityTitleB"), size: 32 });
    if (stats.isPending) {
        return (_jsxs(_Fragment, { children: [headline, _jsx("div", { className: "skeleton", style: { height: 72 } }), _jsx("div", { className: "skeleton", style: { height: 220 } })] }));
    }
    if (stats.isError || !stats.data) {
        return (_jsxs(_Fragment, { children: [headline, _jsxs("div", { className: "notice notice--caution", children: [t("stats.loadFailed"), " ", _jsx("button", { type: "button", className: "link-button", onClick: () => void stats.refetch(), children: t("common.retry") })] })] }));
    }
    const data = stats.data;
    const { totals } = data;
    const shopRows = (rows) => rows.map((row) => ({ key: row.shop.id, label: name(row.shop), value: row.cups, shop: row.shop }));
    return (_jsxs(_Fragment, { children: [headline, _jsx(StatStrip, { stats: [
                    { value: totals.cafes.toLocaleString(), label: t("stats.statCafes") },
                    { value: totals.cups.toLocaleString(), label: t("stats.statCups") },
                    { value: totals.drinkers.toLocaleString(), label: t("stats.statDrinkers") },
                ] }), _jsx("p", { className: "stats__line", children: t("stats.thisWeek", { cups: totals.cups_this_week.toLocaleString(), people: totals.drinkers_this_week.toLocaleString() }) }), _jsxs(StatCard, { title: t("stats.cityRhythm"), children: [_jsx(ColumnChart, { title: t("stats.byHour"), columns: rhythm.hours(data.by_hour), describePeak: (column) => t("stats.peakHour", { hour: column.label }) }), _jsx(ColumnChart, { title: t("stats.byWeekday"), columns: rhythm.weekdays(data.by_weekday), describePeak: (column) => t("stats.peakDay", { day: rhythm.dayName(column.label) }) }), _jsx(ColumnChart, { title: t("stats.byMonth"), columns: rhythm.months(data.by_month), describePeak: (column) => t("stats.barValue", { label: column.label, count: column.value }) })] }), data.top_cafes.length > 0 ? (_jsx(StatCard, { title: t("stats.topCafes"), children: _jsx(BarList, { rows: shopRows(data.top_cafes), onOpen: (row) => openShop(row.shop) }) })) : null, data.rising_cafes.length > 0 ? (_jsx(StatCard, { title: t("stats.risingCafes"), children: _jsx(BarList, { rows: shopRows(data.rising_cafes), onOpen: (row) => openShop(row.shop) }) })) : null, data.top_rated.length > 0 ? (_jsx(StatCard, { title: t("stats.topRated"), children: _jsx(BarList, { rows: data.top_rated.map((row) => ({
                        key: row.shop.id,
                        label: name(row.shop),
                        note: t("stats.ratingNote", { average: row.average.toFixed(1), count: row.ratings }),
                        value: row.average,
                        display: row.average.toFixed(1),
                        shop: row.shop,
                    })), onOpen: (row) => openShop(row.shop) }) })) : null, data.areas.length > 0 ? (_jsx(StatCard, { title: t("stats.areas"), aside: t("stats.areasNote", { count: data.areas.length }), children: _jsx(BarList, { rows: data.areas.slice(0, SHOWN_AREAS).map((area) => ({
                        key: area.id,
                        label: name(area),
                        note: t("stats.areaNote", { cafes: area.cafes, cups: area.cups }),
                        value: area.cafes,
                    })) }) })) : null, data.top_drinks.length > 0 ? (_jsx(StatCard, { title: t("stats.drinks"), children: _jsx(BarList, { rows: data.top_drinks.map((drink) => ({ key: drink.name, label: drink.name, value: drink.cups })) }) })) : null, _jsx(StatCard, { title: t("stats.catalog"), children: _jsx(FactGrid, { facts: [
                        { label: t("stats.unstamped"), value: totals.unstamped_cafes.toLocaleString() },
                        { label: t("stats.jebena"), value: totals.jebena_cafes.toLocaleString() },
                        { label: t("stats.withHours"), value: totals.cafes_with_hours.toLocaleString() },
                        { label: t("stats.newCafes"), value: totals.new_cafes.toLocaleString() },
                        { label: t("stats.stampsTotal"), value: totals.stamps.toLocaleString() },
                        { label: t("stats.reviewsTotal"), value: totals.reviews.toLocaleString() },
                    ] }) }), _jsx(StatCard, { title: t("stats.priceMix"), children: _jsx("ul", { className: "levels", children: BANDS.map((band) => (_jsxs("li", { className: "levels__cell", children: [_jsx("span", { className: "levels__count mono", children: data.price_bands[band] }), _jsx("span", { className: "levels__name", children: PRICE_GLYPHS[band] })] }, band))) }) }), _jsx("p", { className: "boards__footnote", children: t("stats.updated", { time: ago(data.generated_at, t) }) })] }));
}
function ago(iso, t) {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (minutes < 1)
        return t("common.justNow");
    if (minutes < 60)
        return t("common.minutesAgo", { count: minutes });
    return t("common.hoursAgo", { count: Math.floor(minutes / 60) });
}

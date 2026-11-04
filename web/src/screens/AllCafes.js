import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phCaretDown, phCaretLeft, phCaretRight, phMagnifyingGlass } from "@/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { catalogStats, findShops } from "@/data/nearby";
import { useCatalog } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { FilterChip } from "@/ui/Chip";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { ShopRow } from "@/ui/ShopRow";
import { StatStrip } from "@/ui/StatStrip";
import { AddMissing } from "./contribute/AddMissing";
import "./cafes.css";
const PAGE_SIZE = 20;
// Screens unmount when a shop is pushed over them, so each All cafés entry in
// the stack keeps its filters and page here and gets them back on Back.
const remembered = new WeakMap();
function initialFilters(route) {
    return (remembered.get(route) ?? {
        query: route.query ?? "",
        openNow: false,
        jebena: route.filter === "jebena",
        visited: route.filter === "notYet" ? false : null,
        neighborhoodId: null,
        sort: "nearest",
        page: 0,
        scrollY: 0,
    });
}
/**
 * The whole catalog, a page at a time. It pages the copy the app already
 * keeps for offline search, so turning a page costs no data and works with
 * no signal; only twenty rows are ever drawn.
 */
export function AllCafes({ route }) {
    const { t, language } = useI18n();
    const { push, back } = useNavigation();
    const catalog = useCatalog();
    const stamps = useStampsByShop();
    const location = useLocation();
    const [filters, setFilters] = useState(() => initialFilters(route));
    const listTop = useRef(null);
    const shops = catalog.data ?? [];
    const stamped = useMemo(() => new Set(stamps.keys()), [stamps]);
    const stats = useMemo(() => catalogStats(shops, stamped), [shops, stamped]);
    const areas = useMemo(() => [...stats.neighborhoods].sort((a, b) => a.name.localeCompare(b.name)), [stats.neighborhoods]);
    const results = useMemo(() => findShops(shops, {
        origin: location.fix,
        query: filters.query,
        stamped,
        openNow: filters.openNow,
        jebena: filters.jebena,
        visited: filters.visited,
        neighborhoodId: filters.neighborhoodId,
        sort: filters.sort,
    }), [shops, location.fix, stamped, filters]);
    const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const page = Math.min(filters.page, pages - 1);
    const visible = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const filtered = filters.query.trim() !== "" || filters.openNow || filters.jebena || filters.visited !== null || filters.neighborhoodId !== null;
    useEffect(() => {
        remembered.set(route, filters);
    }, [route, filters]);
    // Back from a shop lands where you left the list, after the app's own
    // scroll-to-top on every screen change.
    useEffect(() => {
        const y = filters.scrollY;
        if (y > 0)
            requestAnimationFrame(() => window.scrollTo(0, y));
        // Only on arrival.
    }, []);
    /** Any filter change starts again from the first page. */
    const update = (change) => setFilters((current) => ({ ...current, ...change, page: 0 }));
    const goTo = (next) => {
        setFilters((current) => ({ ...current, page: next }));
        listTop.current?.scrollIntoView({ block: "start" });
    };
    const open = (id) => {
        remembered.set(route, { ...filters, page, scrollY: window.scrollY });
        push({ name: "shop", id });
    };
    const areaName = (area) => (language === "am" ? area.name_am : area.name);
    const percent = stats.total > 0 ? Math.round((stats.visited / stats.total) * 100) : 0;
    return (_jsxs("main", { className: "screen cafes", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsx(Headline, { first: t("cafes.title"), second: t("cafes.titleB"), size: 30 }), catalog.isPending ? (_jsx("div", { className: "skeleton", style: { height: 72 } })) : (_jsxs(_Fragment, { children: [_jsx(StatStrip, { stats: [
                            { value: stats.total.toLocaleString(), label: t("cafes.statCafes") },
                            { value: stats.openNow.toLocaleString(), label: t("cafes.statOpen") },
                            { value: stats.visited.toLocaleString(), label: t("cafes.statVisited") },
                        ] }), stats.visited > 0 ? (_jsxs("div", { className: "cafes__progress", "aria-label": t("cafes.visitedShare", { percent }), children: [_jsx("div", { className: "cafes__progress-bar", style: { width: `${Math.max(percent, 1)}%` } }), _jsx("span", { className: "mono", children: t("cafes.visitedShare", { percent }) })] })) : null] })), _jsxs("label", { className: "search", children: [_jsx("span", { className: "visually-hidden", children: t("explore.searchLabel") }), _jsx("input", { type: "search", value: filters.query, onChange: (event) => update({ query: event.target.value }), placeholder: t("explore.searchPlaceholder"), enterKeyHint: "search" }), _jsx("span", { className: "search__icon", "aria-hidden": "true", children: _jsx(Icon, { path: phMagnifyingGlass, size: 21 }) })] }), _jsxs("div", { className: "chip-row", role: "group", "aria-label": t("cafes.filters"), children: [_jsx(FilterChip, { selected: filters.openNow, onClick: () => update({ openNow: !filters.openNow }), children: t("cafes.openNow") }), _jsx(FilterChip, { selected: filters.jebena, onClick: () => update({ jebena: !filters.jebena }), children: t("cafes.jebena") }), _jsx(FilterChip, { selected: filters.visited === true, onClick: () => update({ visited: filters.visited === true ? null : true }), children: t("cafes.visited") }), _jsx(FilterChip, { selected: filters.visited === false, onClick: () => update({ visited: filters.visited === false ? null : false }), children: t("cafes.notVisited") })] }), _jsxs("div", { className: "cafes__selects", children: [_jsxs("label", { className: "select-pill cafes__area-select", children: [_jsx("span", { className: "visually-hidden", children: t("cafes.area") }), _jsxs("select", { value: filters.neighborhoodId ?? "", onChange: (event) => update({ neighborhoodId: event.target.value ? Number(event.target.value) : null }), children: [_jsx("option", { value: "", children: t("cafes.anyArea") }), areas.map((area) => (_jsxs("option", { value: area.id, children: [areaName(area), " (", area.count, ")"] }, area.id)))] }), _jsx(Icon, { path: phCaretDown, size: 16 })] }), _jsxs("label", { className: "select-pill", children: [_jsx("span", { className: "visually-hidden", children: t("cafes.sort") }), _jsxs("select", { value: filters.sort, onChange: (event) => update({ sort: event.target.value }), children: [_jsx("option", { value: "nearest", children: t("cafes.sortNearest") }), _jsx("option", { value: "name", children: t("cafes.sortName") }), _jsx("option", { value: "neighborhood", children: t("cafes.sortArea") })] }), _jsx(Icon, { path: phCaretDown, size: 16 })] })] }), _jsxs("div", { className: "section-head", ref: listTop, children: [_jsx("span", { className: "cafes__showing mono", "aria-live": "polite", children: results.length > 0
                            ? t("cafes.showing", {
                                from: page * PAGE_SIZE + 1,
                                to: page * PAGE_SIZE + visible.length,
                                total: results.length.toLocaleString(),
                            })
                            : null }), filtered ? (_jsx("button", { type: "button", className: "link-button", onClick: () => update({ query: "", openNow: false, jebena: false, visited: null, neighborhoodId: null }), children: t("cafes.clear") })) : null] }), filters.sort === "nearest" && (location.status === "denied" || location.status === "unavailable") ? (_jsx("p", { className: "notice", children: t("explore.noLocation") })) : null, catalog.isPending ? (_jsx("div", { className: "shop-list shop-list--flat", "aria-label": t("explore.loading"), children: [0, 1, 2, 3].map((n) => (_jsx("div", { className: "skeleton", style: { height: 76 } }, n))) })) : catalog.isError && !catalog.data ? (_jsxs("div", { className: "notice notice--caution", children: [t("explore.loadFailed"), " ", _jsx("button", { type: "button", className: "link-button", onClick: () => void catalog.refetch(), children: t("common.retry") })] })) : visible.length === 0 ? (_jsxs("div", { className: "notice", children: [filters.query.trim() ? t("explore.noResults") : t("cafes.none"), filters.query.trim() ? (_jsxs(_Fragment, { children: [_jsx("br", {}), t("explore.noResultsHint"), _jsx("br", {}), _jsx(AddMissing, { query: filters.query })] })) : null] })) : (_jsx("ul", { className: "shop-list shop-list--flat", children: visible.map(({ shop, distance }) => (_jsx("li", { children: _jsx(ShopRow, { shop: shop, stamp: stamps.get(shop.id), distance: distance, onOpen: () => open(shop.id), variant: "flat" }) }, shop.id))) })), pages > 1 ? (_jsxs("nav", { className: "pager", "aria-label": t("cafes.pages"), children: [_jsx("button", { type: "button", className: "pager__step", disabled: page === 0, onClick: () => goTo(page - 1), "aria-label": t("cafes.previous"), children: _jsx(Icon, { path: phCaretLeft, size: 22 }) }), _jsx("span", { className: "pager__label mono", children: t("cafes.page", { page: page + 1, pages }) }), _jsx("button", { type: "button", className: "pager__step", disabled: page >= pages - 1, onClick: () => goTo(page + 1), "aria-label": t("cafes.next"), children: _jsx(Icon, { path: phCaretRight, size: 22 }) })] })) : null] }));
}

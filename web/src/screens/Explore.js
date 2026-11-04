import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phCoffeeBean, phCrosshair, phMagnifyingGlass, phMapTrifold, phPlusCircle } from "@/ui/icons";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { rankShops } from "@/data/nearby";
import { useMyDoodle } from "@/data/me";
import { useCatalog, useProfile } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import dither from "@/assets/dither-mocha-240.png";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { useMochaChrome } from "@/telegram/mochaChrome";
import { Dock } from "@/ui/Dock";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { ShopRow } from "@/ui/ShopRow";
import { AddMissing } from "./contribute/AddMissing";
import "./explore.css";
const PREVIEW_COUNT = 5;
/** Explore is Mocha in both phone themes (docs/DESIGN.md §2.2.1). */
export function Explore() {
    const { t } = useI18n();
    const { push } = useNavigation();
    const { firstName } = useAuth();
    const { data: profile } = useProfile();
    const doodle = useMyDoodle();
    const catalog = useCatalog();
    const stamps = useStampsByShop();
    const location = useLocation();
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");
    useMochaChrome();
    const ranked = useMemo(() => rankShops(catalog.data ?? [], {
        origin: location.fix,
        query,
        filter,
        stamped: new Set(stamps.keys()),
    }), [catalog.data, location.fix, query, filter, stamps]);
    const searching = query.trim().length > 0;
    // A preview only: the whole catalog, paged, lives on All cafés.
    const visible = ranked.slice(0, PREVIEW_COUNT);
    const title = searching
        ? t("explore.results")
        : filter === "jebena"
            ? t("explore.jebenaShops")
            : filter === "notYet"
                ? t("explore.notYetShops")
                : location.fix
                    ? t("explore.closest")
                    : t("explore.allShops");
    const toggle = (next) => setFilter((current) => (current === next ? "all" : next));
    const name = firstName ?? profile?.display_name ?? "";
    return (_jsxs("main", { className: "screen screen--with-dock explore mocha", children: [_jsx("img", { className: "explore__dither", src: dither, alt: "", "aria-hidden": "true" }), _jsxs("div", { className: "greeting", children: [_jsx("button", { type: "button", className: "greeting__doodle", "aria-label": `${t(doodle.awake ? "doodle.mineAwake" : "doodle.mineSleepy")}. ${t("explore.openStudio")}`, onClick: () => push({ name: "studio" }), children: _jsx(Doodle, { seed: doodle.seed, traits: doodle.traits, mood: doodle.awake ? "awake" : "sleepy", size: 46, decorative: true }) }), _jsxs("div", { className: "greeting__text", children: [_jsx("span", { className: "greeting__hello", children: t("explore.greeting", { name }) }), _jsx("span", { className: "greeting__mood", children: t(doodle.awake ? "explore.moodAwake" : "explore.moodSleepy") })] })] }), _jsx(Headline, { first: t(doodle.awake ? "explore.titleNext" : "explore.titleFirst"), second: t(doodle.awake ? "explore.titleNextB" : "explore.titleFirstB"), size: 31, oneLine: true }), _jsxs("label", { className: "search", children: [_jsx("span", { className: "visually-hidden", children: t("explore.searchLabel") }), _jsx("input", { type: "search", value: query, onChange: (event) => setQuery(event.target.value), placeholder: t("explore.searchPlaceholder"), enterKeyHint: "search" }), _jsx("span", { className: "search__icon", "aria-hidden": "true", children: _jsx(Icon, { path: phMagnifyingGlass, size: 20 }) })] }), _jsxs("div", { className: "pills", role: "group", "aria-label": t("explore.quickFilters"), children: [_jsxs("button", { type: "button", className: "pill", "aria-busy": location.status === "locating" || undefined, onClick: () => void location.refresh(), children: [_jsx(Icon, { path: phCrosshair, size: 16 }), t("explore.tileNearMe")] }), _jsxs("button", { type: "button", className: "pill", onClick: () => push({ name: "map" }), children: [_jsx(Icon, { path: phMapTrifold, size: 16 }), t("explore.tileMap")] }), _jsxs("button", { type: "button", className: "pill", "aria-pressed": filter === "jebena", onClick: () => toggle("jebena"), children: [_jsx(Icon, { path: phCoffeeBean, size: 16 }), t("explore.tileJebena")] }), _jsxs("button", { type: "button", className: "pill", "aria-pressed": filter === "notYet", onClick: () => toggle("notYet"), children: [_jsx(Icon, { path: phPlusCircle, size: 16 }), t("explore.tileNotYet")] })] }), _jsxs("div", { className: "section-head", children: [_jsx("h2", { className: "section-title", children: title }), ranked.length > PREVIEW_COUNT ? (_jsx("button", { type: "button", className: "link-button", onClick: () => push({ name: "cafes", query, filter }), children: t("explore.seeAll", { count: ranked.length.toLocaleString() }) })) : null] }), location.status === "denied" || location.status === "unavailable" ? (_jsx("p", { className: "notice", children: t("explore.noLocation") })) : null, catalog.isPending ? (_jsx("div", { className: "shop-list shop-list--flat", "aria-label": t("explore.loading"), children: [0, 1, 2].map((n) => (_jsx("div", { className: "skeleton", style: { height: 74 } }, n))) })) : catalog.isError && !catalog.data ? (_jsxs("div", { className: "notice notice--caution", children: [t("explore.loadFailed"), " ", _jsx("button", { type: "button", className: "link-button", onClick: () => void catalog.refetch(), children: t("common.retry") })] })) : visible.length === 0 ? (_jsxs("div", { className: "notice", children: [filter === "notYet" && !searching ? t("explore.allStamped") : t("explore.noResults"), searching ? (_jsxs(_Fragment, { children: [_jsx("br", {}), t("explore.noResultsHint"), _jsx("br", {}), _jsx(AddMissing, { query: query })] })) : null] })) : (_jsx("ul", { className: "shop-list shop-list--flat", children: visible.map(({ shop, distance }) => (_jsx("li", { children: _jsx(ShopRow, { shop: shop, stamp: stamps.get(shop.id), distance: distance, variant: "flat", onOpen: () => push({ name: "shop", id: shop.id }) }) }, shop.id))) })), _jsx(Dock, {})] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { Headline } from "@/ui/Headline";
import { useMapStyle } from "./useMapStyle";
// MapLibre is most of the bundle, so the list ships first and the map only
// loads behind the Map tile.
const ShopMap = lazy(() => import("./ShopMap"));
export function MapScreen() {
    const { t } = useI18n();
    const { back } = useNavigation();
    const styleUrl = useMapStyle();
    return (_jsxs("main", { className: "screen map-screen", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsx(Headline, { first: t("explore.titleNext"), second: t("explore.titleNextB"), size: 30 }), styleUrl ? (_jsx(Suspense, { fallback: _jsx("div", { className: "skeleton map-screen__map", "aria-label": t("map.loading") }), children: _jsx(ShopMap, { styleUrl: styleUrl }) })) : (_jsx("p", { className: "notice", children: t("map.unavailable") }))] }));
}

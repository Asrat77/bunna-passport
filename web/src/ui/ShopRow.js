import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { phDotsThreeVertical } from "./icons";
import { isEthiopic } from "@/design/script";
import { Seal } from "@/design/seal/Seal";
import { useI18n } from "@/i18n/context";
import { openStatus } from "@/lib/hours";
import { formatMeters } from "@/lib/distance";
import { shopMenu } from "@/lib/maps";
import { Icon } from "./Icon";
/** A shop in a list: seal, bilingual name, where, standing, distance, menu. */
export function ShopRow({ shop, stamp, distance, onOpen, variant = "card" }) {
    const { t, language } = useI18n();
    const flat = variant === "flat";
    const status = openStatus(shop.hours?.schedule);
    // On the flat row "Open" is the normal case, so only the exceptions show.
    const statusText = status === "open"
        ? flat
            ? null
            : t("explore.open")
        : status === "closingSoon"
            ? t("explore.closingSoon")
            : status === "closed"
                ? t("explore.closed")
                : null;
    const area = language === "am" ? shop.neighborhood.name_am : shop.neighborhood.name;
    // The second name earns its place only when it adds the other script.
    const secondName = shop.name_am && shop.name_am !== shop.name && isEthiopic(shop.name_am) !== isEthiopic(shop.name) ? shop.name_am : null;
    const level = stamp ? t(`level.${stamp.level}`) : "";
    return (_jsxs("div", { className: flat ? "shop-row shop-row--flat" : "shop-row", children: [_jsxs("button", { type: "button", className: "shop-row__main", onClick: onOpen, children: [_jsx(Seal, { name: shop.name, level: stamp?.level ?? null, size: flat ? 48 : 50, decorative: true }), _jsxs("span", { className: "shop-row__text", children: [_jsxs("span", { className: "shop-row__name", children: [_jsx("span", { className: isEthiopic(shop.name) ? "shop-row__latin ethiopic" : "shop-row__latin", children: shop.name }), secondName ? _jsx("span", { className: "shop-row__am ethiopic", children: secondName }) : null] }), _jsx("span", { className: "shop-row__where", children: [area, shop.landmark].filter(Boolean).join(" · ") }), stamp ? (_jsx("span", { className: "shop-row__standing", children: stamp.check_ins_count === 1
                                    ? t("explore.cupsLevelOne", { level })
                                    : t("explore.cupsLevel", { count: stamp.check_ins_count, level }) })) : (_jsx("span", { className: "shop-row__standing shop-row__standing--new", children: t("explore.notInPassport") }))] }), _jsxs("span", { className: "shop-row__meta", children: [distance !== null ? _jsx("span", { className: "mono shop-row__distance", children: formatMeters(distance) }) : null, statusText ? _jsx("span", { className: `shop-row__open shop-row__open--${status}`, children: statusText }) : null] })] }), _jsx("button", { type: "button", className: "shop-row__menu", "aria-label": t("shop.directions") + ": " + shop.name, onClick: () => void shopMenu(shop, { title: shop.name, openMaps: t("shop.directions"), cancel: t("common.cancel") }), children: _jsx(Icon, { path: phDotsThreeVertical, size: 20 }) })] }));
}

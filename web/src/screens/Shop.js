import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phCheck, phMapPin, phPencilSimple, phShareNetwork } from "@/ui/icons";
import { useState } from "react";
import { useCatalog, useReviews, useShop } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { InkStamp } from "@/design/stamp/InkStamp";
import { stampDate, stampRotation } from "@/design/stamp/geometry";
import { useI18n } from "@/i18n/context";
import { distanceMeters, formatMeters } from "@/lib/distance";
import { openStatus } from "@/lib/hours";
import { openInMaps } from "@/lib/maps";
import { PRICE_GLYPHS } from "@/lib/price";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { AddChip, FilterChip, TagChip } from "@/ui/Chip";
import { Icon } from "@/ui/Icon";
import { StatStrip } from "@/ui/StatStrip";
import "./shop.css";
import "./contribute/contribute.css";
/** "Near" enough that the first step of the directions counts as done. */
const IN_THE_AREA_METERS = 1000;
export function Shop({ id }) {
    const { t, language } = useI18n();
    const { back, push } = useNavigation();
    const { data: shop, isPending, isError, refetch } = useShop(id);
    const [section, setSection] = useState("overview");
    return (_jsxs("main", { className: "screen shop", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), isPending ? (_jsx("div", { className: "skeleton", style: { height: 320 } })) : isError || !shop ? (_jsxs("div", { className: "notice notice--caution", children: [t("common.somethingWrong"), " ", _jsx("button", { type: "button", className: "link-button", onClick: () => void refetch(), children: t("common.retry") })] })) : (_jsx(ShopBody, { shop: shop, section: section, onSection: setSection, language: language })), _jsx(PrimaryAction, { text: t("shop.checkInHere"), onClick: () => push({ name: "checkin", shopId: id }) })] }));
}
function ShopBody({ shop, section, onSection, language, }) {
    const { t } = useI18n();
    const { push } = useNavigation();
    const { fix } = useLocation();
    const catalog = useCatalog();
    const stamps = useStampsByShop();
    const distance = fix ? distanceMeters(fix, shop) : null;
    const status = openStatus(shop.hours.schedule);
    const area = language === "am" ? shop.neighborhood.name_am : shop.neighborhood.name;
    const areaShops = (catalog.data ?? []).filter((s) => s.neighborhood.id === shop.neighborhood.id);
    const areaStamped = areaShops.filter((s) => stamps.has(s.id)).length;
    // The shop is fetched without signing in (it's cached for everyone), so the
    // viewer's own stamp comes from their passport.
    const stamp = shop.stamp ?? stamps.get(shop.id) ?? null;
    const statusText = status === "open" ? t("shop.openNow") : status === "closingSoon" ? t("shop.closingSoon") : status === "closed" ? t("shop.closedNow") : null;
    const tags = Object.keys(shop.attributes).filter((key) => shop.attributes[key]);
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "shop__hero", children: [_jsxs("div", { className: "shop__stamp", children: [_jsx(InkStamp, { name: shop.name, amharic: `${shop.name_am} · ${shop.neighborhood.name_am}`, date: stamp ? stampDate(stamp.earned_at) : t("shop.yourStamp"), level: stamp?.level ?? "none", size: 124, rotation: stamp ? stampRotation(`${shop.id}`) : 0, label: stamp
                                    ? `${shop.name}, ${t(`level.${stamp.level}`)}, ${stampDate(stamp.earned_at)}`
                                    : `${shop.name}, ${t("shop.notYet")}` }), stamp ? null : _jsx("span", { className: "shop__not-yet mono", children: t("shop.notYet") })] }), _jsx("h1", { className: "shop__name", children: shop.name }), shop.name_am ? _jsx("span", { className: "shop__name-am", children: shop.name_am }) : null, _jsxs("span", { className: "shop__where", children: [area, distance !== null ? (_jsxs(_Fragment, { children: [" · ", _jsx("span", { className: "mono", children: formatMeters(distance) })] })) : null, statusText ? (_jsxs(_Fragment, { children: [" · ", _jsx("span", { className: `shop__status shop__status--${status}`, children: statusText })] })) : null] }), stamp ? (_jsxs("button", { type: "button", className: "shop__share", onClick: () => push({ name: "share", target: { shopId: shop.id }, shopName: shop.name }), children: [_jsx(Icon, { path: phShareNetwork, size: 18 }), t("shop.shareStamp")] })) : null] }), _jsx(StatStrip, { stats: [
                    { value: shop.price_band ? PRICE_GLYPHS[shop.price_band] : t("shop.priceUnknown"), label: t("shop.price") },
                    { value: stamp?.check_ins_count ?? 0, label: t("shop.yourCups") },
                    { value: `${areaStamped}/${areaShops.length}`, label: t("shop.areaPage", { area }) },
                ] }), _jsx("div", { className: "chip-row", role: "group", "aria-label": t("shop.sections"), children: ["overview", "photos", "reviews"].map((key) => (_jsx(FilterChip, { selected: section === key, onClick: () => onSection(key), children: t(`shop.${key}`) }, key))) }), section === "overview" ? (_jsxs(_Fragment, { children: [_jsxs("section", { className: "card getting-there", "aria-labelledby": "getting-there", children: [_jsx("h2", { id: "getting-there", className: "eyebrow", children: t("shop.gettingThere") }), _jsxs("ol", { children: [_jsx(Step, { done: distance !== null && distance < IN_THE_AREA_METERS, children: t("shop.stepArea", { area }) }), _jsx(Step, { done: false, children: shop.landmark })] }), _jsxs("button", { type: "button", className: "getting-there__maps", onClick: () => openInMaps(shop), children: [_jsx(Icon, { path: phMapPin, size: 18 }), t("shop.stepOpenMaps")] })] }), _jsx(PhotoStrip, { shop: shop, onAll: () => onSection("photos") }), _jsxs("div", { className: "chip-wrap", children: [tags.map((tag) => (_jsx(TagChip, { children: t(`shop.tag.${tag}`) }, tag))), _jsx(AddChip, { icon: _jsx(Icon, { path: phPencilSimple, size: 16 }), onClick: () => push({ name: "suggestEdit", shopId: shop.id }), children: t("suggest.entry") })] }), _jsx("div", { className: "shop-fix", children: _jsx("button", { type: "button", className: "link-button", onClick: () => push({ name: "report", shopId: shop.id }), children: t("reportCafe.entry") }) })] })) : section === "photos" ? (_jsx(PhotoGrid, { shop: shop })) : (_jsx(Reviews, { shopId: shop.id }))] }));
}
function Step({ done, children }) {
    return (_jsxs("li", { className: done ? "step step--done" : "step", children: [_jsx("span", { className: "step__mark", "aria-hidden": "true", children: done ? _jsx(Icon, { path: phCheck, size: 14 }) : null }), done ? _jsx("s", { children: children }) : children] }));
}
function PhotoStrip({ shop, onAll }) {
    const { t } = useI18n();
    if (shop.photos.length === 0)
        return _jsx("p", { className: "photo-empty", children: t("shop.noPhotos") });
    return (_jsx("div", { className: "photo-strip", children: shop.photos.slice(0, 4).map((photo) => (_jsx("button", { type: "button", className: "photo-strip__item", onClick: onAll, children: _jsx("img", { src: photo.urls.medium, alt: photo.caption ?? t("shop.photoOf", { shop: shop.name }), loading: "lazy" }) }, photo.id))) }));
}
function PhotoGrid({ shop }) {
    const { t } = useI18n();
    if (shop.photos.length === 0)
        return _jsx("p", { className: "photo-empty", children: t("shop.noPhotos") });
    return (_jsx("div", { className: "photo-grid", children: shop.photos.map((photo) => (_jsx("a", { href: photo.urls.full, target: "_blank", rel: "noreferrer", children: _jsx("img", { src: photo.urls.thumb, alt: photo.caption ?? t("shop.photoOf", { shop: shop.name }), loading: "lazy" }) }, photo.id))) }));
}
function Reviews({ shopId }) {
    const { t } = useI18n();
    const { data, isPending } = useReviews(shopId, true);
    if (isPending)
        return _jsx("div", { className: "skeleton", style: { height: 120 } });
    if (!data || data.length === 0)
        return _jsx("p", { className: "notice", children: t("reviews.empty") });
    return (_jsx("ul", { className: "reviews", children: data.map((review) => (_jsxs("li", { className: "card review", children: [_jsxs("div", { className: "review__head", children: [_jsxs("span", { className: "review__who", children: ["@", review.user.handle] }), review.rating ? (_jsxs("span", { className: "mono review__rating", "aria-label": t("checkin.rateCups", { count: review.rating }), children: ["●".repeat(review.rating), _jsx("span", { className: "review__rating-rest", children: "●".repeat(5 - review.rating) })] })) : null] }), review.drink ? _jsx("span", { className: "review__drink", children: review.drink }) : null, review.note ? _jsx("p", { className: "review__note", children: review.note }) : null] }, review.id))) }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phCamera, phCoffee, phCoffeeFill, phPlus } from "@/ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import { candidatesAround, newIdempotencyKey } from "@/data/checkin";
import { useCatalog, useProfile } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { Seal } from "@/design/seal/Seal";
import { useI18n } from "@/i18n/context";
import { formatMeters } from "@/lib/distance";
import { openLocationSettings } from "@/location/locate";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticError, hapticSelection } from "@/telegram/haptics";
import { onDesktopTelegram } from "@/telegram/platform";
import { AddChip, FilterChip } from "@/ui/Chip";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { Radar } from "./Radar";
import "./checkin.css";
const DRINKS = ["macchiato", "buna", "spris"];
/**
 * Candidate confirm (DESIGN.md §5.3). The idempotency key is made the moment
 * the screen opens, so a retry after a dropped connection can never count
 * twice. Only the tap is needed; drink, note, rating and photo are optional.
 */
export function CheckIn({ shopId }) {
    const { t } = useI18n();
    const { back, replace } = useNavigation();
    const queryClient = useQueryClient();
    const location = useLocation();
    const catalog = useCatalog();
    const stamps = useStampsByShop();
    const { data: profile } = useProfile();
    const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
    const [selectedId, setSelectedId] = useState(null);
    const [drink, setDrink] = useState(null);
    const [noteOpen, setNoteOpen] = useState(false);
    const [note, setNote] = useState("");
    const [rating, setRating] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [outcome, setOutcome] = useState(null);
    const photoInput = useRef(null);
    const desktop = onDesktopTelegram();
    // A position from before this screen opened can't vouch for being here now.
    useEffect(() => {
        if (!desktop)
            void location.refresh();
    }, [desktop, location.refresh]);
    const fix = location.status === "locating" ? null : location.fix;
    const candidates = useMemo(() => (fix ? candidatesAround(catalog.data ?? [], fix) : []), [fix, catalog.data]);
    const inRange = candidates.filter((c) => c.inRange);
    useEffect(() => {
        if (inRange.length === 0)
            return;
        setSelectedId((current) => {
            if (current && inRange.some((c) => c.shop.id === current))
                return current;
            return inRange.find((c) => c.shop.id === shopId)?.shop.id ?? inRange[0].shop.id;
        });
    }, [inRange, shopId]);
    const selected = inRange.find((c) => c.shop.id === selectedId) ?? null;
    const selectedStamp = selected ? stamps.get(selected.shop.id) : undefined;
    async function submit() {
        if (!selected || !fix || submitting)
            return;
        setSubmitting(true);
        setOutcome(null);
        const wasAwake = profile?.had_cup_today ?? false;
        try {
            const { data } = await api.checkIn({
                shop_id: selected.shop.id,
                idempotency_key: idempotencyKey,
                latitude: fix.latitude,
                longitude: fix.longitude,
                accuracy_meters: fix.accuracyMeters,
                drink: drink ? t(`checkin.drink.${drink}`) : undefined,
                rating: rating ?? undefined,
                note: note.trim() || undefined,
            }, photo);
            for (const key of [["passport"], ["profile"], ["checkIns"], ["shop", selected.shop.id], ["leaderboard"], ["stats", "me"], ["badges"]]) {
                void queryClient.invalidateQueries({ queryKey: key });
            }
            replace({ name: "ceremony", checkIn: data, wasAwake });
        }
        catch (error) {
            hapticError();
            const code = error instanceof ApiRequestError ? error.rejectionCode : null;
            // The server keeps a rejected visit under its key, so the next attempt
            // needs a fresh one. A dropped connection keeps the key: that retry may
            // be the same visit landing twice.
            if (code)
                setIdempotencyKey(newIdempotencyKey());
            setOutcome(code ? { kind: "rejected", code, shop: selected.shop.name } : { kind: "failed" });
            setSubmitting(false);
        }
    }
    const ctaText = selected
        ? t(selectedStamp ? "checkin.cupAt" : "checkin.stampAt", { shop: selected.shop.name })
        : t("checkin.locate");
    const titleFirst = inRange.length === 0
        ? t("checkin.titleNone")
        : inRange.length === 1
            ? t("checkin.titleOne")
            : t("checkin.titleMany", { count: inRange.length });
    let body;
    if (desktop) {
        body = _jsx("p", { className: "notice", children: t("checkin.needsPhone") });
    }
    else if (!fix) {
        body = (_jsxs(_Fragment, { children: [_jsx(Headline, { first: t("checkin.locatingTitle"), second: t("checkin.locatingTitleB"), size: 32 }), location.status === "locating" || location.status === "idle" ? (_jsx("div", { className: "radar card radar--locating", "aria-busy": "true", children: _jsx("span", { className: "radar__pulse" }) })) : (_jsxs("div", { className: "notice notice--caution", children: [t(location.status === "denied" ? "checkin.locationDenied" : "checkin.locationUnavailable"), location.status === "denied" ? (_jsx("button", { type: "button", className: "link-button", onClick: () => openLocationSettings(), children: t("checkin.openSettings") })) : null] }))] }));
    }
    else if (outcome?.kind === "rejected") {
        body = (_jsxs(_Fragment, { children: [_jsx(Headline, { first: t("checkin.rejectedTitle"), second: t("checkin.rejectedTitleB"), size: 32 }), _jsxs("div", { className: "notice notice--caution", children: [t(`checkin.error.${outcome.code}`, { shop: outcome.shop }), outcome.code === "cooldown" ? _jsxs(_Fragment, { children: [_jsx("br", {}), t("checkin.cooldownHint")] }) : null, outcome.code === "too_far" ? _jsxs(_Fragment, { children: [_jsx("br", {}), t("checkin.error.too_far_action")] }) : null] }), _jsx(Radar, { fix: fix, candidates: candidates, selectedId: selectedId })] }));
    }
    else {
        body = (_jsxs(_Fragment, { children: [_jsx(Headline, { first: titleFirst, second: t("checkin.titleB"), size: 32 }), _jsx(Radar, { fix: fix, candidates: candidates, selectedId: selectedId }), inRange.length === 0 ? (_jsxs("p", { className: "notice", children: [t("checkin.noneNearby"), _jsx("br", {}), t("checkin.noneNearbyHint")] })) : (_jsx("div", { className: "candidates", role: "radiogroup", "aria-label": t("checkin.pickShop"), children: inRange.map(({ shop, distance }) => {
                        const stamp = stamps.get(shop.id);
                        const chosen = shop.id === selectedId;
                        return (_jsxs("button", { type: "button", role: "radio", "aria-checked": chosen, className: "candidate", onClick: () => {
                                hapticSelection();
                                setSelectedId(shop.id);
                            }, children: [_jsx(Seal, { name: shop.name, level: stamp?.level ?? null, size: 46, decorative: true }), _jsxs("span", { className: "candidate__text", children: [_jsx("span", { className: "candidate__name", children: shop.name }), _jsx("span", { className: "candidate__meta", children: stamp
                                                ? t("checkin.cupsSoFar", { distance: formatMeters(distance), count: stamp.check_ins_count })
                                                : t("checkin.firstStampHere", { distance: formatMeters(distance) }) })] }), _jsx("span", { className: stamp ? "candidate__badge candidate__badge--cup" : "candidate__badge", children: t(stamp ? "checkin.plusCup" : "checkin.newStamp") })] }, shop.id));
                    }) })), inRange.length > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "extras", children: [_jsxs("span", { className: "extras__prompt", children: [t("checkin.drinkPrompt"), " ", _jsx("span", { className: "extras__optional", children: t("common.optional") })] }), _jsxs("div", { className: "chip-wrap", role: "group", "aria-label": t("checkin.drink"), children: [DRINKS.map((key) => (_jsx(FilterChip, { selected: drink === key, onClick: () => setDrink((d) => (d === key ? null : key)), children: t(`checkin.drink.${key}`) }, key))), _jsx(AddChip, { pressed: noteOpen, onClick: () => setNoteOpen((open) => !open), icon: _jsx(Icon, { path: phPlus, size: 16 }), children: t("checkin.addNote") })] }), noteOpen ? (_jsxs("label", { className: "note", children: [_jsx("span", { className: "visually-hidden", children: t("checkin.note") }), _jsx("textarea", { value: note, maxLength: 280, rows: 2, placeholder: t("checkin.notePlaceholder"), onChange: (event) => setNote(event.target.value) })] })) : null] }), _jsxs("div", { className: "rating", children: [_jsx("span", { className: "rating__label", children: t("checkin.rate") }), _jsx("div", { className: "rating__cups", role: "group", "aria-label": t("checkin.rateGroup"), children: [1, 2, 3, 4, 5].map((n) => (_jsx("button", { type: "button", className: rating !== null && n <= rating ? "rating__cup rating__cup--on" : "rating__cup", "aria-label": t("checkin.rateCups", { count: n }), "aria-pressed": rating === n, onClick: () => setRating((r) => (r === n ? null : n)), children: _jsx(Icon, { path: rating !== null && n <= rating ? phCoffeeFill : phCoffee, size: 22 }) }, n))) }), _jsx("span", { className: "rating__divider", "aria-hidden": "true" }), _jsx("button", { type: "button", className: photo ? "rating__photo rating__photo--on" : "rating__photo", "aria-label": photo ? t("checkin.photoAdded") : t("shop.addPhoto"), onClick: () => photoInput.current?.click(), children: _jsx(Icon, { path: phCamera, size: 21 }) }), _jsx("input", { ref: photoInput, type: "file", accept: "image/jpeg,image/png,image/webp", capture: "environment", hidden: true, onChange: (event) => setPhoto(event.target.files?.[0] ?? null) })] })] })) : null, outcome?.kind === "failed" ? _jsx("p", { className: "notice notice--caution", children: t("checkin.error.generic") }) : null] }));
    }
    const ready = !desktop && fix && selected && outcome?.kind !== "rejected";
    return (_jsxs("main", { className: "screen checkin", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), body, desktop ? null : ready ? (_jsx(PrimaryAction, { text: ctaText, onClick: () => void submit(), loading: submitting })) : fix || location.status !== "locating" ? (_jsx(PrimaryAction, { text: outcome?.kind === "rejected" ? t("checkin.retry") : t("checkin.locate"), onClick: () => {
                    setOutcome(null);
                    void location.refresh();
                } })) : (_jsx(PrimaryAction, { text: t("checkin.locating"), onClick: () => undefined, loading: true }))] }));
}

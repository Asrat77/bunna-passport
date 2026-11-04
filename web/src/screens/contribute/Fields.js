import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ApiRequestError } from "@/api/errors";
import { useI18n } from "@/i18n/context";
import { PRICE_GLYPHS } from "@/lib/price";
import { useLocation } from "@/location/LocationProvider";
import { AddChip, FilterChip } from "@/ui/Chip";
import { Icon } from "@/ui/Icon";
import { phCrosshair, phPlus } from "@/ui/icons";
import { hoursValid, MAX_PIN_ACCURACY_METERS, PRICE_BANDS, WEEK } from "./form";
export function TextField({ label, hint, value, onChange, lang, maxLength = 120, }) {
    return (_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "form-field__label", children: label }), _jsx("input", { type: "text", value: value, lang: lang, maxLength: maxLength, onChange: (event) => onChange(event.target.value) }), hint ? _jsx("span", { className: "form-field__hint", children: hint }) : null] }));
}
export function AreaField({ areas, value, onChange, }) {
    const { t, language } = useI18n();
    return (_jsxs("label", { className: "form-field", children: [_jsx("span", { className: "form-field__label", children: t("contribute.area") }), _jsxs("select", { value: value ?? "", onChange: (event) => onChange(Number(event.target.value)), children: [value === null ? _jsx("option", { value: "", children: t("contribute.areaPick") }) : null, areas.map((area) => (_jsx("option", { value: area.id, children: language === "am" && area.name_am ? area.name_am : area.name }, area.id)))] })] }));
}
export function PriceField({ value, onChange }) {
    const { t } = useI18n();
    return (_jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { className: "form-field__label", children: t("contribute.price") }), _jsx("div", { className: "chip-wrap", children: PRICE_BANDS.map((band) => (_jsx(FilterChip, { selected: value === band, onClick: () => onChange(value === band ? null : band), children: PRICE_GLYPHS[band] }, band))) })] }));
}
export function HoursField({ value, onChange }) {
    const { t } = useI18n();
    if (!value.known) {
        return (_jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { className: "form-field__label", children: t("contribute.hours") }), _jsx("div", { className: "chip-wrap", children: _jsx(AddChip, { icon: _jsx(Icon, { path: phPlus, size: 16 }), onClick: () => onChange({ ...value, known: true }), children: t("contribute.hoursAdd") }) })] }));
    }
    const toggle = (day) => onChange({ ...value, days: value.days.includes(day) ? value.days.filter((d) => d !== day) : [...value.days, day] });
    return (_jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { className: "form-field__label", children: t("contribute.hours") }), _jsxs("div", { className: "hours-times", children: [_jsxs("label", { children: [_jsx("span", { children: t("contribute.opens") }), _jsx("input", { type: "time", value: value.opens, onChange: (event) => onChange({ ...value, opens: event.target.value }) })] }), _jsxs("label", { children: [_jsx("span", { children: t("contribute.closes") }), _jsx("input", { type: "time", value: value.closes, onChange: (event) => onChange({ ...value, closes: event.target.value }) })] })] }), _jsx("div", { className: "hours-days", role: "group", "aria-label": t("contribute.days"), children: WEEK.map((day) => (_jsx("button", { type: "button", "aria-pressed": value.days.includes(day), "aria-label": t(`day.${day}`), onClick: () => toggle(day), children: t(`day.${day}.short`) }, day))) }), value.varied ? _jsx("span", { className: "form-field__hint", children: t("contribute.hoursVaried") }) : null, !hoursValid(value) ? _jsx("span", { className: "form-field__hint form-field__hint--caution", children: t("contribute.hoursInvalid") }) : null, _jsx("button", { type: "button", className: "link-button form-field__aside", onClick: () => onChange({ ...value, known: false }), children: t("contribute.hoursUnsure") })] }));
}
/**
 * "The café is here": the person's own position becomes the pin. Nothing is
 * typed and nothing is dragged, which is what keeps the map honest.
 */
export function PinField({ label, idle, value, onChange, }) {
    const { t } = useI18n();
    const { refresh } = useLocation();
    const [state, setState] = useState(value ? "set" : "idle");
    const [accuracy, setAccuracy] = useState(null);
    async function locate() {
        setState("locating");
        const fix = await refresh();
        if (!fix) {
            setState("failed");
            return;
        }
        setAccuracy(Math.round(fix.accuracyMeters));
        if (fix.accuracyMeters > MAX_PIN_ACCURACY_METERS) {
            setState("vague");
            onChange(null);
            return;
        }
        setState("set");
        onChange({ latitude: fix.latitude, longitude: fix.longitude });
    }
    const status = {
        idle,
        locating: t("contribute.pinLocating"),
        vague: t("contribute.pinVague", { meters: accuracy ?? 0 }),
        failed: t("contribute.pinFailed"),
        set: t("contribute.pinSet", { meters: accuracy ?? 0 }),
    };
    return (_jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { className: "form-field__label", children: label }), _jsxs("div", { className: `pin-field pin-field--${state}`, children: [_jsx("span", { className: "pin-field__status", role: "status", children: status[state] }), _jsxs("button", { type: "button", className: "pin-field__button", onClick: () => void locate(), "aria-busy": state === "locating" || undefined, children: [_jsx(Icon, { path: phCrosshair, size: 18 }), state === "set" ? t("contribute.pinAgain") : t("contribute.pinHere")] })] })] }));
}
/** What went wrong, in words someone standing outside a café can act on. */
export function sendFailure(error) {
    if (error instanceof ApiRequestError) {
        if (error.status === 429)
            return "contribute.limit";
        if (error.status === 422 || error.status === 400)
            return "contribute.invalid";
        if (error.status === 401)
            return "contribute.signedOut";
    }
    return "contribute.failed";
}
export function FormError({ children }) {
    return (_jsx("p", { className: "notice notice--caution", role: "alert", children: children }));
}

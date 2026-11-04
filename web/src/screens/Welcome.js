import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useCatalog } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { Seal } from "@/design/seal/Seal";
import { InkStamp } from "@/design/stamp/InkStamp";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { PrimaryAction } from "@/telegram/buttons";
import { inTelegram } from "@/telegram/sdk";
import { Headline } from "@/ui/Headline";
import "./welcome.css";
const STEPS = [
    { title: "welcome.title1", titleB: "welcome.title1b", body: "welcome.body1" },
    { title: "welcome.title2", titleB: "welcome.title2b", body: "welcome.body2" },
    { title: "welcome.title3", titleB: "welcome.title3b", body: "welcome.body3" },
];
/**
 * First run (handoff, Welcome). Step 1 is the designed one; steps 2 and 3
 * aren't designed, so they reuse its parts: the metals a stamp climbs
 * through, and the doodle waking with a check-in as the location primer.
 */
export function Welcome({ onDone }) {
    const { t } = useI18n();
    const { telegramId, user } = useAuth();
    const catalog = useCatalog();
    const location = useLocation();
    const [step, setStep] = useState(0);
    const seed = user?.avatar_seed ?? telegramId ?? "bunna";
    const copy = STEPS[step];
    const last = step === STEPS.length - 1;
    return (_jsxs("main", { className: "screen screen--glow welcome", children: [_jsx("div", { className: "welcome__art", "aria-hidden": "true", children: step === 0 ? _jsx(Collage, { shops: catalog.data ?? [], seed: seed }) : step === 1 ? _jsx(Metals, {}) : _jsx(Waking, { seed: seed }) }), _jsxs("div", { className: "welcome__copy", children: [_jsx(Headline, { first: t(copy.title), second: t(copy.titleB), size: 36 }), _jsx("p", { className: "welcome__body", children: t(copy.body) }), _jsx("div", { className: "welcome__dots", role: "img", "aria-label": t("welcome.step", { step: step + 1 }), children: STEPS.map((_, index) => (_jsx("span", { className: index === step ? "welcome__dot welcome__dot--on" : "welcome__dot" }, index))) })] }), inTelegram ? _jsx("p", { className: "welcome__signed-in", children: t("welcome.signedIn") }) : null, _jsx(PrimaryAction, { text: t(last ? "welcome.start" : "welcome.next"), onClick: () => {
                    if (!last)
                        return setStep(step + 1);
                    // The primer's button is the moment to ask, never before it.
                    void location.refresh();
                    onDone();
                } })] }));
}
function Ticket({ shop, level, rotation, style }) {
    const { t } = useI18n();
    return (_jsxs("div", { className: level ? "ticket" : "ticket ticket--missing", style: { ...style, transform: `rotate(${rotation}deg)` }, children: [_jsx(Seal, { name: shop.name, level: level, size: 40, decorative: true }), _jsxs("span", { className: "ticket__text", children: [_jsx("span", { className: "ticket__name", children: shop.name }), _jsx("span", { className: "ticket__meta mono", children: level ? shop.neighborhood.name : t("shop.notYet") })] })] }));
}
function Collage({ shops, seed }) {
    const { t } = useI18n();
    const picks = [...shops].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 3);
    return (_jsxs("div", { className: "collage", children: [picks[0] ? _jsx(Ticket, { shop: picks[0], level: "silver", rotation: -11, style: { left: "6%", top: 34 } }) : null, picks[1] ? _jsx(Ticket, { shop: picks[1], level: "bronze", rotation: 9, style: { right: "4%", top: 18 } }) : null, _jsx("div", { className: "collage__disc", children: _jsx(InkStamp, { name: "BUNNA", amharic: "\u1261\u1293 \u1353\u1235\u1356\u122D\u1275", date: t("welcome.firstStamp"), level: "clay", size: 164, rotation: -8, label: "" }) }), picks[2] ? _jsx(Ticket, { shop: picks[2], level: null, rotation: 7, style: { left: "4%", top: 244 } }) : null, _jsxs("div", { className: "ticket", style: { right: "5%", top: 236, transform: "rotate(-8deg)" }, children: [_jsx(Doodle, { seed: seed, mood: "awake", size: 44, decorative: true }), _jsxs("span", { className: "ticket__text", children: [_jsx("span", { className: "ticket__name", children: t("welcome.you") }), _jsx("span", { className: "ticket__meta mono", children: t("welcome.afterCoffee") })] })] })] }));
}
function Metals() {
    const { t } = useI18n();
    const levels = ["bronze", "silver", "gold", "diamond"];
    return (_jsxs("div", { className: "metals", children: [_jsx("div", { className: "collage__disc collage__disc--static", children: _jsx(InkStamp, { name: "BUNNA", amharic: "\u1261\u1293 \u1353\u1235\u1356\u122D\u1275", date: t("welcome.firstStamp"), level: "clay", size: 164, rotation: -8, label: "" }) }), _jsx("div", { className: "metals__row", children: levels.map((level) => (_jsxs("span", { className: "metals__seal", children: [_jsx(Seal, { name: "Bunna", level: level, size: 52, decorative: true }), _jsx("span", { className: "mono", children: t(`level.${level}`) })] }, level))) })] }));
}
function Waking({ seed }) {
    return (_jsxs("div", { className: "waking", children: [_jsx(Doodle, { seed: seed, mood: "sleepy", size: 120, decorative: true }), _jsx("span", { className: "waking__arrow", children: "\u2192" }), _jsx(Doodle, { seed: seed, mood: "awake", size: 120, decorative: true })] }));
}

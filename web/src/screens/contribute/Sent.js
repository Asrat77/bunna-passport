import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useMyDoodle } from "@/data/me";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
/** The thank-you after a suggestion, a new café or a report goes in. */
export function Sent({ body }) {
    const { t } = useI18n();
    const { back } = useNavigation();
    const doodle = useMyDoodle();
    useEffect(() => {
        hapticSuccess();
    }, []);
    return (_jsxs("main", { className: "screen screen--glow contribute-sent", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsx("div", { className: "contribute-sent__doodle", children: _jsx(Doodle, { seed: doodle.seed, traits: doodle.traits, mood: "awake", size: 96, decorative: true }) }), _jsx(Headline, { first: t("sent.titleA"), second: t("sent.titleB"), size: 30, align: "center" }), _jsx("p", { className: "contribute-sent__body", children: t(body) }), _jsx(PrimaryAction, { text: t("sent.done"), onClick: back })] }));
}

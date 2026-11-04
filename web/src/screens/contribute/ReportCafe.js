import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import { useShop } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticError } from "@/telegram/haptics";
import { FilterChip } from "@/ui/Chip";
import { Headline } from "@/ui/Headline";
import { FormError, sendFailure } from "./Fields";
import { Sent } from "./Sent";
import "./contribute.css";
/**
 * Report::reason values that make sense for a café, most common first. Wrong
 * hours or a misplaced pin are better sent as an edit, which fixes them.
 */
const REASONS = ["closed", "duplicate", "wrong_location", "inaccurate_details", "other"];
export function ReportCafe({ shopId }) {
    const { t } = useI18n();
    const { back, replace } = useNavigation();
    const { data: shop } = useShop(shopId);
    const [reason, setReason] = useState(null);
    const [note, setNote] = useState("");
    const send = useMutation({
        mutationFn: async () => (await api.report({
            reportable_type: "shop",
            reportable_id: shopId,
            reason: reason,
            note: note.trim() || undefined,
        })).data,
        onError: hapticError,
    });
    if (send.data)
        return _jsx(Sent, { body: "sent.report" });
    const fixable = reason === "wrong_location" || reason === "inaccurate_details";
    return (_jsxs("main", { className: "screen contribute", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsx(Headline, { first: t("reportCafe.titleA"), second: t("reportCafe.titleB"), size: 30 }), _jsx("p", { className: "contribute__body", children: t("reportCafe.body", { name: shop?.name ?? "" }) }), _jsxs("fieldset", { className: "form-field", children: [_jsx("legend", { className: "form-field__label", children: t("reportCafe.reason") }), _jsx("div", { className: "chip-wrap", children: REASONS.map((option) => (_jsx(FilterChip, { selected: reason === option, onClick: () => setReason(option), children: t(`report.reason.${option}`) }, option))) })] }), fixable ? (_jsxs("p", { className: "notice", children: [t("reportCafe.fixInstead"), " ", _jsx("button", { type: "button", className: "link-button contribute__inline-link", onClick: () => replace({ name: "suggestEdit", shopId }), children: t("suggest.entry") })] })) : null, _jsxs("label", { className: "form-field", children: [_jsxs("span", { className: "form-field__label", children: [t("reportCafe.note"), " ", _jsx("span", { className: "form-field__optional", children: t("common.optional") })] }), _jsx("textarea", { value: note, rows: 3, maxLength: 1000, placeholder: t(reason === "duplicate" ? "reportCafe.notePlaceholderDuplicate" : "reportCafe.notePlaceholder"), onChange: (event) => setNote(event.target.value) })] }), send.isError ? _jsx(FormError, { children: t(sendFailure(send.error)) }) : null, _jsx(PrimaryAction, { text: t("reportCafe.send"), disabled: !reason, loading: send.isPending, onClick: () => reason && !send.isPending && send.mutate() })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/api/client";
import { useCatalog, useShop } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticError } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { AreaField, FormError, HoursField, PinField, PriceField, sendFailure, TextField } from "./Fields";
import { editFormFor, hoursValid, neighborhoodsOf, proposedChanges } from "./form";
import { Sent } from "./Sent";
import "./contribute.css";
export function SuggestEdit({ shopId }) {
    const { t } = useI18n();
    const { back } = useNavigation();
    const { data: shop, isPending, isError, refetch } = useShop(shopId);
    if (isPending) {
        return (_jsxs("main", { className: "screen contribute", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsx("div", { className: "skeleton", style: { height: 320 } })] }));
    }
    if (isError || !shop) {
        return (_jsxs("main", { className: "screen contribute", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsxs("div", { className: "notice notice--caution", children: [t("common.somethingWrong"), " ", _jsx("button", { type: "button", className: "link-button", onClick: () => void refetch(), children: t("common.retry") })] })] }));
    }
    return _jsx(EditBody, { shop: shop });
}
function EditBody({ shop }) {
    const { t, language } = useI18n();
    const { back } = useNavigation();
    const queryClient = useQueryClient();
    const catalog = useCatalog();
    const [form, setForm] = useState(() => editFormFor(shop));
    const areas = useMemo(() => neighborhoodsOf(catalog.data ?? [shop], language), [catalog.data, shop, language]);
    const changes = proposedChanges(shop, form);
    const dirty = Object.keys(changes).length > 0;
    const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
    const send = useMutation({
        mutationFn: async () => (await api.suggestEdit(shop.id, changes)).data,
        onSuccess: (contribution) => {
            if (contribution.status !== "pending") {
                void queryClient.invalidateQueries({ queryKey: ["shop", shop.id] });
                void queryClient.invalidateQueries({ queryKey: ["catalog"] });
            }
        },
        onError: hapticError,
    });
    if (send.data)
        return _jsx(Sent, { body: send.data.status === "pending" ? "sent.editPending" : "sent.editLive" });
    return (_jsxs("main", { className: "screen contribute", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsx(Headline, { first: t("suggest.titleA"), second: t("suggest.titleB"), size: 30 }), _jsx("p", { className: "contribute__body", children: t("suggest.body", { name: shop.name }) }), _jsx(TextField, { label: t("contribute.name"), value: form.name, onChange: set("name") }), _jsx(TextField, { label: t("contribute.nameAm"), value: form.nameAm, onChange: set("nameAm"), lang: "am" }), _jsx(TextField, { label: t("contribute.landmark"), hint: t("contribute.landmarkHint"), value: form.landmark, onChange: set("landmark"), maxLength: 200 }), _jsx(AreaField, { areas: areas, value: form.neighborhoodId, onChange: set("neighborhoodId") }), _jsx(HoursField, { value: form.hours, onChange: set("hours") }), _jsx(PriceField, { value: form.priceBand, onChange: set("priceBand") }), _jsx(PinField, { label: t("contribute.location"), idle: t("suggest.pinIdle"), value: form.pin, onChange: set("pin") }), send.isError ? _jsx(FormError, { children: t(sendFailure(send.error)) }) : null, _jsx(PrimaryAction, { text: dirty ? t("suggest.send") : t("suggest.noChanges"), disabled: !dirty || !hoursValid(form.hours), loading: send.isPending, onClick: () => {
                    if (dirty && !send.isPending)
                        send.mutate();
                } })] }));
}

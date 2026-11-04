import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import { useCatalog } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction, SecondaryAction } from "@/telegram/buttons";
import { hapticError } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { ShopRow } from "@/ui/ShopRow";
import { AreaField, FormError, HoursField, PinField, PriceField, sendFailure, TextField } from "./Fields";
import { DEFAULT_HOURS, hoursValid, nearestNeighborhood, neighborhoodsOf, submissionFor } from "./form";
import { Sent } from "./Sent";
import "./contribute.css";
/**
 * Adding a café asks for what a moderator can't work out alone: both names,
 * and the landmark that finds it without a street address. The pin comes
 * from standing there, not from typing. `cafeName` carries over a search that
 * found nothing.
 */
export function AddCafe({ cafeName: initialName = "" }) {
    const { t, language } = useI18n();
    const { back, replace } = useNavigation();
    const queryClient = useQueryClient();
    const catalog = useCatalog();
    const shops = catalog.data ?? [];
    const [name, setName] = useState(initialName.trim());
    const [nameAm, setNameAm] = useState("");
    const [landmark, setLandmark] = useState("");
    const [neighborhoodId, setNeighborhoodId] = useState(null);
    const [priceBand, setPriceBand] = useState(null);
    const [hours, setHours] = useState(DEFAULT_HOURS);
    const [pin, setPin] = useState(null);
    const [duplicates, setDuplicates] = useState(null);
    const areas = useMemo(() => neighborhoodsOf(shops, language), [shops, language]);
    // Standing somewhere is the best guess at which area it is.
    useEffect(() => {
        if (pin && neighborhoodId === null)
            setNeighborhoodId(nearestNeighborhood(shops, pin));
    }, [pin, neighborhoodId, shops]);
    const complete = name.trim().length > 0 && nameAm.trim().length > 0 && landmark.trim().length > 0 && neighborhoodId !== null && pin !== null && hoursValid(hours);
    const send = useMutation({
        mutationFn: async (override) => {
            if (!pin || neighborhoodId === null)
                throw new Error("incomplete");
            return (await api.submitShop(submissionFor({ name, nameAm, landmark, neighborhoodId, priceBand, hours, pin }, override))).data;
        },
        onSuccess: (contribution) => {
            if (contribution.status !== "pending")
                void queryClient.invalidateQueries({ queryKey: ["catalog"] });
        },
        onError: (error) => {
            // A 409 names the cafés this might already be. That's a question for
            // the person standing there, not a failure.
            if (error instanceof ApiRequestError && error.isDuplicateCandidates) {
                setDuplicates(Array.isArray(error.details) ? error.details : []);
                return;
            }
            hapticError();
        },
    });
    if (send.data)
        return _jsx(Sent, { body: send.data.status === "pending" ? "sent.cafePending" : "sent.cafeLive" });
    if (duplicates) {
        return (_jsxs("main", { className: "screen contribute", children: [_jsx(BackControl, { onBack: () => setDuplicates(null), label: t("common.back") }), _jsx(Headline, { first: t("addCafe.duplicateTitleA"), second: t("addCafe.duplicateTitleB"), size: 30 }), _jsx("p", { className: "contribute__body", children: t("addCafe.duplicateBody") }), _jsx("ul", { className: "shop-list", children: duplicates.map((shop) => (_jsx("li", { children: _jsx(ShopRow, { shop: shop, stamp: undefined, distance: null, onOpen: () => replace({ name: "shop", id: shop.id }) }) }, shop.id))) }), send.isError && !(send.error instanceof ApiRequestError && send.error.isDuplicateCandidates) ? (_jsx(FormError, { children: t(sendFailure(send.error)) })) : null, _jsx(PrimaryAction, { text: t("addCafe.different"), loading: send.isPending, onClick: () => !send.isPending && send.mutate(true) }), _jsx(SecondaryAction, { text: t("common.cancel"), onClick: back })] }));
    }
    return (_jsxs("main", { className: "screen contribute", children: [_jsx(BackControl, { onBack: back, label: t("common.back") }), _jsx(Headline, { first: t("addCafe.titleA"), second: t("addCafe.titleB"), size: 30 }), _jsx("p", { className: "contribute__body", children: t("addCafe.body") }), _jsx(PinField, { label: t("contribute.location"), idle: t("addCafe.pinIdle"), value: pin, onChange: setPin }), _jsx(TextField, { label: t("contribute.name"), value: name, onChange: setName }), _jsx(TextField, { label: t("contribute.nameAm"), value: nameAm, onChange: setNameAm, lang: "am" }), _jsx(TextField, { label: t("contribute.landmark"), hint: t("contribute.landmarkHint"), value: landmark, onChange: setLandmark, maxLength: 200 }), _jsx(AreaField, { areas: areas, value: neighborhoodId, onChange: setNeighborhoodId }), _jsx(HoursField, { value: hours, onChange: setHours }), _jsx(PriceField, { value: priceBand, onChange: setPriceBand }), send.isError && !(send.error instanceof ApiRequestError && send.error.isDuplicateCandidates) ? (_jsx(FormError, { children: t(sendFailure(send.error)) })) : null, _jsx(PrimaryAction, { text: complete ? t("addCafe.send") : t("addCafe.incomplete"), disabled: !complete, loading: send.isPending, onClick: () => complete && !send.isPending && send.mutate(false) })] }));
}

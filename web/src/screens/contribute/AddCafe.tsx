import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import type { OpaqueId, PriceBand, Shop } from "@/api/types";
import { useCatalog } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import type { Coordinate } from "@/lib/distance";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction, SecondaryAction } from "@/telegram/buttons";
import { hapticError } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { ShopRow } from "@/ui/ShopRow";
import { AreaField, FormError, HoursField, PhotoField, PinField, PriceField, sendFailure, TextField } from "./Fields";
import { DEFAULT_HOURS, hoursValid, nearestNeighborhood, neighborhoodsOf, submissionFor, type HoursForm } from "./form";
import { Sent } from "./Sent";
import "./contribute.css";

/**
 * Adding a café asks for what a moderator can't work out alone: both names,
 * and the landmark that finds it without a street address. The pin comes
 * from standing there, not from typing. `cafeName` carries over a search that
 * found nothing.
 */
export function AddCafe({ cafeName: initialName = "" }: { cafeName?: string }) {
  const { t, language } = useI18n();
  const { back, replace } = useNavigation();
  const queryClient = useQueryClient();
  const catalog = useCatalog();
  const shops = catalog.data ?? [];

  const [name, setName] = useState(initialName.trim());
  const [nameAm, setNameAm] = useState("");
  const [landmark, setLandmark] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState<OpaqueId | null>(null);
  const [priceBand, setPriceBand] = useState<PriceBand | null>(null);
  const [hours, setHours] = useState<HoursForm>(DEFAULT_HOURS);
  const [pin, setPin] = useState<Coordinate | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<Shop[] | null>(null);

  const areas = useMemo(() => neighborhoodsOf(shops, language), [shops, language]);

  // Standing somewhere is the best guess at which area it is.
  useEffect(() => {
    if (pin && neighborhoodId === null) setNeighborhoodId(nearestNeighborhood(shops, pin));
  }, [pin, neighborhoodId, shops]);

  const complete =
    name.trim().length > 0 && nameAm.trim().length > 0 && landmark.trim().length > 0 && neighborhoodId !== null && pin !== null && hoursValid(hours);

  const send = useMutation({
    mutationFn: async (override: boolean) => {
      if (!pin || neighborhoodId === null) throw new Error("incomplete");
      return (await api.submitShop(submissionFor({ name, nameAm, landmark, neighborhoodId, priceBand, hours, pin }, override), photo)).data;
    },
    onSuccess: (contribution) => {
      if (contribution.status !== "pending") void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (error) => {
      // A 409 names the cafés this might already be. That's a question for
      // the person standing there, not a failure.
      if (error instanceof ApiRequestError && error.isDuplicateCandidates) {
        setDuplicates(Array.isArray(error.details) ? (error.details as Shop[]) : []);
        return;
      }
      hapticError();
    },
  });

  if (send.data) return <Sent body={send.data.status === "pending" ? "sent.cafePending" : "sent.cafeLive"} />;

  if (duplicates) {
    return (
      <main className="screen contribute">
        <BackControl onBack={() => setDuplicates(null)} label={t("common.back")} />
        <Headline first={t("addCafe.duplicateTitleA")} second={t("addCafe.duplicateTitleB")} size={30} />
        <p className="contribute__body">{t("addCafe.duplicateBody")}</p>
        <ul className="shop-list">
          {duplicates.map((shop) => (
            <li key={shop.id}>
              <ShopRow shop={shop} stamp={undefined} distance={null} onOpen={() => replace({ name: "shop", id: shop.id })} />
            </li>
          ))}
        </ul>
        {send.isError && !(send.error instanceof ApiRequestError && send.error.isDuplicateCandidates) ? (
          <FormError>{t(sendFailure(send.error))}</FormError>
        ) : null}
        <PrimaryAction text={t("addCafe.different")} loading={send.isPending} onClick={() => !send.isPending && send.mutate(true)} />
        <SecondaryAction text={t("common.cancel")} onClick={back} />
      </main>
    );
  }

  return (
    <main className="screen contribute">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("addCafe.titleA")} second={t("addCafe.titleB")} size={30} />
      <p className="contribute__body">{t("addCafe.body")}</p>

      <PinField label={t("contribute.location")} idle={t("addCafe.pinIdle")} value={pin} onChange={setPin} />
      <TextField label={t("contribute.name")} value={name} onChange={setName} />
      <TextField label={t("contribute.nameAm")} value={nameAm} onChange={setNameAm} lang="am" />
      <TextField label={t("contribute.landmark")} hint={t("contribute.landmarkHint")} value={landmark} onChange={setLandmark} maxLength={200} />
      <AreaField areas={areas} value={neighborhoodId} onChange={setNeighborhoodId} />
      <HoursField value={hours} onChange={setHours} />
      <PriceField value={priceBand} onChange={setPriceBand} />
      <PhotoField value={photo} onChange={setPhoto} />

      {send.isError && !(send.error instanceof ApiRequestError && send.error.isDuplicateCandidates) ? (
        <FormError>{t(sendFailure(send.error))}</FormError>
      ) : null}

      <PrimaryAction
        text={complete ? t("addCafe.send") : t("addCafe.incomplete")}
        disabled={!complete}
        loading={send.isPending}
        onClick={() => complete && !send.isPending && send.mutate(false)}
      />
    </main>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/api/client";
import type { OpaqueId, ShopDetail } from "@/api/types";
import { useCatalog, useShop } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticError } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { AreaField, FormError, HoursField, PinField, PriceField, sendFailure, TextField } from "./Fields";
import { editFormFor, hoursValid, neighborhoodsOf, proposedChanges, type EditForm } from "./form";
import { Sent } from "./Sent";
import "./contribute.css";

export function SuggestEdit({ shopId }: { shopId: OpaqueId }) {
  const { t } = useI18n();
  const { back } = useNavigation();
  const { data: shop, isPending, isError, refetch } = useShop(shopId);

  if (isPending) {
    return (
      <main className="screen contribute">
        <BackControl onBack={back} label={t("common.back")} />
        <div className="skeleton" style={{ height: 320 }} />
      </main>
    );
  }
  if (isError || !shop) {
    return (
      <main className="screen contribute">
        <BackControl onBack={back} label={t("common.back")} />
        <div className="notice notice--caution">
          {t("common.somethingWrong")}{" "}
          <button type="button" className="link-button" onClick={() => void refetch()}>
            {t("common.retry")}
          </button>
        </div>
      </main>
    );
  }
  return <EditBody shop={shop} />;
}

function EditBody({ shop }: { shop: ShopDetail }) {
  const { t, language } = useI18n();
  const { back } = useNavigation();
  const queryClient = useQueryClient();
  const catalog = useCatalog();
  const [form, setForm] = useState<EditForm>(() => editFormFor(shop));
  const areas = useMemo(() => neighborhoodsOf(catalog.data ?? [shop], language), [catalog.data, shop, language]);
  const changes = proposedChanges(shop, form);
  const dirty = Object.keys(changes).length > 0;
  const set = <K extends keyof EditForm>(key: K) => (value: EditForm[K]) => setForm((f) => ({ ...f, [key]: value }));

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

  if (send.data) return <Sent body={send.data.status === "pending" ? "sent.editPending" : "sent.editLive"} />;

  return (
    <main className="screen contribute">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("suggest.titleA")} second={t("suggest.titleB")} size={30} />
      <p className="contribute__body">{t("suggest.body", { name: shop.name })}</p>

      <TextField label={t("contribute.name")} value={form.name} onChange={set("name")} />
      <TextField label={t("contribute.nameAm")} value={form.nameAm} onChange={set("nameAm")} lang="am" />
      <TextField label={t("contribute.landmark")} hint={t("contribute.landmarkHint")} value={form.landmark} onChange={set("landmark")} maxLength={200} />
      <AreaField areas={areas} value={form.neighborhoodId} onChange={set("neighborhoodId")} />
      <HoursField value={form.hours} onChange={set("hours")} />
      <PriceField value={form.priceBand} onChange={set("priceBand")} />
      <PinField label={t("contribute.location")} idle={t("suggest.pinIdle")} value={form.pin} onChange={set("pin")} />

      {send.isError ? <FormError>{t(sendFailure(send.error))}</FormError> : null}

      <PrimaryAction
        text={dirty ? t("suggest.send") : t("suggest.noChanges")}
        disabled={!dirty || !hoursValid(form.hours)}
        loading={send.isPending}
        onClick={() => {
          if (dirty && !send.isPending) send.mutate();
        }}
      />
    </main>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import type { OpaqueId } from "@/api/types";
import { useShop } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticError } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { FormError, sendFailure } from "../contribute/Fields";
import { Sent } from "../contribute/Sent";
import "../contribute/contribute.css";

/**
 * "Claim this café": asks the moderators to make the caller its owner. They
 * check with the café first, so the note says who they are there.
 */
export function ClaimCafe({ shopId }: { shopId: OpaqueId }) {
  const { t } = useI18n();
  const { back } = useNavigation();
  const queryClient = useQueryClient();
  const { data: shop } = useShop(shopId);
  const [note, setNote] = useState("");

  const send = useMutation({
    mutationFn: async () => (await api.claimShop(shopId, note.trim() || undefined)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["shopAccounts"] }),
    onError: hapticError,
  });

  if (send.data) return <Sent body="claim.sent" />;

  return (
    <main className="screen contribute">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("claim.titleA")} second={t("claim.titleB")} size={30} />
      <p className="contribute__body">{t("claim.body", { name: shop?.name ?? "" })}</p>

      <label className="form-field">
        <span className="form-field__label">{t("claim.note")}</span>
        <textarea
          value={note}
          rows={3}
          maxLength={500}
          placeholder={t("claim.notePlaceholder")}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {send.isError ? <FormError>{t(sendFailure(send.error))}</FormError> : null}

      <PrimaryAction text={t("claim.send")} disabled={!note.trim()} loading={send.isPending} onClick={() => note.trim() && !send.isPending && send.mutate()} />
    </main>
  );
}

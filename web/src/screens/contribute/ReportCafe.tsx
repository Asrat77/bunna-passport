import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import type { OpaqueId } from "@/api/types";
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
const REASONS = ["closed", "duplicate", "wrong_location", "inaccurate_details", "other"] as const;
type Reason = (typeof REASONS)[number];

export function ReportCafe({ shopId }: { shopId: OpaqueId }) {
  const { t } = useI18n();
  const { back, replace } = useNavigation();
  const { data: shop } = useShop(shopId);
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState("");

  const send = useMutation({
    mutationFn: async () =>
      (
        await api.report({
          reportable_type: "shop",
          reportable_id: shopId,
          reason: reason!,
          note: note.trim() || undefined,
        })
      ).data,
    onError: hapticError,
  });

  if (send.data) return <Sent body="sent.report" />;

  const fixable = reason === "wrong_location" || reason === "inaccurate_details";

  return (
    <main className="screen contribute">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("reportCafe.titleA")} second={t("reportCafe.titleB")} size={30} />
      <p className="contribute__body">{t("reportCafe.body", { name: shop?.name ?? "" })}</p>

      <fieldset className="form-field">
        <legend className="form-field__label">{t("reportCafe.reason")}</legend>
        <div className="chip-wrap">
          {REASONS.map((option) => (
            <FilterChip key={option} selected={reason === option} onClick={() => setReason(option)}>
              {t(`report.reason.${option}`)}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      {fixable ? (
        <p className="notice">
          {t("reportCafe.fixInstead")}{" "}
          <button type="button" className="link-button contribute__inline-link" onClick={() => replace({ name: "suggestEdit", shopId })}>
            {t("suggest.entry")}
          </button>
        </p>
      ) : null}

      <label className="form-field">
        <span className="form-field__label">
          {t("reportCafe.note")} <span className="form-field__optional">{t("common.optional")}</span>
        </span>
        <textarea
          value={note}
          rows={3}
          maxLength={1000}
          placeholder={t(reason === "duplicate" ? "reportCafe.notePlaceholderDuplicate" : "reportCafe.notePlaceholder")}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {send.isError ? <FormError>{t(sendFailure(send.error))}</FormError> : null}

      <PrimaryAction
        text={t("reportCafe.send")}
        disabled={!reason}
        loading={send.isPending}
        onClick={() => reason && !send.isPending && send.mutate()}
      />
    </main>
  );
}

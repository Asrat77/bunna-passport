import { phCheck } from "@/ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api/client";
import type { CheckIn, ReviewTag, Saying } from "@/api/types";
import { DRINKS, MAX_TAGS, PRICE_MAX_BIRR, REVIEW_TAGS, isDrink } from "@/data/reviews";
import { useI18n } from "@/i18n/context";
import { hapticError, hapticSuccess } from "@/telegram/haptics";
import { FilterChip } from "@/ui/Chip";
import { Icon } from "@/ui/Icon";
import { RatingCups } from "./RatingCups";
import "./review.css";

type Visit = Pick<CheckIn, "id" | "shop" | "rating" | "note" | "drink" | "tags" | "price_birr">;

/**
 * "How was it?" for one visit. A tap on a cup saves the rating straight
 * away, so one tap is a whole review; tags, the drink, the price and a note
 * open underneath for anyone who wants to say more.
 */
export function ReviewComposer({ visit, onSaved }: { visit: Visit; onSaved?: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number | null>(visit.rating);
  const [tags, setTags] = useState<ReviewTag[]>(visit.tags ?? []);
  const [drink, setDrink] = useState<string | null>(isDrink(visit.drink) ? visit.drink : null);
  const [price, setPrice] = useState(visit.price_birr ? String(visit.price_birr) : "");
  const [note, setNote] = useState(visit.note ?? "");
  const [done, setDone] = useState(false);

  const save = useMutation({
    mutationFn: async (saying: Saying) => (await api.updateCheckIn(visit.id, saying)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviews", visit.shop.id] });
      void queryClient.invalidateQueries({ queryKey: ["checkIns"] });
      void queryClient.invalidateQueries({ queryKey: ["stats", "me"] });
    },
    onError: hapticError,
  });

  const priceBirr = price.trim() === "" ? undefined : Number(price);
  const priceValid = priceBirr === undefined || (Number.isInteger(priceBirr) && priceBirr >= 1 && priceBirr <= PRICE_MAX_BIRR);

  function rate(next: number | null) {
    if (next === null) return;
    setRating(next);
    save.mutate({ rating: next });
  }

  function toggleTag(tag: ReviewTag) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : current.length >= MAX_TAGS ? current : [...current, tag]));
  }

  function finish() {
    if (!priceValid || save.isPending) return;
    save.mutate(
      {
        ...(rating ? { rating } : {}),
        tags,
        ...(drink ? { drink } : {}),
        ...(priceBirr !== undefined ? { price_birr: priceBirr } : {}),
        note: note.trim(),
      },
      {
        onSuccess: () => {
          hapticSuccess();
          setDone(true);
          onSaved?.();
        },
      },
    );
  }

  if (done) {
    return (
      <section className="composer composer--done" role="status">
        <span className="composer__tick" aria-hidden="true">
          <Icon path={phCheck} size={20} />
        </span>
        <div>
          <p className="composer__title">{t("review.thanksTitle")}</p>
          <p className="muted composer__sub">{t("review.thanksBody", { shop: visit.shop.name })}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="composer" aria-labelledby={`composer-${visit.id}`}>
      <p id={`composer-${visit.id}`} className="composer__title">
        {t("review.howWas", { shop: visit.shop.name })}
      </p>
      <RatingCups value={rating} onChange={rate} />
      <p className="muted composer__sub" aria-live="polite">
        {save.isError ? t("review.saveFailed") : rating ? t("review.ratingSaved") : t("review.tapToRate")}
      </p>

      {rating ? (
        <div className="composer__more">
          <fieldset className="composer__group">
            <legend className="composer__label">{t("review.tagsPrompt")}</legend>
            <div className="chip-wrap">
              {REVIEW_TAGS.map((tag) => (
                <FilterChip key={tag} selected={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {t(`tag.${tag}`)}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <fieldset className="composer__group">
            <legend className="composer__label">
              {t("review.paidPrompt")} <span className="composer__optional">{t("common.optional")}</span>
            </legend>
            <div className="chip-wrap">
              {DRINKS.map((key) => (
                <FilterChip key={key} selected={drink === key} onClick={() => setDrink((d) => (d === key ? null : key))}>
                  {t(`drink.${key}`)}
                </FilterChip>
              ))}
            </div>
            <label className="composer__price">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={PRICE_MAX_BIRR}
                step={1}
                value={price}
                placeholder={t("review.pricePlaceholder")}
                aria-label={t("review.priceLabel")}
                aria-invalid={!priceValid}
                onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
              />
              <span className="composer__unit">{t("review.birr")}</span>
            </label>
          </fieldset>

          <label className="composer__group">
            <span className="composer__label">
              {t("checkin.note")} <span className="composer__optional">{t("common.optional")}</span>
            </span>
            <textarea value={note} maxLength={280} rows={2} placeholder={t("review.notePlaceholder")} onChange={(event) => setNote(event.target.value)} />
          </label>

          <button type="button" className="composer__save" onClick={finish} disabled={!priceValid || save.isPending}>
            {save.isPending ? t("review.saving") : t("review.save")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

import { phCoffeeFill, phDotsThreeVertical } from "@/ui/icons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import type { CheckIn, Review, ReviewFilter, ReviewSummary } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { doodleSeedFor, doodleTraitsFor } from "@/data/me";
import { useRecentCheckIns, useReviewSummary, useReviews } from "@/data/queries";
import { drinkLabel, reviewDate } from "@/data/reviews";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { hapticError, hapticSuccess } from "@/telegram/haptics";
import { FilterChip, TagChip } from "@/ui/Chip";
import { Icon } from "@/ui/Icon";
import { CupScore } from "./RatingCups";
import { ReviewComposer } from "./ReviewComposer";
import "./review.css";

/** A week, matching the server's window for saying something about a visit. */
const SAYING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The viewer's latest visit here that is still open for a review and had no
 * rating when the page opened, so the café page can ask about it. It stays
 * put once found, so rating it doesn't whisk the form away mid-review.
 */
export function useVisitToReview(shopId: number): CheckIn | null {
  const { data } = useRecentCheckIns();
  const [kept, setKept] = useState<CheckIn | null>(null);
  const latest = (data ?? []).find((c) => c.shop.id === shopId && c.status === "accepted");
  const open = latest && !latest.rating && Date.now() - new Date(latest.occurred_at).getTime() < SAYING_WINDOW_MS ? latest : null;
  useEffect(() => {
    if (open && !kept) setKept(open);
  }, [open, kept]);
  return kept ?? open;
}

/** "4.3 ☕ · 12 ratings" under the café's name; a tap opens the Reviews tab. */
export function ScoreLine({ shopId, onOpen }: { shopId: number; onOpen: () => void }) {
  const { t } = useI18n();
  const { data: summary } = useReviewSummary(shopId);
  if (!summary) return null;
  const rated = summary.rating_average !== null && summary.rating_count > 0;
  return (
    <button type="button" className="score-line" onClick={onOpen}>
      {rated ? (
        <>
          <span className="score-line__value mono">{summary.rating_average!.toFixed(1)}</span>
          <Icon path={phCoffeeFill} size={16} />
          <span className="muted">
            {summary.rating_count === 1 ? t("review.ratingsOne") : t("review.ratingsMany", { count: summary.rating_count })}
          </span>
        </>
      ) : (
        <span className="muted">{t("review.noneYetShort")}</span>
      )}
    </button>
  );
}

/** What people paid and the tags they pick most, for the Overview tab. */
export function ReviewHighlights({ shopId }: { shopId: number }) {
  const { t } = useI18n();
  const { data: summary } = useReviewSummary(shopId);
  if (!summary || (summary.typical_prices.length === 0 && summary.top_tags.length === 0)) return null;
  return (
    <section className="card highlights">
      {summary.typical_prices.length > 0 ? (
        <div>
          <h2 className="eyebrow">{t("review.paidTitle")}</h2>
          <ul className="highlights__prices">
            {summary.typical_prices.map((price) => (
              <li key={price.drink}>
                <span>{drinkLabel(price.drink, t)}</span>
                <span className="mono">{t("review.priceAbout", { price: price.median_birr })}</span>
              </li>
            ))}
          </ul>
          <p className="muted highlights__foot">{t("review.paidFoot")}</p>
        </div>
      ) : null}
      {summary.top_tags.length > 0 ? (
        <div>
          <h2 className="eyebrow">{t("review.mentionedTitle")}</h2>
          <div className="chip-wrap">
            {summary.top_tags.map(({ tag, count }) => (
              <TagChip key={tag}>
                {t(`tag.${tag}`)} <span className="mono muted">{count}</span>
              </TagChip>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** The Reviews tab: the score and its breakdown, a nudge to add yours, and the list. */
export function ShopReviews({ shopId, visit, onCheckIn }: { shopId: number; visit: CheckIn | null; onCheckIn: () => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<ReviewFilter | null>(null);
  const { data: summary } = useReviewSummary(shopId);
  const reviews = useReviews(shopId, filter);
  const items = reviews.data?.pages.flatMap((page) => page.reviews) ?? [];
  const anyReviews = (summary?.total ?? 0) > 0;

  return (
    <div className="shop-reviews">
      {summary && summary.rating_count > 0 ? <ScoreCard summary={summary} /> : null}

      {visit ? <ReviewComposer key={visit.id} visit={visit} /> : null}

      {anyReviews ? (
        <div className="chip-row" role="group" aria-label={t("review.filter")}>
          {([null, "notes", "photos"] as const).map((option) => (
            <FilterChip key={option ?? "all"} selected={filter === option} onClick={() => setFilter(option)}>
              {t(option === null ? "review.filterAll" : option === "notes" ? "review.filterNotes" : "review.filterPhotos")}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {reviews.isPending ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : reviews.isError ? (
        <p className="notice notice--caution">
          {t("common.somethingWrong")}{" "}
          <button type="button" className="link-button" onClick={() => void reviews.refetch()}>
            {t("common.retry")}
          </button>
        </p>
      ) : items.length === 0 ? (
        anyReviews ? (
          <p className="notice">{t("review.noneForFilter")}</p>
        ) : visit ? null : (
          <div className="notice shop-reviews__empty">
            <p>{t("review.beFirst")}</p>
            <button type="button" className="getting-there__maps" onClick={onCheckIn}>
              {t("review.beFirstAction")}
            </button>
          </div>
        )
      ) : (
        <ul className="reviews">
          {items.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}

      {reviews.hasNextPage ? (
        <button type="button" className="shop-reviews__more" onClick={() => void reviews.fetchNextPage()} disabled={reviews.isFetchingNextPage}>
          {reviews.isFetchingNextPage ? t("review.loading") : t("review.showMore")}
        </button>
      ) : null}
    </div>
  );
}

function ScoreCard({ summary }: { summary: ReviewSummary }) {
  const { t } = useI18n();
  const max = Math.max(1, ...Object.values(summary.distribution));
  return (
    <section className="card score-card" aria-label={t("review.scoreLabel")}>
      <div className="score-card__big">
        <span className="score-card__value mono">{summary.rating_average!.toFixed(1)}</span>
        <CupScore rating={Math.round(summary.rating_average!)} size={14} />
        <span className="muted score-card__count">
          {summary.rating_count === 1 ? t("review.ratingsOne") : t("review.ratingsMany", { count: summary.rating_count })}
        </span>
      </div>
      <dl className="score-card__bars">
        {[5, 4, 3, 2, 1].map((score) => {
          const count = summary.distribution[String(score)] ?? 0;
          return (
            <div key={score} className="score-card__row">
              <dt className="mono">{score}</dt>
              <dd>
                <span className="score-card__bar">
                  <span style={{ width: `${(count / max) * 100}%` }} />
                </span>
                <span className="visually-hidden">{t("review.peopleGave", { count, score })}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="muted score-card__foot">{t("review.onePerPerson")}</p>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const { t, language } = useI18n();
  const { user } = review;
  return (
    <li className="card review">
      <div className="review__head">
        <Doodle seed={doodleSeedFor(user)} traits={doodleTraitsFor(user)} mood="awake" size={36} crop="top" decorative />
        <div className="review__who">
          <span className="review__name">{user.display_name || `@${user.handle}`}</span>
          <span className="muted review__meta">
            @{user.handle} · {reviewDate(review.occurred_at, t, language)}
          </span>
        </div>
        <ReportMenu review={review} />
      </div>
      {review.rating ? <CupScore rating={review.rating} /> : null}
      {review.note ? <p className="review__note">{review.note}</p> : null}
      {review.tags.length > 0 || review.drink ? (
        <div className="review__tags">
          {review.drink ? (
            <span className="review__drink">
              {drinkLabel(review.drink, t)}
              {review.price_birr ? ` · ${t("review.priceExact", { price: review.price_birr })}` : null}
            </span>
          ) : null}
          {review.tags.map((tag) => (
            <span key={tag} className="review__tag">
              {t(`tag.${tag}`)}
            </span>
          ))}
        </div>
      ) : null}
      {review.photo ? (
        <a className="review__photo" href={review.photo.full} target="_blank" rel="noreferrer">
          <img src={review.photo.thumb} alt={t("review.photoBy", { handle: user.handle })} loading="lazy" />
        </a>
      ) : null}
    </li>
  );
}

const REPORT_REASONS = ["spam", "inappropriate", "other"] as const;

/** A quiet "…" that opens three reasons; a moderator decides in the console. */
function ReportMenu({ review }: { review: Review }) {
  const { t } = useI18n();
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const send = useMutation({
    mutationFn: (reason: (typeof REPORT_REASONS)[number]) => api.report({ reportable_type: "check_in", reportable_id: review.id, reason }),
    onSuccess: hapticSuccess,
    onError: hapticError,
  });
  // Nobody reports themselves; a stranger signs in first.
  if (status !== "signedIn" || user?.id === review.user.id) return null;

  if (send.isSuccess) return <span className="muted review__reported">{t("review.reported")}</span>;

  return (
    <div className="review__menu">
      <button type="button" className="review__menu-button" aria-expanded={open} aria-label={t("review.reportLabel")} onClick={() => setOpen((o) => !o)}>
        <Icon path={phDotsThreeVertical} size={20} />
      </button>
      {open ? (
        <div className="review__menu-list" role="group" aria-label={t("review.reportLabel")}>
          <span className="review__menu-title">{t("review.reportTitle")}</span>
          {REPORT_REASONS.map((reason) => (
            <button key={reason} type="button" disabled={send.isPending} onClick={() => send.mutate(reason)}>
              {t(`report.reason.${reason}`)}
            </button>
          ))}
          {send.isError ? <span className="review__menu-error">{t("common.somethingWrong")}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

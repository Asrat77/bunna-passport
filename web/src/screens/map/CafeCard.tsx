import type { PassportStamp, Shop } from "@/api/types";
import { CHECK_IN_RANGE_METERS } from "@/data/checkin";
import { useReviewSummary } from "@/data/queries";
import { isEthiopic } from "@/design/script";
import { Seal } from "@/design/seal/Seal";
import { nextLevel } from "@/design/seal/levels";
import { useI18n } from "@/i18n/context";
import { formatMeters } from "@/lib/distance";
import { openStatus } from "@/lib/hours";
import { openInMaps } from "@/lib/maps";
import { Icon } from "@/ui/Icon";
import "./map.css";
import { phArrowRight, phCoffeeFill, phNavigationArrow, phPersonSimpleWalk, phStamp, phX } from "@/ui/icons";

type Props = {
  shop: Shop;
  stamp: PassportStamp | undefined;
  distance: number | null;
  onOpen: () => void;
  onClose: () => void;
};

/** A steady walk, about 4.8 km/h. */
const WALK_METERS_PER_MINUTE = 80;
/** Past this a walking time stops being the useful number. */
const WALKABLE_METERS = 3000;

/**
 * The card a café pin opens on the map: who it is, how far, what people rate
 * it and where it stands in your passport, so you can decide without leaving
 * the map. "View café" goes on to the full page.
 */
export function CafeCard({ shop, stamp, distance, onOpen, onClose }: Props) {
  const { t, language } = useI18n();
  const summary = useReviewSummary(shop.id);
  const status = openStatus(shop.hours?.schedule);
  const statusText =
    status === "open" ? t("shop.openNow") : status === "closingSoon" ? t("shop.closingSoon") : status === "closed" ? t("shop.closedNow") : null;
  const area = language === "am" ? shop.neighborhood.name_am : shop.neighborhood.name;
  const secondName =
    shop.name_am && shop.name_am !== shop.name && isEthiopic(shop.name_am) !== isEthiopic(shop.name) ? shop.name_am : null;

  const away =
    distance === null
      ? { value: "—", note: t("map.noFix") }
      : {
          value: formatMeters(distance),
          note:
            distance <= CHECK_IN_RANGE_METERS
              ? t("map.inRange")
              : distance <= WALKABLE_METERS
                ? t("map.walk", { minutes: Math.max(1, Math.round(distance / WALK_METERS_PER_MINUTE)) })
                : t("map.away"),
        };

  const rating = summary.data;
  const rated = rating && rating.rating_average !== null && rating.rating_count > 0;
  const ratingNote = rated
    ? rating.rating_count === 1
      ? t("map.ratingsOne")
      : t("map.ratings", { count: rating.rating_count })
    : summary.isPending
      ? "…"
      : t("map.noRatings");

  const next = stamp ? nextLevel(stamp.check_ins_count) : null;
  const cups = stamp ? (stamp.check_ins_count === 1 ? t("map.cupsOne") : t("map.cups", { count: stamp.check_ins_count })) : "";
  const passportNote = stamp
    ? next && stamp.visits_to_next_level
      ? `${cups} · ${t("map.toNext", { count: stamp.visits_to_next_level, level: t(`level.${next}`) })}`
      : cups
    : t("map.firstVisit");

  return (
    <section className="cafe-card" aria-label={shop.name}>
      <header className="cafe-card__head">
        <Seal name={shop.name} level={stamp?.level ?? null} size={48} decorative />
        <div className="cafe-card__title">
          <h2 className="cafe-card__name">
            <span className={isEthiopic(shop.name) ? "ethiopic" : undefined}>{shop.name}</span>
            {secondName ? <span className="cafe-card__am ethiopic">{secondName}</span> : null}
          </h2>
          <span className="cafe-card__where">
            {[area, shop.landmark].filter(Boolean).join(" · ")}
            {statusText ? (
              <>
                {" · "}
                <span className={`cafe-card__status cafe-card__status--${status}`}>{statusText}</span>
              </>
            ) : null}
          </span>
        </div>
        <button type="button" className="cafe-card__close" aria-label={t("map.close")} onClick={onClose}>
          <Icon path={phX} size={18} />
        </button>
      </header>

      <dl className="cafe-card__facts">
        <div className="cafe-card__fact">
          <dt>
            <Icon path={phPersonSimpleWalk} size={14} />
            {t("map.distance")}
          </dt>
          <dd className="mono">{away.value}</dd>
          <dd className="cafe-card__note">{away.note}</dd>
        </div>
        <div className="cafe-card__fact">
          <dt>
            <Icon path={phCoffeeFill} size={14} />
            {t("map.rating")}
          </dt>
          <dd className="mono">{rated ? `${rating.rating_average!.toFixed(1)}/5` : "—"}</dd>
          <dd className="cafe-card__note">{ratingNote}</dd>
        </div>
        <div className="cafe-card__fact">
          <dt>
            <Icon path={phStamp} size={14} />
            {t("map.passport")}
          </dt>
          <dd>{stamp ? t(`level.${stamp.level}`) : t("shop.notYet")}</dd>
          <dd className="cafe-card__note">{passportNote}</dd>
        </div>
      </dl>

      <div className="cafe-card__actions">
        <button type="button" className="cafe-card__button" onClick={() => openInMaps(shop)}>
          <Icon path={phNavigationArrow} size={18} />
          {t("map.directions")}
        </button>
        <button type="button" className="cafe-card__button cafe-card__button--primary" onClick={onOpen}>
          {t("map.viewCafe")}
          <Icon path={phArrowRight} size={18} />
        </button>
      </div>
    </section>
  );
}

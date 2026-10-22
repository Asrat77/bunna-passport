import { mdiCheck, mdiMapMarkerOutline } from "@mdi/js";
import { useState } from "react";
import type { ShopAttributes, ShopDetail } from "@/api/types";
import { useCatalog, useReviews, useShop } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { InkStamp } from "@/design/stamp/InkStamp";
import { stampDate, stampRotation } from "@/design/stamp/geometry";
import { useI18n } from "@/i18n/context";
import { distanceMeters, formatMeters } from "@/lib/distance";
import { openStatus } from "@/lib/hours";
import { openInMaps } from "@/lib/maps";
import { PRICE_GLYPHS } from "@/lib/price";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { FilterChip, TagChip } from "@/ui/Chip";
import { Icon } from "@/ui/Icon";
import { StatStrip } from "@/ui/StatStrip";
import "./shop.css";

type Section = "overview" | "photos" | "reviews";

/** "Near" enough that the first step of the directions counts as done. */
const IN_THE_AREA_METERS = 1000;

export function Shop({ id }: { id: number }) {
  const { t, language } = useI18n();
  const { back, push } = useNavigation();
  const { data: shop, isPending, isError, refetch } = useShop(id);
  const [section, setSection] = useState<Section>("overview");

  return (
    <main className="screen shop">
      <BackControl onBack={back} label={t("common.back")} />
      {isPending ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : isError || !shop ? (
        <div className="notice notice--caution">
          {t("common.somethingWrong")}{" "}
          <button type="button" className="link-button" onClick={() => void refetch()}>
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <ShopBody shop={shop} section={section} onSection={setSection} language={language} />
      )}
      <PrimaryAction text={t("shop.checkInHere")} onClick={() => push({ name: "checkin", shopId: id })} />
    </main>
  );
}

function ShopBody({
  shop,
  section,
  onSection,
  language,
}: {
  shop: ShopDetail;
  section: Section;
  onSection: (section: Section) => void;
  language: string;
}) {
  const { t } = useI18n();
  const { fix } = useLocation();
  const catalog = useCatalog();
  const stamps = useStampsByShop();
  const distance = fix ? distanceMeters(fix, shop) : null;
  const status = openStatus(shop.hours.schedule);
  const area = language === "am" ? shop.neighborhood.name_am : shop.neighborhood.name;
  const areaShops = (catalog.data ?? []).filter((s) => s.neighborhood.id === shop.neighborhood.id);
  const areaStamped = areaShops.filter((s) => stamps.has(s.id)).length;
  const stamp = shop.stamp;

  const statusText =
    status === "open" ? t("shop.openNow") : status === "closingSoon" ? t("shop.closingSoon") : status === "closed" ? t("shop.closedNow") : null;
  const tags = (Object.keys(shop.attributes) as (keyof ShopAttributes)[]).filter((key) => shop.attributes[key]);

  return (
    <>
      <header className="shop__hero">
        <div className="shop__stamp">
          <InkStamp
            name={shop.name}
            amharic={`${shop.name_am} · ${shop.neighborhood.name_am}`}
            date={stamp ? stampDate(stamp.earned_at) : t("shop.yourStamp")}
            level={stamp?.level ?? "none"}
            size={124}
            rotation={stamp ? stampRotation(`${shop.id}`) : 0}
            label={
              stamp
                ? `${shop.name}, ${t(`level.${stamp.level}`)}, ${stampDate(stamp.earned_at)}`
                : `${shop.name}, ${t("shop.notYet")}`
            }
          />
          {stamp ? null : <span className="shop__not-yet mono">{t("shop.notYet")}</span>}
        </div>
        <h1 className="shop__name">{shop.name}</h1>
        {shop.name_am ? <span className="shop__name-am">{shop.name_am}</span> : null}
        <span className="shop__where">
          {area}
          {distance !== null ? (
            <>
              {" · "}
              <span className="mono">{formatMeters(distance)}</span>
            </>
          ) : null}
          {statusText ? (
            <>
              {" · "}
              <span className={`shop__status shop__status--${status}`}>{statusText}</span>
            </>
          ) : null}
        </span>
      </header>

      <StatStrip
        stats={[
          { value: shop.price_band ? PRICE_GLYPHS[shop.price_band] : t("shop.priceUnknown"), label: t("shop.price") },
          { value: stamp?.check_ins_count ?? 0, label: t("shop.yourCups") },
          { value: `${areaStamped}/${areaShops.length}`, label: t("shop.areaPage", { area }) },
        ]}
      />

      <div className="chip-row" role="group" aria-label={t("shop.sections")}>
        {(["overview", "photos", "reviews"] as const).map((key) => (
          <FilterChip key={key} selected={section === key} onClick={() => onSection(key)}>
            {t(`shop.${key}`)}
          </FilterChip>
        ))}
      </div>

      {section === "overview" ? (
        <>
          <section className="card getting-there" aria-labelledby="getting-there">
            <h2 id="getting-there" className="eyebrow">
              {t("shop.gettingThere")}
            </h2>
            <ol>
              <Step done={distance !== null && distance < IN_THE_AREA_METERS}>{t("shop.stepArea", { area })}</Step>
              <Step done={false}>{shop.landmark}</Step>
            </ol>
            <button type="button" className="getting-there__maps" onClick={() => openInMaps(shop)}>
              <Icon path={mdiMapMarkerOutline} size={18} />
              {t("shop.stepOpenMaps")}
            </button>
          </section>
          <PhotoStrip shop={shop} onAll={() => onSection("photos")} />
          {tags.length > 0 ? (
            <div className="chip-wrap">
              {tags.map((tag) => (
                <TagChip key={tag}>{t(`shop.tag.${tag}`)}</TagChip>
              ))}
            </div>
          ) : null}
        </>
      ) : section === "photos" ? (
        <PhotoGrid shop={shop} />
      ) : (
        <Reviews shopId={shop.id} />
      )}
    </>
  );
}

function Step({ done, children }: { done: boolean; children: string }) {
  return (
    <li className={done ? "step step--done" : "step"}>
      <span className="step__mark" aria-hidden="true">
        {done ? <Icon path={mdiCheck} size={14} /> : null}
      </span>
      {done ? <s>{children}</s> : children}
    </li>
  );
}

function PhotoStrip({ shop, onAll }: { shop: ShopDetail; onAll: () => void }) {
  const { t } = useI18n();
  if (shop.photos.length === 0) return <p className="photo-empty">{t("shop.noPhotos")}</p>;
  return (
    <div className="photo-strip">
      {shop.photos.slice(0, 4).map((photo) => (
        <button key={photo.id} type="button" className="photo-strip__item" onClick={onAll}>
          <img src={photo.urls.medium} alt={photo.caption ?? t("shop.photoOf", { shop: shop.name })} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function PhotoGrid({ shop }: { shop: ShopDetail }) {
  const { t } = useI18n();
  if (shop.photos.length === 0) return <p className="photo-empty">{t("shop.noPhotos")}</p>;
  return (
    <div className="photo-grid">
      {shop.photos.map((photo) => (
        <a key={photo.id} href={photo.urls.full} target="_blank" rel="noreferrer">
          <img src={photo.urls.thumb} alt={photo.caption ?? t("shop.photoOf", { shop: shop.name })} loading="lazy" />
        </a>
      ))}
    </div>
  );
}

function Reviews({ shopId }: { shopId: number }) {
  const { t } = useI18n();
  const { data, isPending } = useReviews(shopId, true);
  if (isPending) return <div className="skeleton" style={{ height: 120 }} />;
  if (!data || data.length === 0) return <p className="notice">{t("reviews.empty")}</p>;
  return (
    <ul className="reviews">
      {data.map((review) => (
        <li key={review.id} className="card review">
          <div className="review__head">
            <span className="review__who">@{review.user.handle}</span>
            {review.rating ? (
              <span className="mono review__rating" aria-label={t("checkin.rateCups", { count: review.rating })}>
                {"●".repeat(review.rating)}
                <span className="review__rating-rest">{"●".repeat(5 - review.rating)}</span>
              </span>
            ) : null}
          </div>
          {review.drink ? <span className="review__drink">{review.drink}</span> : null}
          {review.note ? <p className="review__note">{review.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

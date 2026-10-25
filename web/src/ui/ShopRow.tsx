import { mdiDotsVertical } from "@mdi/js";
import type { PassportStamp, Shop } from "@/api/types";
import { Seal } from "@/design/seal/Seal";
import { useI18n } from "@/i18n/context";
import { openStatus } from "@/lib/hours";
import { formatMeters } from "@/lib/distance";
import { shopMenu } from "@/lib/maps";
import { Icon } from "./Icon";

type Props = {
  shop: Shop;
  stamp: PassportStamp | undefined;
  distance: number | null;
  onOpen: () => void;
};

/** A shop in a list: seal, bilingual name, where, standing, distance, menu. */
export function ShopRow({ shop, stamp, distance, onOpen }: Props) {
  const { t, language } = useI18n();
  const status = openStatus(shop.hours?.schedule);
  const statusText =
    status === "open" ? t("explore.open") : status === "closingSoon" ? t("explore.closingSoon") : status === "closed" ? t("explore.closed") : null;
  const area = language === "am" ? shop.neighborhood.name_am : shop.neighborhood.name;

  return (
    <div className="shop-row">
      <button type="button" className="shop-row__main" onClick={onOpen}>
        <Seal name={shop.name} nameAm={shop.name_am} level={stamp?.level ?? null} size={50} amharic={language === "am"} decorative />
        <span className="shop-row__text">
          <span className="shop-row__name">
            <span className="shop-row__latin">{shop.name}</span>
            {shop.name_am ? <span className="shop-row__am ethiopic">{shop.name_am}</span> : null}
          </span>
          <span className="shop-row__where">
            {area} · {shop.landmark}
          </span>
          {stamp ? (
            <span className="shop-row__standing">
              {t("explore.cupsLevel", { count: stamp.check_ins_count, level: t(`level.${stamp.level}`).toLowerCase() })}
            </span>
          ) : (
            <span className="shop-row__standing shop-row__standing--new">{t("explore.notInPassport")}</span>
          )}
        </span>
        <span className="shop-row__meta">
          {distance !== null ? <span className="mono shop-row__distance">{formatMeters(distance)}</span> : null}
          {statusText ? <span className={`shop-row__open shop-row__open--${status}`}>{statusText}</span> : null}
        </span>
      </button>
      <button
        type="button"
        className="shop-row__menu"
        aria-label={t("shop.directions") + ": " + shop.name}
        onClick={() => void shopMenu(shop, { title: shop.name, openMaps: t("shop.directions"), cancel: t("common.cancel") })}
      >
        <Icon path={mdiDotsVertical} size={20} />
      </button>
    </div>
  );
}

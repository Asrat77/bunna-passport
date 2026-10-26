import { phDotsThreeVertical } from "./icons";
import type { PassportStamp, Shop } from "@/api/types";
import { isEthiopic } from "@/design/script";
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
  /** "flat" is the Mocha row on Explore and All cafés: divider-separated, no card. */
  variant?: "card" | "flat";
};

/** A shop in a list: seal, bilingual name, where, standing, distance, menu. */
export function ShopRow({ shop, stamp, distance, onOpen, variant = "card" }: Props) {
  const { t, language } = useI18n();
  const flat = variant === "flat";
  const status = openStatus(shop.hours?.schedule);
  // On the flat row "Open" is the normal case, so only the exceptions show.
  const statusText =
    status === "open"
      ? flat
        ? null
        : t("explore.open")
      : status === "closingSoon"
        ? t("explore.closingSoon")
        : status === "closed"
          ? t("explore.closed")
          : null;
  const area = language === "am" ? shop.neighborhood.name_am : shop.neighborhood.name;
  // The second name earns its place only when it adds the other script.
  const secondName =
    shop.name_am && shop.name_am !== shop.name && isEthiopic(shop.name_am) !== isEthiopic(shop.name) ? shop.name_am : null;
  const level = stamp ? t(`level.${stamp.level}`) : "";

  return (
    <div className={flat ? "shop-row shop-row--flat" : "shop-row"}>
      <button type="button" className="shop-row__main" onClick={onOpen}>
        <Seal name={shop.name} level={stamp?.level ?? null} size={flat ? 48 : 50} decorative />
        <span className="shop-row__text">
          <span className="shop-row__name">
            <span className={isEthiopic(shop.name) ? "shop-row__latin ethiopic" : "shop-row__latin"}>{shop.name}</span>
            {secondName ? <span className="shop-row__am ethiopic">{secondName}</span> : null}
          </span>
          <span className="shop-row__where">
            {[area, shop.landmark].filter(Boolean).join(" · ")}
          </span>
          {stamp ? (
            <span className="shop-row__standing">
              {stamp.check_ins_count === 1
                ? t("explore.cupsLevelOne", { level })
                : t("explore.cupsLevel", { count: stamp.check_ins_count, level })}
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
        <Icon path={phDotsThreeVertical} size={20} />
      </button>
    </div>
  );
}

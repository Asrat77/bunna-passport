import { mdiCrosshairsGps, mdiKettleSteamOutline, mdiMagnify, mdiMapOutline, mdiPlusCircleOutline } from "@mdi/js";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { rankShops, type ShopFilter } from "@/data/nearby";
import { useMyDoodle } from "@/data/me";
import { useCatalog, useProfile } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { Dock } from "@/ui/Dock";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { ShopRow } from "@/ui/ShopRow";
import "./explore.css";

const PREVIEW_COUNT = 5;

export function Explore() {
  const { t } = useI18n();
  const { push } = useNavigation();
  const { firstName } = useAuth();
  const { data: profile } = useProfile();
  const doodle = useMyDoodle();
  const catalog = useCatalog();
  const stamps = useStampsByShop();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo(
    () =>
      rankShops(catalog.data ?? [], {
        origin: location.fix,
        query,
        filter,
        stamped: new Set(stamps.keys()),
      }),
    [catalog.data, location.fix, query, filter, stamps],
  );

  const searching = query.trim().length > 0;
  const showAll = expanded || searching || filter !== "all";
  const visible = showAll ? ranked : ranked.slice(0, PREVIEW_COUNT);
  const title = searching
    ? t("explore.results")
    : filter === "jebena"
      ? t("explore.jebenaShops")
      : filter === "notYet"
        ? t("explore.notYetShops")
        : location.fix
          ? t("explore.closest")
          : t("explore.allShops");
  const toggle = (next: ShopFilter) => setFilter((current) => (current === next ? "all" : next));
  const name = firstName ?? profile?.display_name ?? "";

  return (
    <main className="screen screen--with-dock explore">
      <div className="greeting">
        <button
          type="button"
          className="greeting__doodle"
          aria-label={`${t(doodle.awake ? "doodle.mineAwake" : "doodle.mineSleepy")}. ${t("explore.openStudio")}`}
          onClick={() => push({ name: "studio" })}
        >
          <Doodle seed={doodle.seed} mood={doodle.awake ? "awake" : "sleepy"} size={46} decorative />
        </button>
        <div className="greeting__text">
          <span className="greeting__hello">{t("explore.greeting", { name })}</span>
          <span className="greeting__mood">{t(doodle.awake ? "explore.moodAwake" : "explore.moodSleepy")}</span>
        </div>
      </div>

      <Headline
        first={t(doodle.awake ? "explore.titleNext" : "explore.titleFirst")}
        second={t(doodle.awake ? "explore.titleNextB" : "explore.titleFirstB")}
      />

      <label className="search">
        <span className="visually-hidden">{t("explore.searchLabel")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("explore.searchPlaceholder")}
          enterKeyHint="search"
        />
        <span className="search__icon" aria-hidden="true">
          <Icon path={mdiMagnify} size={21} />
        </span>
      </label>

      <div className="tiles" role="group" aria-label={t("explore.quickFilters")}>
        <button type="button" className="tile" aria-busy={location.status === "locating" || undefined} onClick={() => void location.refresh()}>
          <span className="tile__chip">
            <Icon path={mdiCrosshairsGps} size={19} />
          </span>
          {t("explore.tileNearMe")}
        </button>
        <button type="button" className="tile" onClick={() => push({ name: "map" })}>
          <span className="tile__chip">
            <Icon path={mdiMapOutline} size={19} />
          </span>
          {t("explore.tileMap")}
        </button>
        <button type="button" className="tile" aria-pressed={filter === "jebena"} onClick={() => toggle("jebena")}>
          <span className="tile__chip tile__chip--accent">
            <Icon path={mdiKettleSteamOutline} size={19} />
          </span>
          {t("explore.tileJebena")}
        </button>
        <button type="button" className="tile" aria-pressed={filter === "notYet"} onClick={() => toggle("notYet")}>
          <span className="tile__chip">
            <Icon path={mdiPlusCircleOutline} size={19} />
          </span>
          {t("explore.tileNotYet")}
        </button>
      </div>

      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {!showAll && ranked.length > PREVIEW_COUNT ? (
          <button type="button" className="link-button" onClick={() => setExpanded(true)}>
            {t("explore.seeAll")}
          </button>
        ) : null}
      </div>

      {location.status === "denied" || location.status === "unavailable" ? (
        <p className="notice">{t("explore.noLocation")}</p>
      ) : null}

      {catalog.isPending ? (
        <div className="shop-list" aria-label={t("explore.loading")}>
          {[0, 1, 2].map((n) => (
            <div key={n} className="skeleton" style={{ height: 76 }} />
          ))}
        </div>
      ) : catalog.isError && !catalog.data ? (
        <div className="notice notice--caution">
          {t("explore.loadFailed")}{" "}
          <button type="button" className="link-button" onClick={() => void catalog.refetch()}>
            {t("common.retry")}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="notice">
          {filter === "notYet" && !searching ? t("explore.allStamped") : t("explore.noResults")}
          {searching ? <><br />{t("explore.noResultsHint")}</> : null}
        </p>
      ) : (
        <ul className="shop-list">
          {visible.map(({ shop, distance }) => (
            <li key={shop.id}>
              <ShopRow shop={shop} stamp={stamps.get(shop.id)} distance={distance} onOpen={() => push({ name: "shop", id: shop.id })} />
            </li>
          ))}
        </ul>
      )}

      <Dock />
    </main>
  );
}

import { phCaretDown, phCaretLeft, phCaretRight, phMagnifyingGlass } from "@/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OpaqueId } from "@/api/types";
import { catalogStats, findShops, type ShopSort } from "@/data/nearby";
import { useCatalog } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation, type Route } from "@/nav/Navigation";
import { BackControl } from "@/telegram/buttons";
import { FilterChip } from "@/ui/Chip";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { ShopRow } from "@/ui/ShopRow";
import { StatStrip } from "@/ui/StatStrip";
import "./cafes.css";

const PAGE_SIZE = 20;

type CafesRoute = Extract<Route, { name: "cafes" }>;

type Filters = {
  query: string;
  openNow: boolean;
  jebena: boolean;
  visited: boolean | null;
  neighborhoodId: OpaqueId | null;
  sort: ShopSort;
  page: number;
  scrollY: number;
};

// Screens unmount when a shop is pushed over them, so each All cafés entry in
// the stack keeps its filters and page here and gets them back on Back.
const remembered = new WeakMap<CafesRoute, Filters>();

function initialFilters(route: CafesRoute): Filters {
  return (
    remembered.get(route) ?? {
      query: route.query ?? "",
      openNow: false,
      jebena: route.filter === "jebena",
      visited: route.filter === "notYet" ? false : null,
      neighborhoodId: null,
      sort: "nearest",
      page: 0,
      scrollY: 0,
    }
  );
}

/**
 * The whole catalog, a page at a time. It pages the copy the app already
 * keeps for offline search, so turning a page costs no data and works with
 * no signal; only twenty rows are ever drawn.
 */
export function AllCafes({ route }: { route: CafesRoute }) {
  const { t, language } = useI18n();
  const { push, back } = useNavigation();
  const catalog = useCatalog();
  const stamps = useStampsByShop();
  const location = useLocation();
  const [filters, setFilters] = useState(() => initialFilters(route));
  const listTop = useRef<HTMLDivElement>(null);
  const shops = catalog.data ?? [];
  const stamped = useMemo(() => new Set(stamps.keys()), [stamps]);

  const stats = useMemo(() => catalogStats(shops, stamped), [shops, stamped]);
  const areas = useMemo(
    () => [...stats.neighborhoods].sort((a, b) => a.name.localeCompare(b.name)),
    [stats.neighborhoods],
  );
  const results = useMemo(
    () =>
      findShops(shops, {
        origin: location.fix,
        query: filters.query,
        stamped,
        openNow: filters.openNow,
        jebena: filters.jebena,
        visited: filters.visited,
        neighborhoodId: filters.neighborhoodId,
        sort: filters.sort,
      }),
    [shops, location.fix, stamped, filters],
  );

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages - 1);
  const visible = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filtered =
    filters.query.trim() !== "" || filters.openNow || filters.jebena || filters.visited !== null || filters.neighborhoodId !== null;

  useEffect(() => {
    remembered.set(route, filters);
  }, [route, filters]);

  // Back from a shop lands where you left the list, after the app's own
  // scroll-to-top on every screen change.
  useEffect(() => {
    const y = filters.scrollY;
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    // Only on arrival.
  }, []);

  /** Any filter change starts again from the first page. */
  const update = (change: Partial<Filters>) => setFilters((current) => ({ ...current, ...change, page: 0 }));
  const goTo = (next: number) => {
    setFilters((current) => ({ ...current, page: next }));
    listTop.current?.scrollIntoView({ block: "start" });
  };
  const open = (id: OpaqueId) => {
    remembered.set(route, { ...filters, page, scrollY: window.scrollY });
    push({ name: "shop", id });
  };
  const areaName = (area: { name: string; name_am: string }) => (language === "am" ? area.name_am : area.name);
  const percent = stats.total > 0 ? Math.round((stats.visited / stats.total) * 100) : 0;

  return (
    <main className="screen cafes">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("cafes.title")} second={t("cafes.titleB")} size={30} />

      {catalog.isPending ? (
        <div className="skeleton" style={{ height: 72 }} />
      ) : (
        <>
          <StatStrip
            stats={[
              { value: stats.total.toLocaleString(), label: t("cafes.statCafes") },
              { value: stats.openNow.toLocaleString(), label: t("cafes.statOpen") },
              { value: stats.visited.toLocaleString(), label: t("cafes.statVisited") },
            ]}
          />
          {stats.visited > 0 ? (
            <div className="cafes__progress" aria-label={t("cafes.visitedShare", { percent })}>
              <div className="cafes__progress-bar" style={{ width: `${Math.max(percent, 1)}%` }} />
              <span className="mono">{t("cafes.visitedShare", { percent })}</span>
            </div>
          ) : null}
        </>
      )}

      <label className="search">
        <span className="visually-hidden">{t("explore.searchLabel")}</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder={t("explore.searchPlaceholder")}
          enterKeyHint="search"
        />
        <span className="search__icon" aria-hidden="true">
          <Icon path={phMagnifyingGlass} size={21} />
        </span>
      </label>

      <div className="chip-row" role="group" aria-label={t("cafes.filters")}>
        <FilterChip selected={filters.openNow} onClick={() => update({ openNow: !filters.openNow })}>
          {t("cafes.openNow")}
        </FilterChip>
        <FilterChip selected={filters.jebena} onClick={() => update({ jebena: !filters.jebena })}>
          {t("cafes.jebena")}
        </FilterChip>
        <FilterChip selected={filters.visited === true} onClick={() => update({ visited: filters.visited === true ? null : true })}>
          {t("cafes.visited")}
        </FilterChip>
        <FilterChip selected={filters.visited === false} onClick={() => update({ visited: filters.visited === false ? null : false })}>
          {t("cafes.notVisited")}
        </FilterChip>
      </div>

      <div className="cafes__selects">
        <label className="select-pill cafes__area-select">
          <span className="visually-hidden">{t("cafes.area")}</span>
          <select
            value={filters.neighborhoodId ?? ""}
            onChange={(event) => update({ neighborhoodId: event.target.value ? Number(event.target.value) : null })}
          >
            <option value="">{t("cafes.anyArea")}</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {areaName(area)} ({area.count})
              </option>
            ))}
          </select>
          <Icon path={phCaretDown} size={16} />
        </label>
        <label className="select-pill">
          <span className="visually-hidden">{t("cafes.sort")}</span>
          <select value={filters.sort} onChange={(event) => update({ sort: event.target.value as ShopSort })}>
            <option value="nearest">{t("cafes.sortNearest")}</option>
            <option value="name">{t("cafes.sortName")}</option>
            <option value="neighborhood">{t("cafes.sortArea")}</option>
          </select>
          <Icon path={phCaretDown} size={16} />
        </label>
      </div>

      <div className="section-head" ref={listTop}>
        <span className="cafes__showing mono" aria-live="polite">
          {results.length > 0
            ? t("cafes.showing", {
                from: page * PAGE_SIZE + 1,
                to: page * PAGE_SIZE + visible.length,
                total: results.length.toLocaleString(),
              })
            : null}
        </span>
        {filtered ? (
          <button
            type="button"
            className="link-button"
            onClick={() => update({ query: "", openNow: false, jebena: false, visited: null, neighborhoodId: null })}
          >
            {t("cafes.clear")}
          </button>
        ) : null}
      </div>

      {filters.sort === "nearest" && (location.status === "denied" || location.status === "unavailable") ? (
        <p className="notice">{t("explore.noLocation")}</p>
      ) : null}

      {catalog.isPending ? (
        <div className="shop-list shop-list--flat" aria-label={t("explore.loading")}>
          {[0, 1, 2, 3].map((n) => (
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
          {filters.query.trim() ? t("explore.noResults") : t("cafes.none")}
          {filters.query.trim() ? <><br />{t("explore.noResultsHint")}</> : null}
        </p>
      ) : (
        <ul className="shop-list shop-list--flat">
          {visible.map(({ shop, distance }) => (
            <li key={shop.id}>
              <ShopRow shop={shop} stamp={stamps.get(shop.id)} distance={distance} onOpen={() => open(shop.id)} variant="flat" />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="pager" aria-label={t("cafes.pages")}>
          <button type="button" className="pager__step" disabled={page === 0} onClick={() => goTo(page - 1)} aria-label={t("cafes.previous")}>
            <Icon path={phCaretLeft} size={22} />
          </button>
          <span className="pager__label mono">{t("cafes.page", { page: page + 1, pages })}</span>
          <button type="button" className="pager__step" disabled={page >= pages - 1} onClick={() => goTo(page + 1)} aria-label={t("cafes.next")}>
            <Icon path={phCaretRight} size={22} />
          </button>
        </nav>
      ) : null}
    </main>
  );
}

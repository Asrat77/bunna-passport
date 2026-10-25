import { phCaretLeft, phCaretRight, phFire, phPencilSimple } from "@/ui/icons";
import { useMemo, useState } from "react";
import type { Neighborhood, Shop, User } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { useMyDoodle } from "@/data/me";
import { useCatalog, usePassport, useProfile, useRecentCheckIns } from "@/data/queries";
import { coffeeWeeks } from "@/data/streak";
import { Doodle } from "@/design/doodle/Doodle";
import { Seal } from "@/design/seal/Seal";
import { useI18n } from "@/i18n/context";
import type { Language } from "@/i18n/strings";
import { distanceMeters } from "@/lib/distance";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { FilterChip } from "@/ui/Chip";
import { Dock } from "@/ui/Dock";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { paginate } from "./layout";
import { PassportPage, type PageEntry } from "./PassportPage";
import "./passport.css";

type Area = { neighborhood: Neighborhood; shops: Shop[]; stamped: number };

export function Passport() {
  const { t, language } = useI18n();
  const { push } = useNavigation();
  const { firstName } = useAuth();
  const { data: profile } = useProfile();
  const { data: passport } = usePassport();
  const { data: checkIns } = useRecentCheckIns();
  const catalog = useCatalog();
  const { fix } = useLocation();
  const doodle = useMyDoodle();

  const stampsByShop = useMemo(() => new Map((passport?.stamps ?? []).map((s) => [s.shop.id, s])), [passport]);
  const newestId = passport?.stamps[0]?.shop.id;

  const areas = useMemo<Area[]>(() => {
    const byId = new Map<number, Area>();
    for (const shop of catalog.data ?? []) {
      const area = byId.get(shop.neighborhood.id) ?? { neighborhood: shop.neighborhood, shops: [], stamped: 0 };
      area.shops.push(shop);
      if (stampsByShop.has(shop.id)) area.stamped++;
      byId.set(shop.neighborhood.id, area);
    }
    // Areas with stamps first, most stamped leading; the rest alphabetically.
    return [...byId.values()].sort(
      (a, b) => b.stamped - a.stamped || a.neighborhood.name.localeCompare(b.neighborhood.name),
    );
  }, [catalog.data, stampsByShop]);

  const newestArea = catalog.data?.find((s) => s.id === newestId)?.neighborhood.id;
  const [chosenArea, setChosenArea] = useState<number | null>(null);
  const areaId = chosenArea ?? newestArea ?? profile?.home_neighborhood_id ?? areas[0]?.neighborhood.id ?? null;
  const area = areas.find((a) => a.neighborhood.id === areaId) ?? areas[0];
  const [pageIndex, setPageIndex] = useState(0);

  const pages = useMemo(() => {
    if (!area) return [[]] as PageEntry[][];
    // Stamps in the order they were earned so a filled page never reshuffles;
    // unstamped cafés fill in after, nearest first.
    const earned: PageEntry[] = area.shops
      .filter((shop) => stampsByShop.has(shop.id))
      .map((shop) => ({ kind: "stamped" as const, shop, stamp: stampsByShop.get(shop.id)!, isNewest: shop.id === newestId }))
      .sort((a, b) => a.stamp.earned_at.localeCompare(b.stamp.earned_at));
    const missing: PageEntry[] = area.shops
      .filter((shop) => !stampsByShop.has(shop.id))
      .map((shop) => ({ kind: "missing" as const, shop, distance: fix ? distanceMeters(fix, shop) : null }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || a.shop.name.localeCompare(b.shop.name));
    return paginate([...earned, ...missing]);
  }, [area, stampsByShop, newestId, fix]);

  const page = Math.min(pageIndex, pages.length - 1);
  // Page numbers run through the whole passport, area after area.
  const pageOffset = areas
    .slice(0, Math.max(0, areas.indexOf(area!)))
    .reduce((sum, a) => sum + Math.max(1, Math.ceil(a.shops.length / 5)), 0);
  const me = profile;
  const weeks = coffeeWeeks(checkIns ?? []);
  const areaName = area ? (language === "am" ? area.neighborhood.name_am : area.neighborhood.name) : "";

  return (
    <main className="screen screen--with-dock passport">
      <header className="passport__header">
        <button type="button" className="passport__profile" onClick={() => push({ name: "profile" })} aria-label={t("profile.open")}>
          <Doodle
            seed={doodle.seed}
            mood={doodle.awake ? "awake" : "sleepy"}
            size={64}
            label={t(doodle.awake ? "doodle.mineAwake" : "doodle.mineSleepy")}
          />
          <span className="passport__who">
            <span className="passport__name">{me?.display_name ?? firstName ?? ""}</span>
            {me ? <span className="passport__handle">{handleLine(me, t, language)}</span> : null}
          </span>
          <Icon path={phCaretRight} size={18} />
        </button>
        <button type="button" className="pill-button" onClick={() => push({ name: "studio" })}>
          <Icon path={phPencilSimple} size={16} />
          {t("passport.editDoodle")}
        </button>
      </header>

      {passport && passport.stamped_count === 0 ? (
        <Headline first={t("passport.emptyTitle")} second={t("passport.emptyTitleB")} size={30} as="h2" />
      ) : null}

      <div className="counters">
        <div className="card counter">
          <span className="counter__label">{t("passport.stamps")}</span>
          <span className="counter__value mono">{passport?.stamped_count ?? "–"}</span>
          <span className="counter__foot">
            <span className="seal-stack" aria-hidden="true">
              {(passport?.stamps ?? []).slice(0, 3).map((stamp) => (
                <Seal key={stamp.id} name={stamp.shop.name} nameAm={stamp.shop.name_am} level={stamp.level} size={24} decorative />
              ))}
            </span>
            {t("passport.differentCafes")}
          </span>
        </div>
        <div className="card counter counter--cups">
          <span className="counter__label">{t("passport.cups")}</span>
          <span className="counter__value counter__value--cups mono">{me?.verified_check_ins_count ?? "–"}</span>
          <span className="counter__foot">
            <span className="counter__flame">
              <Icon path={phFire} size={16} />
            </span>
            {weeks === 0
              ? t("passport.noStreak")
              : weeks === 1
                ? t("passport.coffeeWeekOne")
                : t("passport.coffeeWeeks", { count: weeks })}
          </span>
        </div>
      </div>

      {areas.length > 0 && area ? (
        <>
          <div className="chip-row" role="group" aria-label={t("passport.neighborhoods")}>
            {areas.map((a) => (
              <FilterChip
                key={a.neighborhood.id}
                selected={a.neighborhood.id === area.neighborhood.id}
                onClick={() => {
                  setChosenArea(a.neighborhood.id);
                  setPageIndex(0);
                }}
              >
                {language === "am" ? a.neighborhood.name_am : a.neighborhood.name}{" "}
                <span className="mono chip-count">
                  {a.stamped}/{a.shops.length}
                </span>
              </FilterChip>
            ))}
          </div>

          <div className="area-progress">
            <div className="section-head">
              <h2 className="section-title">{t("passport.page", { area: areaName })}</h2>
              <span className="muted area-progress__left">
                {area.stamped >= area.shops.length
                  ? t("passport.complete")
                  : t("passport.toGo", { count: area.shops.length - area.stamped })}
              </span>
            </div>
            <div className="progress" aria-hidden="true">
              <div className="progress__fill" style={{ width: `${(area.stamped / Math.max(1, area.shops.length)) * 100}%` }} />
            </div>
          </div>

          <PassportPage neighborhood={area.neighborhood} entries={pages[page]} pageNumber={pageOffset + page + 1} />

          {pages.length > 1 ? (
            <div className="page-turn">
              <button type="button" className="pill-button" disabled={page === 0} onClick={() => setPageIndex(page - 1)} aria-label={t("passport.prevPage")}>
                <Icon path={phCaretLeft} size={20} />
              </button>
              <span className="mono muted">
                {page + 1} / {pages.length}
              </span>
              <button
                type="button"
                className="pill-button"
                disabled={page === pages.length - 1}
                onClick={() => setPageIndex(page + 1)}
                aria-label={t("passport.nextPage")}
              >
                <Icon path={phCaretRight} size={20} />
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <Dock />
    </main>
  );
}

export function handleLine(user: User, t: ReturnType<typeof useI18n>["t"], language: Language): string {
  const since = new Intl.DateTimeFormat(language === "am" ? "am-ET" : "en-GB", { month: "short", year: "numeric" }).format(
    new Date(user.joined_at),
  );
  return t("passport.handleLine", { handle: user.handle, trust: t(`trust.${user.trust_level}`), date: since });
}

import type { StampLevel } from "@/design/seal/levels";
import { useAuth } from "@/auth/AuthProvider";
import { usePersonalStats } from "@/data/queries";
import { INK } from "@/design/stamp/geometry";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { Headline } from "@/ui/Headline";
import { StatStrip } from "@/ui/StatStrip";
import { BarList, ColumnChart, FactGrid, Meter, StatCard, useRhythmColumns } from "./charts";

const LEVELS: StampLevel[] = ["bronze", "silver", "gold", "diamond"];

/** One person's passport, added up. Verified cups only, like the boards. */
export function YouSection() {
  const { t, language } = useI18n();
  const { status } = useAuth();
  const { push } = useNavigation();
  const stats = usePersonalStats();
  const rhythm = useRhythmColumns();
  const name = (place: { name: string; name_am: string }) => (language === "am" ? place.name_am : place.name);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const headline = <Headline first={t("stats.youTitle")} second={t("stats.youTitleB")} size={32} />;
  if (status !== "signedIn") {
    return (
      <>
        {headline}
        <p className="notice">{t("stats.signIn")}</p>
      </>
    );
  }
  if (stats.isPending) {
    return (
      <>
        {headline}
        <div className="skeleton" style={{ height: 72 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </>
    );
  }
  if (stats.isError || !stats.data) {
    return (
      <>
        {headline}
        <div className="notice notice--caution">
          {t("stats.loadFailed")}{" "}
          <button type="button" className="link-button" onClick={() => void stats.refetch()}>
            {t("common.retry")}
          </button>
        </div>
      </>
    );
  }

  const data = stats.data;
  const { totals, streaks } = data;
  if (totals.cups === 0) {
    return (
      <>
        {headline}
        <p className="notice">{t("stats.youEmpty")}</p>
      </>
    );
  }
  const share = totals.catalog_cafes > 0 ? Math.round((totals.cafes / totals.catalog_cafes) * 1000) / 10 : 0;

  return (
    <>
      {headline}

      <StatStrip
        stats={[
          { value: totals.cups.toLocaleString(), label: t("stats.statCups") },
          { value: totals.cafes.toLocaleString(), label: t("stats.statCafes") },
          { value: totals.areas.toLocaleString(), label: t("stats.statAreas") },
        ]}
      />
      <Meter percent={share} label={t("stats.passportShare", { percent: share })} />
      <Meter
        percent={totals.catalog_areas > 0 ? (totals.areas / totals.catalog_areas) * 100 : 0}
        label={t("stats.areasShare", { count: totals.areas, total: totals.catalog_areas })}
      />

      {data.city_rank ? (
        <section className="rank-card">
          <span className="rank-card__rank">{t("stats.rank", { rank: data.city_rank.rank.toLocaleString() })}</span>
          <span className="rank-card__note">{t("stats.rankNote", { count: data.city_rank.drinkers.toLocaleString() })}</span>
        </section>
      ) : null}

      <StatCard title={t("stats.streaks")}>
        <FactGrid
          facts={[
            { label: t("stats.streakNow"), value: streaks.current_weeks },
            { label: t("stats.streakBest"), value: streaks.longest_weeks },
            { label: t("stats.coffeeDays"), value: streaks.coffee_days.toLocaleString() },
            { label: t("stats.bestDay"), value: t("stats.cupsCount", { count: streaks.best_day_cups }) },
          ]}
        />
      </StatCard>

      {data.favorite_cafe ? (
        <button type="button" className="card regular" onClick={() => push({ name: "shop", id: data.favorite_cafe!.shop.id })}>
          <span className="regular__eyebrow">{t("stats.regular")}</span>
          <span className="regular__name">{name(data.favorite_cafe.shop)}</span>
          <span className="regular__note mono">
            {t("stats.regularNote", { count: data.favorite_cafe.cups, level: t(`level.${data.favorite_cafe.level}`) })}
          </span>
        </button>
      ) : null}

      <StatCard title={t("stats.yourRhythm")}>
        <ColumnChart
          title={t("stats.byHour")}
          columns={rhythm.hours(data.by_hour)}
          describePeak={(column) => t("stats.peakHour", { hour: column.label })}
        />
        <ColumnChart
          title={t("stats.byWeekday")}
          columns={rhythm.weekdays(data.by_weekday)}
          describePeak={(column) => t("stats.peakDay", { day: rhythm.dayName(column.label) })}
        />
        <ColumnChart
          title={t("stats.byMonth")}
          columns={rhythm.months(data.by_month)}
          describePeak={(column) => t("stats.barValue", { label: column.label, count: column.value })}
        />
      </StatCard>

      {data.top_areas.length > 0 ? (
        <StatCard title={t("stats.whereYouDrink")}>
          <BarList rows={data.top_areas.map((area) => ({ key: area.id, label: name(area), value: area.cups }))} />
        </StatCard>
      ) : null}

      <StatCard title={t("stats.levels")}>
        <ul className="levels">
          {LEVELS.map((level) => (
            <li key={level} className="levels__cell">
              <span className="levels__dot" style={{ background: INK[level] }} aria-hidden="true" />
              <span className="levels__count mono">{data.stamp_levels[level]}</span>
              <span className="levels__name">{t(`level.${level}`)}</span>
            </li>
          ))}
        </ul>
      </StatCard>

      <FactGrid
        facts={[
          { label: t("stats.usual"), value: data.favorite_drink?.name ?? t("stats.none"), note: data.favorite_drink ? t("stats.cupsCount", { count: data.favorite_drink.cups }) : undefined },
          { label: t("stats.avgRating"), value: data.average_rating ? `${data.average_rating.toFixed(1)} ★` : t("stats.none") },
          { label: t("stats.reviews"), value: totals.reviews },
          { label: t("stats.contributions"), value: totals.contributions },
          { label: t("stats.badges"), value: t("stats.badgesShare", { count: totals.badges, total: totals.catalog_badges }) },
          { label: t("stats.firstCup"), value: data.first_cup_at ? date(data.first_cup_at) : t("stats.none") },
        ]}
      />
    </>
  );
}

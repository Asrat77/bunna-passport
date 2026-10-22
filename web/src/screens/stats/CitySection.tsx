import type { StatsShop } from "@/api/types";
import { useCityStats } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { PRICE_GLYPHS } from "@/lib/price";
import { useNavigation } from "@/nav/Navigation";
import { Headline } from "@/ui/Headline";
import { StatStrip } from "@/ui/StatStrip";
import { BarList, ColumnChart, FactGrid, StatCard, useRhythmColumns } from "./charts";

const SHOWN_AREAS = 8;
const BANDS = ["budget", "standard", "premium", "splurge"] as const;

/** What every passport in Addis adds up to. Public; the server recounts every ten minutes. */
export function CitySection() {
  const { t, language } = useI18n();
  const { push } = useNavigation();
  const stats = useCityStats();
  const rhythm = useRhythmColumns();
  const name = (place: { name: string; name_am: string }) => (language === "am" ? place.name_am : place.name);
  const openShop = (shop: StatsShop) => push({ name: "shop", id: shop.id });

  const headline = <Headline first={t("stats.cityTitle")} second={t("stats.cityTitleB")} size={32} />;
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
  const { totals } = data;
  const shopRows = (rows: { shop: StatsShop; cups: number }[]) =>
    rows.map((row) => ({ key: row.shop.id, label: name(row.shop), value: row.cups, shop: row.shop }));

  return (
    <>
      {headline}

      <StatStrip
        stats={[
          { value: totals.cafes.toLocaleString(), label: t("stats.statCafes") },
          { value: totals.cups.toLocaleString(), label: t("stats.statCups") },
          { value: totals.drinkers.toLocaleString(), label: t("stats.statDrinkers") },
        ]}
      />
      <p className="stats__line">
        {t("stats.thisWeek", { cups: totals.cups_this_week.toLocaleString(), people: totals.drinkers_this_week.toLocaleString() })}
      </p>

      <StatCard title={t("stats.cityRhythm")}>
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

      {data.top_cafes.length > 0 ? (
        <StatCard title={t("stats.topCafes")}>
          <BarList rows={shopRows(data.top_cafes)} onOpen={(row) => openShop(row.shop)} />
        </StatCard>
      ) : null}

      {data.rising_cafes.length > 0 ? (
        <StatCard title={t("stats.risingCafes")}>
          <BarList rows={shopRows(data.rising_cafes)} onOpen={(row) => openShop(row.shop)} />
        </StatCard>
      ) : null}

      {data.top_rated.length > 0 ? (
        <StatCard title={t("stats.topRated")}>
          <BarList
            rows={data.top_rated.map((row) => ({
              key: row.shop.id,
              label: name(row.shop),
              note: t("stats.ratingNote", { average: row.average.toFixed(1), count: row.ratings }),
              value: row.average,
              display: row.average.toFixed(1),
              shop: row.shop,
            }))}
            onOpen={(row) => openShop(row.shop)}
          />
        </StatCard>
      ) : null}

      {data.areas.length > 0 ? (
        <StatCard title={t("stats.areas")} aside={t("stats.areasNote", { count: data.areas.length })}>
          <BarList
            rows={data.areas.slice(0, SHOWN_AREAS).map((area) => ({
              key: area.id,
              label: name(area),
              note: t("stats.areaNote", { cafes: area.cafes, cups: area.cups }),
              value: area.cafes,
            }))}
          />
        </StatCard>
      ) : null}

      {data.top_drinks.length > 0 ? (
        <StatCard title={t("stats.drinks")}>
          <BarList rows={data.top_drinks.map((drink) => ({ key: drink.name, label: drink.name, value: drink.cups }))} />
        </StatCard>
      ) : null}

      <StatCard title={t("stats.catalog")}>
        <FactGrid
          facts={[
            { label: t("stats.unstamped"), value: totals.unstamped_cafes.toLocaleString() },
            { label: t("stats.jebena"), value: totals.jebena_cafes.toLocaleString() },
            { label: t("stats.withHours"), value: totals.cafes_with_hours.toLocaleString() },
            { label: t("stats.newCafes"), value: totals.new_cafes.toLocaleString() },
            { label: t("stats.stampsTotal"), value: totals.stamps.toLocaleString() },
            { label: t("stats.reviewsTotal"), value: totals.reviews.toLocaleString() },
          ]}
        />
      </StatCard>

      <StatCard title={t("stats.priceMix")}>
        <ul className="levels">
          {BANDS.map((band) => (
            <li key={band} className="levels__cell">
              <span className="levels__count mono">{data.price_bands[band]}</span>
              <span className="levels__name">{PRICE_GLYPHS[band]}</span>
            </li>
          ))}
        </ul>
      </StatCard>

      <p className="boards__footnote">{t("stats.updated", { time: ago(data.generated_at, t) })}</p>
    </>
  );
}

function ago(iso: string, t: ReturnType<typeof useI18n>["t"]): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t("common.justNow");
  if (minutes < 60) return t("common.minutesAgo", { count: minutes });
  return t("common.hoursAgo", { count: Math.floor(minutes / 60) });
}

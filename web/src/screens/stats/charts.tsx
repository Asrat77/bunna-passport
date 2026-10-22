import { useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/context";

type Column = { label: string; value: number; tick?: boolean };

/**
 * Upright bars for a rhythm: hours, weekdays, months. One hue; the tallest
 * bar is picked out until you tap another, and the line underneath reads out
 * whichever is picked, so no number depends on colour alone.
 */
export function ColumnChart({
  columns,
  title,
  describePeak,
}: {
  columns: Column[];
  title: string;
  describePeak: (column: Column) => string;
}) {
  const { t } = useI18n();
  const max = Math.max(...columns.map((column) => column.value));
  const peak = columns.findIndex((column) => column.value === max);
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked ?? peak;
  const caption =
    max === 0
      ? t("stats.quiet")
      : picked === null
        ? describePeak(columns[peak])
        : t("stats.barValue", { label: columns[picked].label, count: columns[picked].value.toLocaleString() });

  return (
    <figure className="columns">
      <figcaption className="columns__title">{title}</figcaption>
      <div className="columns__plot" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((column, index) => (
          <button
            key={column.label}
            type="button"
            className="columns__hit"
            aria-pressed={max > 0 && index === shown}
            aria-label={t("stats.barValue", { label: column.label, count: column.value })}
            onClick={() => setPicked(picked === index ? null : index)}
          >
            <span className="columns__bar" style={{ height: max > 0 ? `${Math.max((column.value / max) * 100, column.value > 0 ? 4 : 0)}%` : 0 }} />
          </button>
        ))}
      </div>
      <div className="columns__axis" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {columns.map((column) => (
          <span key={column.label}>{column.tick === false ? "" : column.label}</span>
        ))}
      </div>
      <p className="columns__caption mono" aria-live="polite">
        {caption}
      </p>
    </figure>
  );
}

export type BarRow = { key: string | number; label: string; note?: string; value: number; display?: string };

/** A ranked list where each row's bar is its share of the top row. */
export function BarList<Row extends BarRow>({ rows, onOpen }: { rows: Row[]; onOpen?: (row: Row) => void }) {
  const most = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ol className="bar-list">
      {rows.map((row, index) => {
        const body = (
          <>
            <span className="bar-list__rank mono">{index + 1}</span>
            <span className="bar-list__text">
              <span className="bar-list__label">{row.label}</span>
              {row.note ? <span className="bar-list__note">{row.note}</span> : null}
              <span className="bar-list__track">
                <span className="bar-list__fill" style={{ width: `${(row.value / most) * 100}%` }} />
              </span>
            </span>
            <span className="bar-list__value mono">{row.display ?? row.value.toLocaleString()}</span>
          </>
        );
        return (
          <li key={row.key}>
            {onOpen ? (
              <button type="button" className="bar-list__row" onClick={() => onOpen(row)}>
                {body}
              </button>
            ) : (
              <div className="bar-list__row">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A titled card; the stats pages are a stack of these. */
export function StatCard({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="card stat-card">
      <div className="section-head">
        <h2 className="stat-card__title">{title}</h2>
        {aside ? <span className="stat-card__aside mono">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** Two-up cells: a big number, what it counts, and an optional note. */
export function FactGrid({ facts }: { facts: { label: string; value: ReactNode; note?: string }[] }) {
  return (
    <dl className="fact-grid">
      {facts.map((fact) => (
        <div key={fact.label} className="fact-grid__cell">
          <dt className="fact-grid__label">{fact.label}</dt>
          <dd className="fact-grid__value mono">{fact.value}</dd>
          {fact.note ? <dd className="fact-grid__note">{fact.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** A filled track with its reading on the right. */
export function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="meter" role="img" aria-label={label}>
      <div className="meter__fill" style={{ width: `${Math.min(100, Math.max(percent, percent > 0 ? 2 : 0))}%` }} />
      <span className="mono">{label}</span>
    </div>
  );
}

/** Hour, weekday and month columns, labelled for the current language. */
export function useRhythmColumns() {
  const { t, language } = useI18n();
  const hours = (counts: number[]): Column[] =>
    counts.map((value, hour) => ({
      label: t("stats.hourLabel", { hour: String(hour).padStart(2, "0") }),
      value,
      tick: hour % 6 === 0,
    }));
  const weekdays = (counts: number[]): Column[] =>
    counts.map((value, day) => ({ label: t(`stats.day.${day}` as "stats.day.0"), value }));
  const months = (rows: { month: string; cups: number }[]): Column[] =>
    rows.map(({ month, cups }) => ({
      label: new Date(`${month}-15T12:00:00Z`).toLocaleDateString(language === "am" ? "am-ET" : "en-GB", { month: "short" }),
      value: cups,
    }));
  const dayName = (label: string) => {
    const index = weekdays(Array(7).fill(0)).findIndex((column) => column.label === label);
    return t(`stats.dayLong.${index}` as "stats.dayLong.0");
  };
  return { hours, weekdays, months, dayName };
}

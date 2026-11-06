import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  activeFilterCount,
  FEATURE_TAGS,
  NO_FILTERS,
  PRICE_BANDS,
  QUICK_TAGS,
  setCafeFilters,
  toggleIn,
  useCafeFilters,
  type CafeFilters,
  type FeatureTag,
} from "@/data/cafeFilters";
import { useI18n, type Key } from "@/i18n/context";
import { PRICE_LABEL_KEYS } from "@/lib/price";
import { FilterChip } from "./Chip";
import { Icon } from "./Icon";
import { phSlidersHorizontal, phX } from "./icons";
import "./cafeFilters.css";

export const featureLabelKey = (tag: FeatureTag): Key => (tag === "wifi" ? "filters.wifi" : `tag.${tag}`);

/**
 * The shared café filters as a chip row: a Filters button that opens the
 * sheet with everything, then Open now and a few popular tags to tap
 * straight away. Screens add their own chips after these.
 */
export function CafeFilterChips({ count, children }: { count: (filters: CafeFilters) => number; children?: ReactNode }) {
  const { t } = useI18n();
  const filters = useCafeFilters();
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(filters);
  // Picked tags that aren't quick ones still show, so it's clear what's on.
  const shownTags = [...QUICK_TAGS, ...filters.tags.filter((tag) => !QUICK_TAGS.includes(tag))];

  return (
    <>
      <div className="chip-row cafe-filters" role="group" aria-label={t("cafes.filters")}>
        <FilterChip selected={active > 0} onClick={() => setOpen(true)}>
          <Icon path={phSlidersHorizontal} size={17} />
          {active > 0 ? t("filters.buttonCount", { count: active }) : t("filters.button")}
        </FilterChip>
        <FilterChip selected={filters.openNow} onClick={() => setCafeFilters((f) => ({ ...f, openNow: !f.openNow }))}>
          {t("cafes.openNow")}
        </FilterChip>
        {filters.prices.map((band) => (
          <FilterChip key={band} selected onClick={() => setCafeFilters((f) => ({ ...f, prices: toggleIn(f.prices, band) }))}>
            {t(PRICE_LABEL_KEYS[band])}
          </FilterChip>
        ))}
        {shownTags.map((tag) => (
          <FilterChip
            key={tag}
            selected={filters.tags.includes(tag)}
            onClick={() => setCafeFilters((f) => ({ ...f, tags: toggleIn(f.tags, tag) }))}
          >
            {t(featureLabelKey(tag))}
          </FilterChip>
        ))}
        {children}
      </div>
      {open ? <CafeFilterSheet count={count} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/**
 * Everything at once: open now, price levels and what a café is known for.
 * Changes apply as you tap; the button says how many cafés are left.
 */
function CafeFilterSheet({ count, onClose }: { count: (filters: CafeFilters) => number; onClose: () => void }) {
  const { t } = useI18n();
  const filters = useCafeFilters();
  const sheet = useRef<HTMLDivElement>(null);
  const results = count(filters);

  useEffect(() => {
    sheet.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="filter-sheet" onClick={onClose}>
      <div
        ref={sheet}
        className="filter-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filter-sheet__head">
          <h2 id="filter-sheet-title">{t("filters.title")}</h2>
          <button type="button" className="filter-sheet__close" onClick={onClose} aria-label={t("map.close")}>
            <Icon path={phX} size={20} />
          </button>
        </div>

        <section className="filter-sheet__section">
          <h3>{t("filters.when")}</h3>
          <div className="chip-wrap">
            <FilterChip selected={filters.openNow} onClick={() => setCafeFilters((f) => ({ ...f, openNow: !f.openNow }))}>
              {t("cafes.openNow")}
            </FilterChip>
          </div>
        </section>

        <section className="filter-sheet__section">
          <h3>{t("filters.price")}</h3>
          <div className="chip-wrap">
            {PRICE_BANDS.map((band) => (
              <FilterChip
                key={band}
                selected={filters.prices.includes(band)}
                onClick={() => setCafeFilters((f) => ({ ...f, prices: toggleIn(f.prices, band) }))}
              >
                {t(PRICE_LABEL_KEYS[band])}
              </FilterChip>
            ))}
          </div>
          <p className="filter-sheet__hint">{t("filters.priceHint")}</p>
        </section>

        <section className="filter-sheet__section">
          <h3>{t("filters.knownFor")}</h3>
          <div className="chip-wrap">
            {FEATURE_TAGS.map((tag) => (
              <FilterChip
                key={tag}
                selected={filters.tags.includes(tag)}
                onClick={() => setCafeFilters((f) => ({ ...f, tags: toggleIn(f.tags, tag) }))}
              >
                {t(featureLabelKey(tag))}
              </FilterChip>
            ))}
          </div>
          <p className="filter-sheet__hint">{t("filters.knownForHint")}</p>
        </section>

        <div className="filter-sheet__actions">
          <button
            type="button"
            className="link-button"
            disabled={activeFilterCount(filters) === 0}
            onClick={() => setCafeFilters(NO_FILTERS)}
          >
            {t("filters.clear")}
          </button>
          <button type="button" className="filter-sheet__show" onClick={onClose}>
            {results === 1 ? t("filters.showOne") : t("filters.show", { count: results.toLocaleString() })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { useLayoutEffect, useRef, useState } from "react";
import type { Neighborhood, PassportStamp, Shop } from "@/api/types";
import { InkStamp } from "@/design/stamp/InkStamp";
import { stampDate } from "@/design/stamp/geometry";
import { useI18n } from "@/i18n/context";
import { formatMeters } from "@/lib/distance";
import { PAGE_HEIGHT, PAGE_WIDTH, UNSTAMPED_SIZE, placeOnPage } from "./layout";

export type PageEntry =
  | { kind: "stamped"; shop: Shop; stamp: PassportStamp; isNewest: boolean }
  | { kind: "missing"; shop: Shop; distance: number | null };

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** Scales the fixed 358 × 318 page to whatever width the phone gives it. */
function usePageScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setScale(node.clientWidth / PAGE_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

/**
 * A cream passport page, in both themes (handoff, Passport page). Earned
 * stamps press into a deterministic slot layout, unstamped cafés sit as
 * dashed outlines with their distance, which is the "visible absence" that
 * pulls someone toward the next café.
 */
export function PassportPage({
  neighborhood,
  entries,
  pageNumber,
}: {
  neighborhood: Neighborhood;
  entries: PageEntry[];
  pageNumber: number;
}) {
  const { t, language } = useI18n();
  const { ref, scale } = usePageScale();
  const stamped = entries.filter((e) => e.kind === "stamped").map((e) => e.shop.name);
  const missing = entries.filter((e) => e.kind === "missing").map((e) => e.shop.name);
  const area = language === "am" ? neighborhood.name_am : neighborhood.name;

  return (
    <section
      ref={ref}
      className="paper passport-page"
      style={{ height: PAGE_HEIGHT * scale }}
      aria-label={t("passport.pageLabel", { area, stamped: stamped.join(", ") || "—", missing: missing.join(", ") || "—" })}
    >
      <div className="passport-page__inner" style={{ transform: `scale(${scale})` }} aria-hidden="true">
        <svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} className="passport-page__guilloche">
          <path
            d="M-10 70c40-14 80 14 120 0s80-14 120 0 80 14 140 0M-10 150c40-14 80 14 120 0s80-14 120 0 80 14 140 0M-10 230c40-14 80 14 120 0s80-14 120 0 80 14 140 0M-10 310c40-14 80 14 120 0s80-14 120 0 80 14 140 0"
            fill="none"
            stroke="#E6DACA"
            strokeWidth="1"
          />
          <path
            d="M-10 84c40-14 80 14 120 0s80-14 120 0 80 14 140 0M-10 164c40-14 80 14 120 0s80-14 120 0 80 14 140 0M-10 244c40-14 80 14 120 0s80-14 120 0 80 14 140 0"
            fill="none"
            stroke="#EDE3D5"
            strokeWidth="1"
          />
        </svg>
        <div className="passport-page__header mono">
          <span>
            {neighborhood.name.toUpperCase()} · <span className="ethiopic">{neighborhood.name_am}</span>
          </span>
          <span>{t("passport.pageNumber", { number: String(pageNumber).padStart(2, "0") })}</span>
        </div>

        {entries.map((entry, index) => {
          const place = placeOnPage(index, entry.shop.id);
          const amharic = `${entry.shop.name_am} · ${entry.shop.neighborhood.name_am}`;
          if (entry.kind === "stamped") {
            return (
              <div key={entry.shop.id} className="passport-page__slot" style={{ left: place.x, top: place.y }}>
                <InkStamp
                  name={entry.shop.name}
                  amharic={amharic}
                  date={stampDate(entry.stamp.earned_at)}
                  // Ink pressed today is still wet clay; older stamps show their metal.
                  level={isToday(entry.stamp.earned_at) ? "clay" : entry.stamp.level}
                  size={place.size}
                  rotation={place.rotation}
                  label=""
                />
                {entry.isNewest && isToday(entry.stamp.earned_at) ? (
                  <span className="passport-page__today" style={{ left: place.size * 0.72 }}>
                    {t("passport.today")}
                  </span>
                ) : null}
              </div>
            );
          }
          const offset = (place.size - UNSTAMPED_SIZE) / 2;
          return (
            <div
              key={entry.shop.id}
              className="passport-page__slot passport-page__slot--missing"
              style={{ left: place.x + offset, top: place.y + offset - 6 }}
            >
              <InkStamp name={entry.shop.name} amharic={amharic} date={t("passport.notYet")} level="none" size={UNSTAMPED_SIZE} label="" />
              {entry.distance !== null ? (
                <span className="passport-page__away mono">{t("common.distanceAway", { distance: formatMeters(entry.distance) })}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

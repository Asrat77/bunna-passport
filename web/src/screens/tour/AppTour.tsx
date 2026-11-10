import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/context";
import { readFlag, writeFlag } from "@/telegram/storage";
import { availableSteps, placeCard, SPOTLIGHT_PAD, type Rect, type TourStep, type TourStepId } from "./tourSteps";
import "./tour.css";

/** "1" once someone has finished or skipped the tour; Profile clears it to replay. */
export const TOUR_SEEN = "bunna.tourSeen";

/** Lets the first page settle (the first-stamp card loads its own flag) before we look for targets. */
const SETTLE_MS = 500;

const find = (id: TourStepId) => document.querySelector<HTMLElement>(`[data-tour="${id}"]`);

function measure(element: HTMLElement): Rect {
  const r = element.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * A short coach-mark tour of Explore: it dims the screen, rings one control
 * at a time (your picture, search, the map, Check in, the Passport and Stats
 * tabs) and says what each is for. Shown once to everyone, new or not, and
 * replayable from Profile. For an empty passport it ends on the first-stamp
 * guide, so the two hand over instead of stacking.
 *
 * Rendered on <body>, so the card wears the app's own light or dark palette
 * even though Explore is Mocha.
 */
export function AppTour({ ready }: { ready: boolean }) {
  const { t } = useI18n();
  const [seen, setSeen] = useState<boolean | null>(null);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(200);
  const primary = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLElement>(null);

  useEffect(() => {
    void readFlag(TOUR_SEEN).then((value) => setSeen(value === "1"));
  }, []);

  // Pick the stops once the screen has what they point at.
  useEffect(() => {
    if (seen !== false || !ready || steps) return;
    const timer = window.setTimeout(() => {
      const found = availableSteps((id) => find(id) !== null);
      if (found.length > 0) setSteps(found);
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [seen, ready, steps]);

  const step = steps?.[index];

  // Bring the current stop into view and keep the ring on it.
  useLayoutEffect(() => {
    if (!step) return;
    const element = find(step.id);
    if (!element) {
      setRect(null);
      return;
    }
    // A tall stop (the first-stamp card) goes to the top, leaving room for the card under it.
    const tall = element.offsetHeight > window.innerHeight * 0.4;
    element.scrollIntoView({ block: tall ? "start" : "center", inline: "nearest" });
    const update = () => setRect(measure(element));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  useEffect(() => {
    if (step) primary.current?.focus({ preventScroll: true });
  }, [step]);

  // Amharic and longer stops make a taller card; placement needs its real height.
  useLayoutEffect(() => {
    const height = card.current?.offsetHeight;
    if (height && height !== cardHeight) setCardHeight(height);
  });

  const finish = useCallback(() => {
    setSeen(true);
    setSteps(null);
    void writeFlag(TOUR_SEEN, "1");
  }, []);

  useEffect(() => {
    if (!step) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, finish]);

  if (!steps || !step) return null;

  const last = index === steps.length - 1;
  const placement = rect ? placeCard(rect, window.innerHeight, cardHeight) : { bottom: 120 };

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {rect ? (
        <div
          className="tour__ring"
          aria-hidden="true"
          style={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
          }}
        />
      ) : (
        <div className="tour__scrim" aria-hidden="true" />
      )}
      <section ref={card} className="tour__card" style={placement}>
        <div className="tour__head">
          <span className="tour__count mono">{t("tour.count", { step: index + 1, count: steps.length })}</span>
          <button type="button" className="tour__skip" onClick={finish}>
            {t("tour.skip")}
          </button>
        </div>
        <h2 id="tour-title" className="tour__title">
          {t(step.title)}
        </h2>
        <p id="tour-body" className="tour__body">
          {t(step.body)}
        </p>
        <div className="tour__actions">
          {index > 0 ? (
            <button type="button" className="tour__button" onClick={() => setIndex(index - 1)}>
              {t("tour.back")}
            </button>
          ) : null}
          <button
            ref={primary}
            type="button"
            className="tour__button tour__button--primary"
            onClick={() => (last ? finish() : setIndex(index + 1))}
          >
            {last ? t("tour.done") : t("tour.next")}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

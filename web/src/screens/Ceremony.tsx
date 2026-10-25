import { phArrowRight, phCheck } from "@/ui/icons";
import { useEffect, useState } from "react";
import type { CheckIn } from "@/api/types";
import { useMyDoodle } from "@/data/me";
import { useCatalog, usePassport } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { nextLevel, visitsToNextLevel } from "@/design/seal/levels";
import { InkStamp } from "@/design/stamp/InkStamp";
import { stampDate, stampRotation } from "@/design/stamp/geometry";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { PrimaryAction, SecondaryAction } from "@/telegram/buttons";
import { hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./ceremony.css";

/** Skippable from 0.8 s; everything has landed by about 1.6 s (DESIGN.md §6.2). */
const SKIPPABLE_AFTER_MS = 800;

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Check-ins whose ceremony already played, so coming back from sharing doesn't press the stamp again. */
const celebrated = new Set<number>();

/**
 * The stamp ceremony for a first visit, and the compact "+1 cup" tick for a
 * repeat one. The doodle card only appears on the first cup of the coffee
 * day, since that's the only time it wakes.
 */
export function Ceremony({ checkIn, wasAwake }: { checkIn: CheckIn; wasAwake: boolean }) {
  const { t, language, ordinal } = useI18n();
  const { switchTab, push } = useNavigation();
  const { data: passport } = usePassport();
  const catalog = useCatalog();
  const doodle = useMyDoodle();
  const [replay] = useState(() => celebrated.has(checkIn.id));
  const [phase, setPhase] = useState<"pressing" | "settled">(replay || reducedMotion() ? "settled" : "pressing");
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    celebrated.add(checkIn.id);
    if (!replay) hapticSuccess();
    if (phase === "settled") return;
    const skip = window.setTimeout(() => setCanSkip(true), SKIPPABLE_AFTER_MS);
    const settle = window.setTimeout(() => setPhase("settled"), 1600);
    return () => {
      window.clearTimeout(skip);
      window.clearTimeout(settle);
    };
    // The ceremony plays once, when the screen opens.
  }, []);

  const shop = catalog.data?.find((s) => s.id === checkIn.shop.id);
  const area = shop ? (language === "am" ? shop.neighborhood.name_am : shop.neighborhood.name) : "";
  const stamped = new Set((passport?.stamps ?? []).map((s) => s.shop.id));
  stamped.add(checkIn.shop.id);
  const areaShops = shop ? (catalog.data ?? []).filter((s) => s.neighborhood.id === shop.neighborhood.id) : [];
  const areaStamped = areaShops.filter((s) => stamped.has(s.id)).length;
  const stampHere = passport?.stamps.find((s) => s.shop.id === checkIn.shop.id);
  const visits = stampHere?.check_ins_count ?? 1;
  const toNext = visitsToNextLevel(visits);
  const upcoming = nextLevel(visits);
  const firstCupToday = !wasAwake;
  const done = () => switchTab("passport");
  const share = () => push({ name: "share", target: { checkInId: checkIn.id }, shopName: checkIn.shop.name });

  const doodleCard = firstCupToday ? (
    <div className="card ceremony__doodle">
      <div className="ceremony__faces" aria-label={t("doodle.mineAwake")} role="img">
        <Doodle seed={doodle.seed} mood="sleepy" size={52} decorative />
        <span className="ceremony__arrow" aria-hidden="true">
          <Icon path={phArrowRight} size={20} />
        </span>
        <span className="ceremony__awake">
          <span className="ceremony__awake-sleepy">
            <Doodle seed={doodle.seed} mood="sleepy" size={52} decorative />
          </span>
          <span className="ceremony__awake-awake">
            <Doodle seed={doodle.seed} mood="awake" size={52} decorative />
          </span>
        </span>
      </div>
      <div className="ceremony__doodle-text">
        <span className="ceremony__doodle-title">{t("ceremony.awakeTitle")}</span>
        <span className="muted">{t("ceremony.awakeBody")}</span>
      </div>
    </div>
  ) : null;

  if (!checkIn.stamp_earned) {
    return (
      <main className="screen screen--glow ceremony ceremony--cup" data-phase={phase}>
        <div className="ceremony__tick" aria-hidden="true">
          <Icon path={phCheck} size={56} />
        </div>
        <Headline first={t("ceremony.cupTitle")} second={t("ceremony.cupBody", { count: visits, shop: checkIn.shop.name })} align="center" />
        {toNext && upcoming ? (
          <p className="ceremony__line">
            {toNext === 1
              ? t("ceremony.toNextOne", { level: t(`level.${upcoming}`).toLowerCase() })
              : t("ceremony.toNextMany", { count: toNext, level: t(`level.${upcoming}`).toLowerCase() })}
          </p>
        ) : null}
        {doodleCard}
        <PrimaryAction text={t("ceremony.done")} onClick={done} />
      </main>
    );
  }

  const level = checkIn.stamp_level ?? "bronze";
  const earnedAt = checkIn.occurred_at;
  const nth = passport ? Math.max(passport.stamped_count, 1) : null;
  const ringFraction = areaShops.length ? areaStamped / areaShops.length : 0;
  const circumference = 2 * Math.PI * 22;

  return (
    <main
      className="screen screen--glow ceremony"
      data-phase={phase}
      onClick={() => {
        if (canSkip && phase === "pressing") setPhase("settled");
      }}
    >
      <div className="ceremony__disc">
        <div className="ceremony__stamp">
          <InkStamp
            name={checkIn.shop.name}
            amharic={shop ? `${checkIn.shop.name_am} · ${shop.neighborhood.name_am}` : checkIn.shop.name_am}
            date={stampDate(earnedAt)}
            level="clay"
            size={236}
            rotation={stampRotation(`${checkIn.shop.id}`)}
            label={`${checkIn.shop.name}, ${t(`level.${level}`)}, ${stampDate(earnedAt)}`}
          />
        </div>
        <span className="ceremony__level mono">{t(`level.${level}`)}</span>
      </div>

      <div className="ceremony__words">
        <Headline first={t("ceremony.stamped")} second={t("ceremony.where", { shop: checkIn.shop.name, area })} align="center" />
        <p className="ceremony__line">
          {nth ? t("ceremony.nth", { ordinal: ordinal(nth) }) : null}{" "}
          {toNext && upcoming
            ? toNext === 1
              ? t("ceremony.toNextOne", { level: t(`level.${upcoming}`).toLowerCase() })
              : t("ceremony.toNextMany", { count: toNext, level: t(`level.${upcoming}`).toLowerCase() })
            : null}
        </p>
      </div>

      {areaShops.length > 0 ? (
        <div className="card ceremony__progress">
          <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`${t("ceremony.areaProgress", { stamped: areaStamped, total: areaShops.length })} ${t("ceremony.areaIn", { area })}`}>
            <circle cx="26" cy="26" r="22" fill="none" stroke="var(--sunken)" strokeWidth="6" />
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${ringFraction * circumference} ${circumference}`}
              transform="rotate(-90 26 26)"
            />
          </svg>
          <div className="ceremony__progress-text">
            <span className="ceremony__progress-title">
              <span className="mono">{t("ceremony.areaProgress", { stamped: areaStamped, total: areaShops.length })}</span>{" "}
              {t("ceremony.areaIn", { area })}
            </span>
            <span className="muted">
              {areaStamped >= areaShops.length
                ? t("ceremony.areaDone", { area })
                : t("ceremony.areaLeft", { count: areaShops.length - areaStamped })}
            </span>
          </div>
        </div>
      ) : null}

      {doodleCard}

      {phase === "pressing" && canSkip ? <span className="visually-hidden">{t("ceremony.tapToSkip")}</span> : null}
      <SecondaryAction text={t("ceremony.share")} onClick={share} />
      <PrimaryAction text={t("ceremony.done")} onClick={done} />
    </main>
  );
}

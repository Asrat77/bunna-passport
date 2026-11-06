import { phArrowRight, phCheck } from "@/ui/icons";
import { useEffect, useState } from "react";
import type { Badge, CheckInResult } from "@/api/types";
import { badgeText } from "@/data/badges";
import { useMyDoodle } from "@/data/me";
import { useCatalog, usePassport } from "@/data/queries";
import dither from "@/assets/dither-mocha-240.png";
import { BadgeMark } from "@/design/badge/BadgeMark";
import { Doodle } from "@/design/doodle/Doodle";
import { LEVEL_THRESHOLDS, nextLevel, visitsToNextLevel } from "@/design/seal/levels";
import { Seal } from "@/design/seal/Seal";
import { InkStamp } from "@/design/stamp/InkStamp";
import { stampDate, stampRotation } from "@/design/stamp/geometry";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { PrimaryAction, SecondaryAction } from "@/telegram/buttons";
import { hapticBadge, hapticSuccess } from "@/telegram/haptics";
import { useMochaChrome } from "@/telegram/mochaChrome";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { ReviewComposer } from "./review/ReviewComposer";
import "./ceremony.css";

/** Skippable from 0.8 s; everything has landed by about 1.6 s (DESIGN.md §6.2). */
const SKIPPABLE_AFTER_MS = 800;

/** Badges slide in after the stamp has landed, never alongside it (DESIGN.md §6.3). */
const BADGE_AFTER_MS = { stamp: 1100, cup: 700 };

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Check-ins whose ceremony already played, so coming back from sharing doesn't press the stamp again. */
const celebrated = new Set<number>();

/**
 * The stamp ceremony for a first visit, and the compact "+1 cup" tick for a
 * repeat one. The doodle card only appears on the first cup of the coffee
 * day, since that's the only time it wakes. Both are Mocha in either phone
 * theme, under the same dither header as Explore (docs/DESIGN.md §2.2.1).
 */
export function Ceremony({ checkIn, wasAwake }: { checkIn: CheckInResult; wasAwake: boolean }) {
  const { t, language, ordinal } = useI18n();
  const { switchTab, push } = useNavigation();
  const { data: passport } = usePassport();
  const catalog = useCatalog();
  const doodle = useMyDoodle();
  const [replay] = useState(() => celebrated.has(checkIn.id));
  const [phase, setPhase] = useState<"pressing" | "settled">(replay || reducedMotion() ? "settled" : "pressing");
  const [canSkip, setCanSkip] = useState(false);
  useMochaChrome();

  const badges = checkIn.badges_earned ?? [];

  useEffect(() => {
    celebrated.add(checkIn.id);
    if (!replay) hapticSuccess();
    // The badge's double tick lands with its card, a beat after the thunk.
    const tick =
      !replay && badges.length > 0
        ? window.setTimeout(hapticBadge, reducedMotion() ? 300 : BADGE_AFTER_MS[checkIn.stamp_earned ? "stamp" : "cup"])
        : undefined;
    if (phase === "settled") return () => window.clearTimeout(tick);
    const skip = window.setTimeout(() => setCanSkip(true), SKIPPABLE_AFTER_MS);
    const settle = window.setTimeout(() => setPhase("settled"), 1600);
    return () => {
      window.clearTimeout(skip);
      window.clearTimeout(settle);
      window.clearTimeout(tick);
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
  // A level-up names its own count; otherwise the passport may still be refetching.
  const levelUp = !checkIn.stamp_earned ? checkIn.level_reached : null;
  const visits = levelUp
    ? (LEVEL_THRESHOLDS.find(([level]) => level === levelUp)?.[1] ?? 1)
    : (stampHere?.check_ins_count ?? 1);
  const toNext = visitsToNextLevel(visits);
  const upcoming = nextLevel(visits);
  const firstCupToday = !wasAwake;
  const done = () => switchTab("passport");
  const share = () => push({ name: "share", target: { checkInId: checkIn.id }, shopName: checkIn.shop.name });

  const doodleCard = firstCupToday ? (
    <div className="ceremony__doodle">
      <div className="ceremony__faces" aria-label={t("doodle.mineAwake")} role="img">
        <Doodle seed={doodle.seed} traits={doodle.traits} mood="sleepy" size={52} decorative />
        <span className="ceremony__arrow" aria-hidden="true">
          <Icon path={phArrowRight} size={20} />
        </span>
        <span className="ceremony__awake">
          <span className="ceremony__awake-sleepy">
            <Doodle seed={doodle.seed} traits={doodle.traits} mood="sleepy" size={52} decorative />
          </span>
          <span className="ceremony__awake-awake">
            <Doodle seed={doodle.seed} traits={doodle.traits} mood="awake" size={52} decorative />
          </span>
        </span>
      </div>
      <div className="ceremony__doodle-text">
        <span className="ceremony__doodle-title">{t("ceremony.awakeTitle")}</span>
        <span className="muted">{t("ceremony.awakeBody")}</span>
      </div>
    </div>
  ) : null;

  const badgeCards = badges.length > 0 ? <BadgeCards badges={badges} /> : null;

  // Asked while the visit is fresh: one tap on a cup is a whole review.
  const reviewCard = checkIn.rating ? null : (
    <div className="ceremony__review">
      <ReviewComposer visit={checkIn} />
    </div>
  );

  if (!checkIn.stamp_earned) {
    const levelName = levelUp ? t(`level.${levelUp}`) : "";
    return (
      <main className="screen ceremony ceremony--cup mocha" data-phase={phase}>
        <img className="ceremony__dither" src={dither} alt="" aria-hidden="true" />
        {levelUp ? (
          <div className="ceremony__tick ceremony__tick--level">
            <Seal name={checkIn.shop.name} level={levelUp} size={60} label={`${checkIn.shop.name}, ${levelName}`} />
          </div>
        ) : (
          <div className="ceremony__tick" aria-hidden="true">
            <Icon path={phCheck} size={44} />
          </div>
        )}
        <Headline
          first={levelUp ? t("ceremony.levelTitle", { level: levelName }) : t("ceremony.cupTitle")}
          second={
            levelUp
              ? t("ceremony.levelBody", { count: visits, shop: checkIn.shop.name, level: levelName.toLowerCase() })
              : t("ceremony.cupBody", { count: visits, shop: checkIn.shop.name })
          }
          size={31}
          align="center"
        />
        {toNext && upcoming ? (
          <p className="ceremony__line">
            {toNext === 1
              ? t("ceremony.toNextOne", { level: t(`level.${upcoming}`).toLowerCase() })
              : t("ceremony.toNextMany", { count: toNext, level: t(`level.${upcoming}`).toLowerCase() })}
          </p>
        ) : levelUp ? (
          <p className="ceremony__line">{t("ceremony.levelTop")}</p>
        ) : null}
        {doodleCard}
        {badgeCards}
        {reviewCard}
        <PrimaryAction text={t("ceremony.done")} onClick={done} mocha />
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
      className="screen ceremony mocha"
      data-phase={phase}
      onClick={() => {
        if (canSkip && phase === "pressing") setPhase("settled");
      }}
    >
      <img className="ceremony__dither" src={dither} alt="" aria-hidden="true" />
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
        <Headline first={t("ceremony.stamped")} second={t("ceremony.where", { shop: checkIn.shop.name, area })} size={31} align="center" />
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
        <div className="ceremony__progress">
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
      {badgeCards}
      {reviewCard}

      {phase === "pressing" && canSkip ? <span className="visually-hidden">{t("ceremony.tapToSkip")}</span> : null}
      <SecondaryAction text={t("ceremony.share")} onClick={share} />
      <PrimaryAction text={t("ceremony.done")} onClick={done} mocha />
    </main>
  );
}

/** "Badge earned — Ten Cups", one card a badge, sliding in after the stamp. */
function BadgeCards({ badges }: { badges: Badge[] }) {
  const { t } = useI18n();
  return (
    <>
      {badges.map((badge) => {
        const text = badgeText(badge, t);
        return (
          <div key={badge.id} className="ceremony__badge" role="status">
            <BadgeMark artworkKey={badge.artwork_key} tier={badge.tier} earned size={52} />
            <div className="ceremony__badge-text">
              <span className="ceremony__badge-kicker mono">{t("badge.earned")}</span>
              <span className="ceremony__badge-title">{text.name}</span>
              <span className="muted">{text.description}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

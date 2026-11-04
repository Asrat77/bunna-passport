import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phArrowRight, phCheck } from "@/ui/icons";
import { useEffect, useState } from "react";
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
import "./ceremony.css";
/** Skippable from 0.8 s; everything has landed by about 1.6 s (DESIGN.md §6.2). */
const SKIPPABLE_AFTER_MS = 800;
/** Badges slide in after the stamp has landed, never alongside it (DESIGN.md §6.3). */
const BADGE_AFTER_MS = { stamp: 1100, cup: 700 };
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
/** Check-ins whose ceremony already played, so coming back from sharing doesn't press the stamp again. */
const celebrated = new Set();
/**
 * The stamp ceremony for a first visit, and the compact "+1 cup" tick for a
 * repeat one. The doodle card only appears on the first cup of the coffee
 * day, since that's the only time it wakes. Both are Mocha in either phone
 * theme, under the same dither header as Explore (docs/DESIGN.md §2.2.1).
 */
export function Ceremony({ checkIn, wasAwake }) {
    const { t, language, ordinal } = useI18n();
    const { switchTab, push } = useNavigation();
    const { data: passport } = usePassport();
    const catalog = useCatalog();
    const doodle = useMyDoodle();
    const [replay] = useState(() => celebrated.has(checkIn.id));
    const [phase, setPhase] = useState(replay || reducedMotion() ? "settled" : "pressing");
    const [canSkip, setCanSkip] = useState(false);
    useMochaChrome();
    const badges = checkIn.badges_earned ?? [];
    useEffect(() => {
        celebrated.add(checkIn.id);
        if (!replay)
            hapticSuccess();
        // The badge's double tick lands with its card, a beat after the thunk.
        const tick = !replay && badges.length > 0
            ? window.setTimeout(hapticBadge, reducedMotion() ? 300 : BADGE_AFTER_MS[checkIn.stamp_earned ? "stamp" : "cup"])
            : undefined;
        if (phase === "settled")
            return () => window.clearTimeout(tick);
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
    const doodleCard = firstCupToday ? (_jsxs("div", { className: "ceremony__doodle", children: [_jsxs("div", { className: "ceremony__faces", "aria-label": t("doodle.mineAwake"), role: "img", children: [_jsx(Doodle, { seed: doodle.seed, traits: doodle.traits, mood: "sleepy", size: 52, decorative: true }), _jsx("span", { className: "ceremony__arrow", "aria-hidden": "true", children: _jsx(Icon, { path: phArrowRight, size: 20 }) }), _jsxs("span", { className: "ceremony__awake", children: [_jsx("span", { className: "ceremony__awake-sleepy", children: _jsx(Doodle, { seed: doodle.seed, traits: doodle.traits, mood: "sleepy", size: 52, decorative: true }) }), _jsx("span", { className: "ceremony__awake-awake", children: _jsx(Doodle, { seed: doodle.seed, traits: doodle.traits, mood: "awake", size: 52, decorative: true }) })] })] }), _jsxs("div", { className: "ceremony__doodle-text", children: [_jsx("span", { className: "ceremony__doodle-title", children: t("ceremony.awakeTitle") }), _jsx("span", { className: "muted", children: t("ceremony.awakeBody") })] })] })) : null;
    const badgeCards = badges.length > 0 ? _jsx(BadgeCards, { badges: badges }) : null;
    if (!checkIn.stamp_earned) {
        const levelName = levelUp ? t(`level.${levelUp}`) : "";
        return (_jsxs("main", { className: "screen ceremony ceremony--cup mocha", "data-phase": phase, children: [_jsx("img", { className: "ceremony__dither", src: dither, alt: "", "aria-hidden": "true" }), levelUp ? (_jsx("div", { className: "ceremony__tick ceremony__tick--level", children: _jsx(Seal, { name: checkIn.shop.name, level: levelUp, size: 60, label: `${checkIn.shop.name}, ${levelName}` }) })) : (_jsx("div", { className: "ceremony__tick", "aria-hidden": "true", children: _jsx(Icon, { path: phCheck, size: 44 }) })), _jsx(Headline, { first: levelUp ? t("ceremony.levelTitle", { level: levelName }) : t("ceremony.cupTitle"), second: levelUp
                        ? t("ceremony.levelBody", { count: visits, shop: checkIn.shop.name, level: levelName.toLowerCase() })
                        : t("ceremony.cupBody", { count: visits, shop: checkIn.shop.name }), size: 31, align: "center" }), toNext && upcoming ? (_jsx("p", { className: "ceremony__line", children: toNext === 1
                        ? t("ceremony.toNextOne", { level: t(`level.${upcoming}`).toLowerCase() })
                        : t("ceremony.toNextMany", { count: toNext, level: t(`level.${upcoming}`).toLowerCase() }) })) : levelUp ? (_jsx("p", { className: "ceremony__line", children: t("ceremony.levelTop") })) : null, doodleCard, badgeCards, _jsx(PrimaryAction, { text: t("ceremony.done"), onClick: done, mocha: true })] }));
    }
    const level = checkIn.stamp_level ?? "bronze";
    const earnedAt = checkIn.occurred_at;
    const nth = passport ? Math.max(passport.stamped_count, 1) : null;
    const ringFraction = areaShops.length ? areaStamped / areaShops.length : 0;
    const circumference = 2 * Math.PI * 22;
    return (_jsxs("main", { className: "screen ceremony mocha", "data-phase": phase, onClick: () => {
            if (canSkip && phase === "pressing")
                setPhase("settled");
        }, children: [_jsx("img", { className: "ceremony__dither", src: dither, alt: "", "aria-hidden": "true" }), _jsxs("div", { className: "ceremony__disc", children: [_jsx("div", { className: "ceremony__stamp", children: _jsx(InkStamp, { name: checkIn.shop.name, amharic: shop ? `${checkIn.shop.name_am} · ${shop.neighborhood.name_am}` : checkIn.shop.name_am, date: stampDate(earnedAt), level: "clay", size: 236, rotation: stampRotation(`${checkIn.shop.id}`), label: `${checkIn.shop.name}, ${t(`level.${level}`)}, ${stampDate(earnedAt)}` }) }), _jsx("span", { className: "ceremony__level mono", children: t(`level.${level}`) })] }), _jsxs("div", { className: "ceremony__words", children: [_jsx(Headline, { first: t("ceremony.stamped"), second: t("ceremony.where", { shop: checkIn.shop.name, area }), size: 31, align: "center" }), _jsxs("p", { className: "ceremony__line", children: [nth ? t("ceremony.nth", { ordinal: ordinal(nth) }) : null, " ", toNext && upcoming
                                ? toNext === 1
                                    ? t("ceremony.toNextOne", { level: t(`level.${upcoming}`).toLowerCase() })
                                    : t("ceremony.toNextMany", { count: toNext, level: t(`level.${upcoming}`).toLowerCase() })
                                : null] })] }), areaShops.length > 0 ? (_jsxs("div", { className: "ceremony__progress", children: [_jsxs("svg", { width: "52", height: "52", viewBox: "0 0 52 52", role: "img", "aria-label": `${t("ceremony.areaProgress", { stamped: areaStamped, total: areaShops.length })} ${t("ceremony.areaIn", { area })}`, children: [_jsx("circle", { cx: "26", cy: "26", r: "22", fill: "none", stroke: "var(--sunken)", strokeWidth: "6" }), _jsx("circle", { cx: "26", cy: "26", r: "22", fill: "none", stroke: "var(--accent)", strokeWidth: "6", strokeLinecap: "round", strokeDasharray: `${ringFraction * circumference} ${circumference}`, transform: "rotate(-90 26 26)" })] }), _jsxs("div", { className: "ceremony__progress-text", children: [_jsxs("span", { className: "ceremony__progress-title", children: [_jsx("span", { className: "mono", children: t("ceremony.areaProgress", { stamped: areaStamped, total: areaShops.length }) }), " ", t("ceremony.areaIn", { area })] }), _jsx("span", { className: "muted", children: areaStamped >= areaShops.length
                                    ? t("ceremony.areaDone", { area })
                                    : t("ceremony.areaLeft", { count: areaShops.length - areaStamped }) })] })] })) : null, doodleCard, badgeCards, phase === "pressing" && canSkip ? _jsx("span", { className: "visually-hidden", children: t("ceremony.tapToSkip") }) : null, _jsx(SecondaryAction, { text: t("ceremony.share"), onClick: share }), _jsx(PrimaryAction, { text: t("ceremony.done"), onClick: done, mocha: true })] }));
}
/** "Badge earned — Ten Cups", one card a badge, sliding in after the stamp. */
function BadgeCards({ badges }) {
    const { t } = useI18n();
    return (_jsx(_Fragment, { children: badges.map((badge) => {
            const text = badgeText(badge, t);
            return (_jsxs("div", { className: "ceremony__badge", role: "status", children: [_jsx(BadgeMark, { artworkKey: badge.artwork_key, tier: badge.tier, earned: true, size: 52 }), _jsxs("div", { className: "ceremony__badge-text", children: [_jsx("span", { className: "ceremony__badge-kicker mono", children: t("badge.earned") }), _jsx("span", { className: "ceremony__badge-title", children: text.name }), _jsx("span", { className: "muted", children: text.description })] })] }, badge.id));
        }) }));
}

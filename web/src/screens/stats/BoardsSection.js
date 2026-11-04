import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phCaretDown } from "@/ui/icons";
import { useMemo, useState } from "react";
import { doodleSeedFor, doodleTraitsFor, useMyDoodle } from "@/data/me";
import { useCatalog, useFriends, useLeaderboard, usePassport, useProfile } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./boards.css";
const SHOWN_BELOW_PODIUM = 7;
/**
 * This week's boards (DESIGN.md §6.5), the first section of Stats: your
 * neighbourhood, all Addis, or just you and your friends. Handles
 * only, never real names. A doodle is awake when that person has had a cup
 * today, unless they've chosen to keep it to themselves.
 */
export function BoardsSection() {
    const { t, language } = useI18n();
    const { data: profile } = useProfile();
    const { data: passport } = usePassport();
    const catalog = useCatalog();
    const mine = useMyDoodle();
    const { data: friends } = useFriends();
    const hasFriends = (friends?.length ?? 0) > 0;
    const [scope, setScope] = useState("neighborhood");
    const [metric, setMetric] = useState("cups");
    // Your board is your home neighbourhood, else wherever you last got a stamp.
    const neighborhood = useMemo(() => {
        const shops = catalog.data ?? [];
        const home = profile?.home_neighborhood_id;
        const fromHome = home ? shops.find((s) => s.neighborhood.id === home)?.neighborhood : undefined;
        const newest = passport?.stamps[0]?.shop.id;
        return fromHome ?? shops.find((s) => s.id === newest)?.neighborhood;
    }, [catalog.data, profile, passport]);
    const effectiveScope = scope === "friends" && hasFriends ? "friends" : scope === "neighborhood" && neighborhood ? "neighborhood" : "city";
    const board = useLeaderboard({ scope: effectiveScope, neighborhoodId: neighborhood?.id, metric });
    const entries = board.data ?? [];
    const place = effectiveScope === "friends"
        ? t("boards.friendsPlace")
        : effectiveScope === "neighborhood" && neighborhood
            ? language === "am"
                ? neighborhood.name_am
                : neighborhood.name
            : t("boards.city");
    const me = profile ? entries.find((entry) => entry.user.id === profile.id) : undefined;
    const top = entries.slice(0, 3);
    const podium = [top[1], top[0], top[2]].filter(Boolean);
    const rest = entries.slice(3, 3 + SHOWN_BELOW_PODIUM);
    const value = (entry) => t(metric === "cups" ? "boards.cupsCount" : "boards.cafesCount", { count: entry.value });
    return (_jsxs(_Fragment, { children: [_jsx(Headline, { first: t("boards.thisWeekIn"), second: t("boards.place", { place }), size: 32 }), _jsxs("div", { className: "boards__controls", children: [_jsxs("div", { className: "segment segment--raised", role: "group", "aria-label": t("boards.scope"), children: [neighborhood ? (_jsx("button", { type: "button", "aria-pressed": effectiveScope === "neighborhood", onClick: () => setScope("neighborhood"), children: language === "am" ? neighborhood.name_am : neighborhood.name })) : null, _jsx("button", { type: "button", "aria-pressed": effectiveScope === "city", onClick: () => setScope("city"), children: t("boards.allAddis") }), hasFriends ? (_jsx("button", { type: "button", "aria-pressed": effectiveScope === "friends", onClick: () => setScope("friends"), children: t("boards.friends") })) : null] }), _jsxs("label", { className: "select-pill", children: [_jsx("span", { className: "visually-hidden", children: t("boards.metric") }), _jsxs("select", { value: metric, onChange: (event) => setMetric(event.target.value), children: [_jsx("option", { value: "cups", children: t("boards.cups") }), _jsx("option", { value: "shops", children: t("boards.cafes") })] }), _jsx(Icon, { path: phCaretDown, size: 16 })] })] }), board.isPending ? (_jsx("div", { className: "skeleton", style: { height: 220 } })) : entries.length === 0 ? (_jsx("p", { className: "notice", children: t("boards.empty") })) : (_jsxs(_Fragment, { children: [_jsx("ol", { className: "podium", "aria-label": t("boards.topThree"), children: podium.map((entry) => {
                            const first = entry.rank === 1;
                            return (_jsxs("li", { className: first ? "podium__place podium__place--first" : "podium__place", value: entry.rank, children: [_jsx(EntryDoodle, { entry: entry, size: first ? 66 : 56 }), _jsxs("span", { className: "podium__handle", children: ["@", entry.user.handle] }), _jsx("span", { className: "podium__value mono", children: value(entry) }), _jsx("div", { className: `podium__block podium__block--${entry.rank}`, children: _jsx("span", { className: "mono", children: entry.rank }) })] }, entry.user.id));
                        }) }), rest.length > 0 ? (_jsx("ol", { className: "card board-rows", "aria-label": t("boards.rest"), children: rest.map((entry) => (_jsxs("li", { className: "board-row", value: entry.rank, children: [_jsx("span", { className: "board-row__rank mono", children: entry.rank }), _jsx(EntryDoodle, { entry: entry, size: 36 }), _jsxs("span", { className: "board-row__who", children: [_jsxs("span", { className: "board-row__handle", children: ["@", entry.user.handle] }), _jsx("span", { className: "board-row__note", children: cupNote(entry, t) })] }), _jsx("span", { className: "board-row__value mono", children: entry.value })] }, entry.user.id))) })) : null] })), profile ? (_jsxs("div", { className: "board-me", children: [_jsx("span", { className: "board-me__rank mono", children: me ? `#${me.rank}` : "–" }), _jsx(Doodle, { seed: mine.seed, traits: mine.traits, mood: mine.awake ? "awake" : "sleepy", size: 38, label: t(mine.awake ? "doodle.mineAwake" : "doodle.mineSleepy") }), _jsxs("span", { className: "board-row__who", children: [_jsx("span", { className: "board-row__handle", children: t("boards.you") }), _jsx("span", { className: "board-row__note", children: me ? t("boards.yourRank", { rank: me.rank }) : t("boards.unranked") })] }), _jsx("span", { className: "board-row__value mono", children: me?.value ?? 0 })] })) : null, _jsx("p", { className: "boards__footnote", children: t("boards.footnote") })] }));
}
function cupNote(entry, t) {
    if (entry.user.had_cup_today === null)
        return t("boards.private");
    return entry.user.had_cup_today ? t("boards.hadCup") : t("boards.noCupYet");
}
function EntryDoodle({ entry, size }) {
    const { t } = useI18n();
    const handle = `@${entry.user.handle}`;
    const awake = entry.user.had_cup_today === true;
    const label = entry.user.had_cup_today === null
        ? t("doodle.other", { handle })
        : t(awake ? "doodle.otherAwake" : "doodle.otherSleepy", { handle });
    return _jsx(Doodle, { seed: doodleSeedFor(entry.user), traits: doodleTraitsFor(entry.user), mood: awake ? "awake" : "sleepy", size: size, label: label });
}

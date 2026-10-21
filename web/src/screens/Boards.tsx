import { mdiChevronDown } from "@mdi/js";
import { useMemo, useState } from "react";
import type { LeaderboardEntry, LeaderboardMetric } from "@/api/types";
import { doodleSeedFor, useMyDoodle } from "@/data/me";
import { useCatalog, useLeaderboard, usePassport, useProfile } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { Dock } from "@/ui/Dock";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./boards.css";

const SHOWN_BELOW_PODIUM = 7;

/**
 * This week's boards (DESIGN.md §6.5). Handles only, never real names. A
 * doodle is awake when that person has had a cup today, unless they've
 * chosen to keep it to themselves.
 */
export function Boards() {
  const { t, language } = useI18n();
  const { data: profile } = useProfile();
  const { data: passport } = usePassport();
  const catalog = useCatalog();
  const mine = useMyDoodle();
  const [scope, setScope] = useState<"neighborhood" | "city">("neighborhood");
  const [metric, setMetric] = useState<LeaderboardMetric>("cups");

  // Your board is your home neighbourhood, else wherever you last got a stamp.
  const neighborhood = useMemo(() => {
    const shops = catalog.data ?? [];
    const home = profile?.home_neighborhood_id;
    const fromHome = home ? shops.find((s) => s.neighborhood.id === home)?.neighborhood : undefined;
    const newest = passport?.stamps[0]?.shop.id;
    return fromHome ?? shops.find((s) => s.id === newest)?.neighborhood;
  }, [catalog.data, profile, passport]);

  const effectiveScope = scope === "neighborhood" && neighborhood ? "neighborhood" : "city";
  const board = useLeaderboard({ scope: effectiveScope, neighborhoodId: neighborhood?.id, metric });
  const entries = board.data ?? [];
  const place =
    effectiveScope === "neighborhood" && neighborhood
      ? language === "am"
        ? neighborhood.name_am
        : neighborhood.name
      : t("boards.city");
  const me = profile ? entries.find((entry) => entry.user.id === profile.id) : undefined;
  const top = entries.slice(0, 3);
  const podium = [top[1], top[0], top[2]].filter(Boolean) as LeaderboardEntry[];
  const rest = entries.slice(3, 3 + SHOWN_BELOW_PODIUM);
  const value = (entry: LeaderboardEntry) =>
    t(metric === "cups" ? "boards.cupsCount" : "boards.cafesCount", { count: entry.value });

  return (
    <main className="screen screen--with-dock boards">
      <Headline first={t("boards.thisWeekIn")} second={t("boards.place", { place })} size={32} />

      <div className="boards__controls">
        <div className="segment segment--raised" role="group" aria-label={t("boards.scope")}>
          {neighborhood ? (
            <button type="button" aria-pressed={effectiveScope === "neighborhood"} onClick={() => setScope("neighborhood")}>
              {language === "am" ? neighborhood.name_am : neighborhood.name}
            </button>
          ) : null}
          <button type="button" aria-pressed={effectiveScope === "city"} onClick={() => setScope("city")}>
            {t("boards.allAddis")}
          </button>
        </div>
        <label className="select-pill">
          <span className="visually-hidden">{t("boards.metric")}</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value as LeaderboardMetric)}>
            <option value="cups">{t("boards.cups")}</option>
            <option value="shops">{t("boards.cafes")}</option>
          </select>
          <Icon path={mdiChevronDown} size={16} />
        </label>
      </div>

      {board.isPending ? (
        <div className="skeleton" style={{ height: 220 }} />
      ) : entries.length === 0 ? (
        <p className="notice">{t("boards.empty")}</p>
      ) : (
        <>
          <ol className="podium" aria-label={t("boards.topThree")}>
            {podium.map((entry) => {
              const first = entry.rank === 1;
              return (
                <li key={entry.user.id} className={first ? "podium__place podium__place--first" : "podium__place"} value={entry.rank}>
                  <EntryDoodle entry={entry} size={first ? 66 : 56} />
                  <span className="podium__handle">@{entry.user.handle}</span>
                  <span className="podium__value mono">{value(entry)}</span>
                  <div className={`podium__block podium__block--${entry.rank}`}>
                    <span className="mono">{entry.rank}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {rest.length > 0 ? (
            <ol className="card board-rows" aria-label={t("boards.rest")}>
              {rest.map((entry) => (
                <li key={entry.user.id} className="board-row" value={entry.rank}>
                  <span className="board-row__rank mono">{entry.rank}</span>
                  <EntryDoodle entry={entry} size={36} />
                  <span className="board-row__who">
                    <span className="board-row__handle">@{entry.user.handle}</span>
                    <span className="board-row__note">{cupNote(entry, t)}</span>
                  </span>
                  <span className="board-row__value mono">{entry.value}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}

      {profile ? (
        <div className="board-me">
          <span className="board-me__rank mono">{me ? `#${me.rank}` : "–"}</span>
          <Doodle seed={mine.seed} mood={mine.awake ? "awake" : "sleepy"} size={38} label={t(mine.awake ? "doodle.mineAwake" : "doodle.mineSleepy")} />
          <span className="board-row__who">
            <span className="board-row__handle">{t("boards.you")}</span>
            <span className="board-row__note">{me ? t("boards.yourRank", { rank: me.rank }) : t("boards.unranked")}</span>
          </span>
          <span className="board-row__value mono">{me?.value ?? 0}</span>
        </div>
      ) : null}

      <p className="boards__footnote">{t("boards.footnote")}</p>
      <Dock />
    </main>
  );
}

function cupNote(entry: LeaderboardEntry, t: ReturnType<typeof useI18n>["t"]): string {
  if (entry.user.had_cup_today === null) return t("boards.private");
  return entry.user.had_cup_today ? t("boards.hadCup") : t("boards.noCupYet");
}

function EntryDoodle({ entry, size }: { entry: LeaderboardEntry; size: number }) {
  const { t } = useI18n();
  const handle = `@${entry.user.handle}`;
  const awake = entry.user.had_cup_today === true;
  const label =
    entry.user.had_cup_today === null
      ? t("doodle.other", { handle })
      : t(awake ? "doodle.otherAwake" : "doodle.otherSleepy", { handle });
  return <Doodle seed={doodleSeedFor(entry.user)} mood={awake ? "awake" : "sleepy"} size={size} label={label} />;
}

import type { BadgeProgress } from "@/api/types";
import { badgeText, useBadges } from "@/data/badges";
import { BadgeMark } from "@/design/badge/BadgeMark";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { Icon } from "@/ui/Icon";
import { phCaretRight, phCheck } from "@/ui/icons";

/**
 * A running challenge such as Bole 10: which of its cafés you still need,
 * and until when. Each café opens its page, where the check-in is. The
 * server only sends a challenge while it runs, or once you've earned it.
 */
export function ChallengeCards() {
  const { data: badges } = useBadges();
  const challenges = (badges ?? []).filter((badge) => badge.challenge);
  if (challenges.length === 0) return null;
  return (
    <>
      {challenges.map((badge) => (
        <ChallengeCard key={badge.id} badge={badge} />
      ))}
    </>
  );
}

function ChallengeCard({ badge }: { badge: BadgeProgress }) {
  const { t, language } = useI18n();
  const { push } = useNavigation();
  const challenge = badge.challenge!;
  const text = badgeText(badge, t);
  const earned = Boolean(badge.earned_at);
  const visited = challenge.shops.filter((shop) => shop.visited).length;
  // ends_at is exclusive (midnight after the last day), so show the day before.
  const lastDay = new Date(new Date(challenge.ends_at).getTime() - 1000);
  const until = new Intl.DateTimeFormat(language === "am" ? "am-ET" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Addis_Ababa",
  }).format(lastDay);

  return (
    <section className="card challenge" aria-labelledby={`challenge-${badge.id}`}>
      <div className="challenge__head">
        <BadgeMark artworkKey={badge.artwork_key} tier={badge.tier} earned={earned} size={44} label={text.name} />
        <div>
          <h2 className="section-title" id={`challenge-${badge.id}`}>
            {text.name}
          </h2>
          <p className="muted challenge__sub">
            {earned ? t("challenge.done") : t("challenge.until", { date: until })}
            {" · "}
            <span className="mono">{t("badge.progress", { progress: visited, threshold: challenge.shops.length })}</span>
          </p>
        </div>
      </div>
      <p className="challenge__description">{text.description}</p>
      <ul className="challenge__shops">
        {challenge.shops.map((shop) => (
          <li key={shop.id}>
            <button type="button" className="challenge__shop" onClick={() => push({ name: "shop", id: shop.id })}>
              <span className={shop.visited ? "challenge__tick challenge__tick--done" : "challenge__tick"} aria-hidden="true">
                {shop.visited ? <Icon path={phCheck} size={14} /> : null}
              </span>
              <span className="challenge__shop-name">{language === "am" && shop.name_am ? shop.name_am : shop.name}</span>
              <Icon path={phCaretRight} size={16} />
              <span className="visually-hidden">{t(shop.visited ? "challenge.visited" : "challenge.notVisited")}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

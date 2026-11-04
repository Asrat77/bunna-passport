import type { BadgeProgress } from "@/api/types";
import { badgeText, useBadges } from "@/data/badges";
import { BadgeMark } from "@/design/badge/BadgeMark";
import { useI18n } from "@/i18n/context";

/**
 * Every badge on one shelf (DESIGN.md §6.3): earned ones struck in their
 * metal, the rest as embossed blanks with how far along they are.
 */
export function BadgeShelf() {
  const { t } = useI18n();
  const { data: badges } = useBadges();
  if (!badges || badges.length === 0) return null;

  const earned = badges.filter((badge) => badge.earned_at).length;
  return (
    <section className="badge-shelf" aria-labelledby="badge-shelf-title">
      <div className="section-head">
        <h2 className="section-title" id="badge-shelf-title">
          {t("badge.shelfTitle")}
        </h2>
        <span className="muted badge-shelf__count mono">{t("badge.shelfCount", { count: earned, total: badges.length })}</span>
      </div>
      <ul className="badge-shelf__row">
        {badges.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} />
        ))}
      </ul>
    </section>
  );
}

function BadgeTile({ badge }: { badge: BadgeProgress }) {
  const { t, language } = useI18n();
  const text = badgeText(badge, t);
  const earned = Boolean(badge.earned_at);
  const progress = Math.min(badge.progress, badge.threshold);
  const date = badge.earned_at
    ? new Intl.DateTimeFormat(language === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short" }).format(new Date(badge.earned_at))
    : null;

  return (
    <li className={earned ? "badge-tile" : "badge-tile badge-tile--locked"} title={text.description}>
      <BadgeMark
        artworkKey={badge.artwork_key}
        tier={badge.tier}
        earned={earned}
        size={56}
        label={t("badge.label", { name: text.name, state: t(earned ? "badge.stateEarned" : "badge.stateLocked") })}
      />
      <span className="badge-tile__name">{text.name}</span>
      {date ? (
        <span className="badge-tile__foot muted">{t("badge.earnedOn", { date })}</span>
      ) : (
        <>
          <span className="progress badge-tile__bar" aria-hidden="true">
            <span className="progress__fill" style={{ width: `${(progress / badge.threshold) * 100}%` }} />
          </span>
          <span className="badge-tile__foot muted mono">{t("badge.progress", { progress, threshold: badge.threshold })}</span>
        </>
      )}
    </li>
  );
}

import { phChartBar, phCoffee, phCompass, phStamp } from "./icons";
import { useI18n } from "@/i18n/context";
import { useNavigation, type Tab } from "@/nav/Navigation";
import { Icon } from "./Icon";

const TABS: { tab: Tab; icon: string; label: "tab.explore" | "tab.passport" | "tab.stats" }[] = [
  { tab: "explore", icon: phCompass, label: "tab.explore" },
  { tab: "passport", icon: phStamp, label: "tab.passport" },
  { tab: "stats", icon: phChartBar, label: "tab.stats" },
];

/**
 * The navigation dock: three labelled tabs in a raised pill and the Check in
 * control to the right, a pill with its label on Explore and Passport and a
 * circle on Stats.
 */
export function Dock() {
  const { t } = useI18n();
  const { tab: current, switchTab, push } = useNavigation();
  const compact = current === "stats";

  return (
    <div className="dock">
      <nav className="dock__tabs" aria-label={t("dock.label")}>
        {TABS.map(({ tab, icon, label }) => (
          <button
            key={tab}
            type="button"
            className="dock__tab"
            aria-current={tab === current ? "page" : undefined}
            onClick={() => switchTab(tab)}
          >
            <Icon path={icon} size={21} />
            {t(label)}
          </button>
        ))}
      </nav>
      <button
        type="button"
        className={compact ? "dock__checkin dock__checkin--round" : "dock__checkin"}
        aria-label={compact ? t("checkin.action") : undefined}
        onClick={() => push({ name: "checkin" })}
      >
        <Icon path={phCoffee} size={23} />
        {compact ? null : t("checkin.action")}
      </button>
    </div>
  );
}

import { phChartBar, phHouse, phMapPin, phStamp } from "./icons";
import { useI18n } from "@/i18n/context";
import { useNavigation, type Tab } from "@/nav/Navigation";
import { Icon } from "./Icon";

const TABS: { tab: Tab; icon: string; label: "tab.explore" | "tab.passport" | "tab.stats" }[] = [
  { tab: "explore", icon: phHouse, label: "tab.explore" },
  { tab: "passport", icon: phStamp, label: "tab.passport" },
  { tab: "stats", icon: phChartBar, label: "tab.stats" },
];

/**
 * The navigation dock, in Mocha on every screen (docs/DESIGN.md §2.2.1): a
 * full-width blurred bar with the tabs on the left, each an icon over its
 * name, the current one filled in, and Check in as a light named pill on the
 * right. Everything is named because icons alone left people guessing, and a
 * bare "+" for Check in read as "add".
 */
export function Dock() {
  const { t } = useI18n();
  const { tab: current, switchTab, push } = useNavigation();

  return (
    <div className="dock">
      <nav className="dock__tabs" aria-label={t("dock.label")}>
        {TABS.map(({ tab, icon, label }) => (
          <button
            key={tab}
            data-tour={tab === "explore" ? undefined : tab}
            type="button"
            className="dock__tab"
            aria-current={tab === current ? "page" : undefined}
            onClick={() => switchTab(tab)}
          >
            <Icon path={icon} size={20} />
            <span className="dock__label">{t(label)}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="dock__checkin" data-tour="checkIn" onClick={() => push({ name: "checkin" })}>
        <Icon path={phMapPin} size={20} />
        <span>{t("checkin.action")}</span>
      </button>
    </div>
  );
}

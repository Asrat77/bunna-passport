import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { Dock } from "@/ui/Dock";
import { BoardsSection } from "./stats/BoardsSection";
import { CitySection } from "./stats/CitySection";
import { YouSection } from "./stats/YouSection";
import "./stats/stats.css";

type Section = "boards" | "you" | "city";

const SECTIONS: { section: Section; label: "stats.boards" | "stats.you" | "stats.city" }[] = [
  { section: "boards", label: "stats.boards" },
  { section: "you", label: "stats.you" },
  { section: "city", label: "stats.city" },
];

// The tab unmounts whenever a shop is opened from it, so the last section
// picked is kept here and comes back on Back.
let lastSection: Section = "boards";

/**
 * The Stats tab: this week's boards, your own numbers, and the city's, picked
 * from a switch at the top.
 */
export function Stats() {
  const { t } = useI18n();
  const [section, setSection] = useState<Section>(lastSection);
  const pick = (next: Section) => {
    lastSection = next;
    setSection(next);
  };

  return (
    <main className="screen screen--with-dock stats">
      <div className="stats-switch" role="tablist" aria-label={t("stats.sections")}>
        {SECTIONS.map(({ section: value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`stats-tab-${value}`}
            aria-selected={section === value}
            aria-controls="stats-panel"
            onClick={() => pick(value)}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div className="stats__panel" id="stats-panel" role="tabpanel" aria-labelledby={`stats-tab-${section}`}>
        {section === "boards" ? <BoardsSection /> : section === "you" ? <YouSection /> : <CitySection />}
      </div>
      <Dock />
    </main>
  );
}

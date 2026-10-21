import { useState } from "react";
import type { Shop } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { useCatalog } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { Seal } from "@/design/seal/Seal";
import type { StampLevel } from "@/design/seal/levels";
import { InkStamp } from "@/design/stamp/InkStamp";
import { useI18n } from "@/i18n/context";
import { useLocation } from "@/location/LocationProvider";
import { PrimaryAction } from "@/telegram/buttons";
import { inTelegram } from "@/telegram/sdk";
import { Headline } from "@/ui/Headline";
import "./welcome.css";

const STEPS = [
  { title: "welcome.title1", titleB: "welcome.title1b", body: "welcome.body1" },
  { title: "welcome.title2", titleB: "welcome.title2b", body: "welcome.body2" },
  { title: "welcome.title3", titleB: "welcome.title3b", body: "welcome.body3" },
] as const;

/**
 * First run (handoff, Welcome). Step 1 is the designed one; steps 2 and 3
 * aren't designed, so they reuse its parts: the metals a stamp climbs
 * through, and the doodle waking with a check-in as the location primer.
 */
export function Welcome({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { telegramId, user } = useAuth();
  const catalog = useCatalog();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const seed = user?.avatar_seed ?? telegramId ?? "bunna";
  const copy = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <main className="screen screen--glow welcome">
      <div className="welcome__art" aria-hidden="true">
        {step === 0 ? <Collage shops={catalog.data ?? []} seed={seed} /> : step === 1 ? <Metals /> : <Waking seed={seed} />}
      </div>

      <div className="welcome__copy">
        <Headline first={t(copy.title)} second={t(copy.titleB)} size={36} />
        <p className="welcome__body">{t(copy.body)}</p>
        <div className="welcome__dots" role="img" aria-label={t("welcome.step", { step: step + 1 })}>
          {STEPS.map((_, index) => (
            <span key={index} className={index === step ? "welcome__dot welcome__dot--on" : "welcome__dot"} />
          ))}
        </div>
      </div>

      {inTelegram ? <p className="welcome__signed-in">{t("welcome.signedIn")}</p> : null}
      <PrimaryAction
        text={t(last ? "welcome.start" : "welcome.next")}
        onClick={() => {
          if (!last) return setStep(step + 1);
          // The primer's button is the moment to ask, never before it.
          void location.refresh();
          onDone();
        }}
      />
    </main>
  );
}

function Ticket({ shop, level, rotation, style }: { shop: Shop; level: StampLevel | null; rotation: number; style: React.CSSProperties }) {
  const { t } = useI18n();
  return (
    <div className={level ? "ticket" : "ticket ticket--missing"} style={{ ...style, transform: `rotate(${rotation}deg)` }}>
      <Seal name={shop.name} nameAm={shop.name_am} level={level} size={40} decorative />
      <span className="ticket__text">
        <span className="ticket__name">{shop.name}</span>
        <span className="ticket__meta mono">{level ? shop.neighborhood.name : t("shop.notYet")}</span>
      </span>
    </div>
  );
}

function Collage({ shops, seed }: { shops: Shop[]; seed: string }) {
  const { t } = useI18n();
  const picks = [...shops].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 3);
  return (
    <div className="collage">
      {picks[0] ? <Ticket shop={picks[0]} level="silver" rotation={-11} style={{ left: "6%", top: 34 }} /> : null}
      {picks[1] ? <Ticket shop={picks[1]} level="bronze" rotation={9} style={{ right: "4%", top: 18 }} /> : null}
      <div className="collage__disc">
        <InkStamp name="BUNNA" amharic="ቡና ፓስፖርት" date={t("welcome.firstStamp")} level="clay" size={164} rotation={-8} label="" />
      </div>
      {picks[2] ? <Ticket shop={picks[2]} level={null} rotation={7} style={{ left: "4%", top: 244 }} /> : null}
      <div className="ticket" style={{ right: "5%", top: 236, transform: "rotate(-8deg)" }}>
        <Doodle seed={seed} mood="awake" size={44} decorative />
        <span className="ticket__text">
          <span className="ticket__name">{t("welcome.you")}</span>
          <span className="ticket__meta mono">{t("welcome.afterCoffee")}</span>
        </span>
      </div>
    </div>
  );
}

function Metals() {
  const { t } = useI18n();
  const levels: StampLevel[] = ["bronze", "silver", "gold", "diamond"];
  return (
    <div className="metals">
      <div className="collage__disc collage__disc--static">
        <InkStamp name="BUNNA" amharic="ቡና ፓስፖርት" date={t("welcome.firstStamp")} level="clay" size={164} rotation={-8} label="" />
      </div>
      <div className="metals__row">
        {levels.map((level) => (
          <span key={level} className="metals__seal">
            <Seal name="Bunna" nameAm="ቡና" level={level} size={52} decorative />
            <span className="mono">{t(`level.${level}`)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Waking({ seed }: { seed: string }) {
  return (
    <div className="waking">
      <Doodle seed={seed} mood="sleepy" size={120} decorative />
      <span className="waking__arrow">→</span>
      <Doodle seed={seed} mood="awake" size={120} decorative />
    </div>
  );
}

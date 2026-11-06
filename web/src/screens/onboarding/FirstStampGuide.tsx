import { phCheck, phCrosshair, phMapTrifold, phStamp, phX } from "@/ui/icons";
import { useEffect, useMemo, useState } from "react";
import { firstStampPlan, type FirstStampStep } from "@/data/firstStamp";
import { useCatalog, usePassport } from "@/data/queries";
import { useI18n } from "@/i18n/context";
import { formatMeters } from "@/lib/distance";
import { readInviter } from "@/lib/invite";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { onDesktopTelegram } from "@/telegram/platform";
import { readFlag, writeFlag } from "@/telegram/storage";
import { Icon } from "@/ui/Icon";
import "./firstStamp.css";

const HIDDEN = "bunna.firstStampGuideHidden";
const ORDER: FirstStampStep[] = ["location", "walk", "checkIn"];

/**
 * Walks someone with an empty passport to their first stamp: share where
 * you are, walk to the café we pick, check in once you're in range. Shown on
 * Explore to every new person, whether a friend's invite brought them or
 * they found the app themselves, until the first stamp lands or they hide it.
 */
export function FirstStampGuide() {
  const { t } = useI18n();
  const { push } = useNavigation();
  const { data: passport } = usePassport();
  const catalog = useCatalog();
  const location = useLocation();
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [inviter, setInviter] = useState<string | null>(null);
  const desktop = onDesktopTelegram();

  useEffect(() => {
    void readFlag(HIDDEN).then((value) => setHidden(value === "1"));
    void readInviter().then(setInviter);
  }, []);

  const plan = useMemo(() => firstStampPlan(catalog.data ?? [], location.fix), [catalog.data, location.fix]);

  if (hidden !== false || !passport || passport.stamped_count > 0 || !catalog.data) return null;

  const current = ORDER.indexOf(plan.step);
  const state = (step: FirstStampStep) => {
    const index = ORDER.indexOf(step);
    return index < current ? "done" : index === current ? "current" : "next";
  };
  const target = plan.target;
  const hide = () => {
    setHidden(true);
    void writeFlag(HIDDEN, "1");
  };
  const blocked = location.status === "denied" || location.status === "unavailable";

  return (
    <section className="card first-stamp" aria-labelledby="first-stamp-title">
      <div className="first-stamp__head">
        <span className="first-stamp__kicker mono">
          <Icon path={phStamp} size={14} />
          {t("firstStamp.kicker")}
        </span>
        <button type="button" className="first-stamp__hide" aria-label={t("firstStamp.hide")} onClick={hide}>
          <Icon path={phX} size={16} />
        </button>
      </div>
      <h2 id="first-stamp-title" className="first-stamp__title">
        {inviter ? t("firstStamp.titleInvited", { handle: inviter }) : t("firstStamp.title")}
      </h2>

      <ol className="first-stamp__steps">
        <Step state={state("location")} number={1} text={t("firstStamp.step1")} />
        <Step
          state={state("walk")}
          number={2}
          text={
            target && plan.step !== "location"
              ? t("firstStamp.step2At", { shop: target.shop.name, distance: formatMeters(target.distance) })
              : t("firstStamp.step2")
          }
        />
        <Step state={state("checkIn")} number={3} text={t("firstStamp.step3")} />
      </ol>

      {plan.step === "location" ? (
        <>
          {desktop ? (
            <p className="first-stamp__note">{t("checkin.needsPhone")}</p>
          ) : blocked ? (
            <p className="first-stamp__note">{t(location.status === "denied" ? "checkin.locationDenied" : "checkin.locationUnavailable")}</p>
          ) : null}
          <div className="first-stamp__actions">
            <button
              type="button"
              className="first-stamp__button first-stamp__button--primary"
              aria-busy={location.status === "locating" || undefined}
              disabled={location.status === "locating"}
              onClick={() => void location.refresh()}
            >
              <Icon path={phCrosshair} size={16} />
              {t("firstStamp.shareLocation")}
            </button>
          </div>
        </>
      ) : plan.step === "walk" ? (
        <>
          {target?.closed ? <p className="first-stamp__note">{t("firstStamp.closedNow")}</p> : null}
          <div className="first-stamp__actions">
            {target ? (
              <button
                type="button"
                className="first-stamp__button first-stamp__button--primary"
                onClick={() => push({ name: "shop", id: target.shop.id })}
              >
                {t("firstStamp.seeCafe", { shop: target.shop.name })}
              </button>
            ) : null}
            <button type="button" className="first-stamp__button" onClick={() => push({ name: "map" })}>
              <Icon path={phMapTrifold} size={16} />
              {t("firstStamp.map")}
            </button>
          </div>
          <p className="first-stamp__note">{t("firstStamp.walkHint")}</p>
        </>
      ) : target ? (
        <>
          <p className="first-stamp__note first-stamp__note--ready">{t("firstStamp.inRange", { shop: target.shop.name })}</p>
          {desktop ? (
            <p className="first-stamp__note">{t("checkin.needsPhone")}</p>
          ) : (
            <div className="first-stamp__actions">
              <button
                type="button"
                className="first-stamp__button first-stamp__button--primary"
                onClick={() => push({ name: "checkin", shopId: target.shop.id })}
              >
                <Icon path={phStamp} size={16} />
                {t("firstStamp.checkIn", { shop: target.shop.name })}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function Step({ state, number, text }: { state: "done" | "current" | "next"; number: number; text: string }) {
  return (
    <li className={`first-stamp__step first-stamp__step--${state}`} aria-current={state === "current" ? "step" : undefined}>
      <span className="first-stamp__marker mono" aria-hidden="true">
        {state === "done" ? <Icon path={phCheck} size={14} /> : number}
      </span>
      <span>{text}</span>
    </li>
  );
}

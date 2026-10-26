import { phCamera, phCoffee, phCoffeeFill, phPlus } from "@/ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import type { RejectionCode } from "@/api/types";
import { candidatesAround, newIdempotencyKey } from "@/data/checkin";
import { useCatalog, useProfile } from "@/data/queries";
import { useStampsByShop } from "@/data/stamps";
import { Seal } from "@/design/seal/Seal";
import { useI18n } from "@/i18n/context";
import { formatMeters } from "@/lib/distance";
import { openLocationSettings } from "@/location/locate";
import { useLocation } from "@/location/LocationProvider";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticError, hapticSelection } from "@/telegram/haptics";
import { onDesktopTelegram } from "@/telegram/platform";
import { AddChip, FilterChip } from "@/ui/Chip";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import { Radar } from "./Radar";
import "./checkin.css";

const DRINKS = ["macchiato", "buna", "spris"] as const;

type Outcome = { kind: "rejected"; code: RejectionCode; shop: string } | { kind: "failed" } | null;

/**
 * Candidate confirm (DESIGN.md §5.3). The idempotency key is made the moment
 * the screen opens, so a retry after a dropped connection can never count
 * twice. Only the tap is needed; drink, note, rating and photo are optional.
 */
export function CheckIn({ shopId }: { shopId?: number }) {
  const { t } = useI18n();
  const { back, replace } = useNavigation();
  const queryClient = useQueryClient();
  const location = useLocation();
  const catalog = useCatalog();
  const stamps = useStampsByShop();
  const { data: profile } = useProfile();
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drink, setDrink] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const desktop = onDesktopTelegram();

  // A position from before this screen opened can't vouch for being here now.
  useEffect(() => {
    if (!desktop) void location.refresh();
  }, [desktop, location.refresh]);

  const fix = location.status === "locating" ? null : location.fix;
  const candidates = useMemo(() => (fix ? candidatesAround(catalog.data ?? [], fix) : []), [fix, catalog.data]);
  const inRange = candidates.filter((c) => c.inRange);

  useEffect(() => {
    if (inRange.length === 0) return;
    setSelectedId((current) => {
      if (current && inRange.some((c) => c.shop.id === current)) return current;
      return inRange.find((c) => c.shop.id === shopId)?.shop.id ?? inRange[0].shop.id;
    });
  }, [inRange, shopId]);

  const selected = inRange.find((c) => c.shop.id === selectedId) ?? null;
  const selectedStamp = selected ? stamps.get(selected.shop.id) : undefined;

  async function submit() {
    if (!selected || !fix || submitting) return;
    setSubmitting(true);
    setOutcome(null);
    const wasAwake = profile?.had_cup_today ?? false;
    try {
      const { data } = await api.checkIn(
        {
          shop_id: selected.shop.id,
          idempotency_key: idempotencyKey,
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy_meters: fix.accuracyMeters,
          drink: drink ? t(`checkin.drink.${drink as (typeof DRINKS)[number]}`) : undefined,
          rating: rating ?? undefined,
          note: note.trim() || undefined,
        },
        photo,
      );
      for (const key of [["passport"], ["profile"], ["checkIns"], ["shop", selected.shop.id], ["leaderboard"], ["stats", "me"]]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      replace({ name: "ceremony", checkIn: data, wasAwake });
    } catch (error) {
      hapticError();
      const code = error instanceof ApiRequestError ? error.rejectionCode : null;
      // The server keeps a rejected visit under its key, so the next attempt
      // needs a fresh one. A dropped connection keeps the key: that retry may
      // be the same visit landing twice.
      if (code) setIdempotencyKey(newIdempotencyKey());
      setOutcome(code ? { kind: "rejected", code, shop: selected.shop.name } : { kind: "failed" });
      setSubmitting(false);
    }
  }

  const ctaText = selected
    ? t(selectedStamp ? "checkin.cupAt" : "checkin.stampAt", { shop: selected.shop.name })
    : t("checkin.locate");
  const titleFirst =
    inRange.length === 0
      ? t("checkin.titleNone")
      : inRange.length === 1
        ? t("checkin.titleOne")
        : t("checkin.titleMany", { count: inRange.length });

  let body: ReactNode;
  if (desktop) {
    body = <p className="notice">{t("checkin.needsPhone")}</p>;
  } else if (!fix) {
    body = (
      <>
        <Headline first={t("checkin.locatingTitle")} second={t("checkin.locatingTitleB")} size={32} />
        {location.status === "locating" || location.status === "idle" ? (
          <div className="radar card radar--locating" aria-busy="true">
            <span className="radar__pulse" />
          </div>
        ) : (
          <div className="notice notice--caution">
            {t(location.status === "denied" ? "checkin.locationDenied" : "checkin.locationUnavailable")}
            {location.status === "denied" ? (
              <button type="button" className="link-button" onClick={() => openLocationSettings()}>
                {t("checkin.openSettings")}
              </button>
            ) : null}
          </div>
        )}
      </>
    );
  } else if (outcome?.kind === "rejected") {
    body = (
      <>
        <Headline first={t("checkin.rejectedTitle")} second={t("checkin.rejectedTitleB")} size={32} />
        <div className="notice notice--caution">
          {t(`checkin.error.${outcome.code}`, { shop: outcome.shop })}
          {outcome.code === "cooldown" ? <><br />{t("checkin.cooldownHint")}</> : null}
          {outcome.code === "too_far" ? <><br />{t("checkin.error.too_far_action")}</> : null}
        </div>
        <Radar fix={fix} candidates={candidates} selectedId={selectedId} />
      </>
    );
  } else {
    body = (
      <>
        <Headline first={titleFirst} second={t("checkin.titleB")} size={32} />
        <Radar fix={fix} candidates={candidates} selectedId={selectedId} />

        {inRange.length === 0 ? (
          <p className="notice">
            {t("checkin.noneNearby")}
            <br />
            {t("checkin.noneNearbyHint")}
          </p>
        ) : (
          <div className="candidates" role="radiogroup" aria-label={t("checkin.pickShop")}>
            {inRange.map(({ shop, distance }) => {
              const stamp = stamps.get(shop.id);
              const chosen = shop.id === selectedId;
              return (
                <button
                  key={shop.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  className="candidate"
                  onClick={() => {
                    hapticSelection();
                    setSelectedId(shop.id);
                  }}
                >
                  <Seal name={shop.name} level={stamp?.level ?? null} size={46} decorative />
                  <span className="candidate__text">
                    <span className="candidate__name">{shop.name}</span>
                    <span className="candidate__meta">
                      {stamp
                        ? t("checkin.cupsSoFar", { distance: formatMeters(distance), count: stamp.check_ins_count })
                        : t("checkin.firstStampHere", { distance: formatMeters(distance) })}
                    </span>
                  </span>
                  <span className={stamp ? "candidate__badge candidate__badge--cup" : "candidate__badge"}>
                    {t(stamp ? "checkin.plusCup" : "checkin.newStamp")}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {inRange.length > 0 ? (
          <>
            <div className="extras">
              <span className="extras__prompt">
                {t("checkin.drinkPrompt")} <span className="extras__optional">{t("common.optional")}</span>
              </span>
              <div className="chip-wrap" role="group" aria-label={t("checkin.drink")}>
                {DRINKS.map((key) => (
                  <FilterChip key={key} selected={drink === key} onClick={() => setDrink((d) => (d === key ? null : key))}>
                    {t(`checkin.drink.${key}`)}
                  </FilterChip>
                ))}
                <AddChip pressed={noteOpen} onClick={() => setNoteOpen((open) => !open)} icon={<Icon path={phPlus} size={16} />}>
                  {t("checkin.addNote")}
                </AddChip>
              </div>
              {noteOpen ? (
                <label className="note">
                  <span className="visually-hidden">{t("checkin.note")}</span>
                  <textarea
                    value={note}
                    maxLength={280}
                    rows={2}
                    placeholder={t("checkin.notePlaceholder")}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
              ) : null}
            </div>

            <div className="rating">
              <span className="rating__label">{t("checkin.rate")}</span>
              <div className="rating__cups" role="group" aria-label={t("checkin.rateGroup")}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={rating !== null && n <= rating ? "rating__cup rating__cup--on" : "rating__cup"}
                    aria-label={t("checkin.rateCups", { count: n })}
                    aria-pressed={rating === n}
                    onClick={() => setRating((r) => (r === n ? null : n))}
                  >
                    <Icon path={rating !== null && n <= rating ? phCoffeeFill : phCoffee} size={22} />
                  </button>
                ))}
              </div>
              <span className="rating__divider" aria-hidden="true" />
              <button
                type="button"
                className={photo ? "rating__photo rating__photo--on" : "rating__photo"}
                aria-label={photo ? t("checkin.photoAdded") : t("shop.addPhoto")}
                onClick={() => photoInput.current?.click()}
              >
                <Icon path={phCamera} size={21} />
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                hidden
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
            </div>
          </>
        ) : null}

        {outcome?.kind === "failed" ? <p className="notice notice--caution">{t("checkin.error.generic")}</p> : null}
      </>
    );
  }

  const ready = !desktop && fix && selected && outcome?.kind !== "rejected";

  return (
    <main className="screen checkin">
      <BackControl onBack={back} label={t("common.back")} />
      {body}
      {desktop ? null : ready ? (
        <PrimaryAction text={ctaText} onClick={() => void submit()} loading={submitting} />
      ) : fix || location.status !== "locating" ? (
        <PrimaryAction
          text={outcome?.kind === "rejected" ? t("checkin.retry") : t("checkin.locate")}
          onClick={() => {
            setOutcome(null);
            void location.refresh();
          }}
        />
      ) : (
        <PrimaryAction text={t("checkin.locating")} onClick={() => undefined} loading />
      )}
    </main>
  );
}

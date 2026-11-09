import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Neighborhood, OpaqueId, PriceBand, Weekday } from "@/api/types";
import { ApiRequestError } from "@/api/errors";
import { useI18n, type Key } from "@/i18n/context";
import type { Coordinate } from "@/lib/distance";
import { PRICE_LABEL_KEYS } from "@/lib/price";
import { useLocation } from "@/location/LocationProvider";
import { AddChip, FilterChip } from "@/ui/Chip";
import { Icon } from "@/ui/Icon";
import { phCamera, phCrosshair, phPlus, phX } from "@/ui/icons";
import { hoursValid, MAX_PIN_ACCURACY_METERS, PRICE_BANDS, WEEK, type HoursForm } from "./form";

export function TextField({
  label,
  hint,
  value,
  onChange,
  lang,
  maxLength = 120,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  lang?: string;
  maxLength?: number;
}) {
  return (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      <input type="text" value={value} lang={lang} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
      {hint ? <span className="form-field__hint">{hint}</span> : null}
    </label>
  );
}

export function AreaField({
  areas,
  value,
  onChange,
}: {
  areas: Neighborhood[];
  value: OpaqueId | null;
  onChange: (id: OpaqueId) => void;
}) {
  const { t, language } = useI18n();
  return (
    <label className="form-field">
      <span className="form-field__label">{t("contribute.area")}</span>
      <select value={value ?? ""} onChange={(event) => onChange(Number(event.target.value))}>
        {value === null ? <option value="">{t("contribute.areaPick")}</option> : null}
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {language === "am" && area.name_am ? area.name_am : area.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PriceField({ value, onChange }: { value: PriceBand | null; onChange: (band: PriceBand | null) => void }) {
  const { t } = useI18n();
  return (
    <fieldset className="form-field">
      <legend className="form-field__label">{t("contribute.price")}</legend>
      <div className="chip-wrap">
        {PRICE_BANDS.map((band) => (
          <FilterChip key={band} selected={value === band} onClick={() => onChange(value === band ? null : band)}>
            {t(PRICE_LABEL_KEYS[band])}
          </FilterChip>
        ))}
      </div>
    </fieldset>
  );
}

export function HoursField({ value, onChange }: { value: HoursForm; onChange: (next: HoursForm) => void }) {
  const { t } = useI18n();
  if (!value.known) {
    return (
      <fieldset className="form-field">
        <legend className="form-field__label">{t("contribute.hours")}</legend>
        <div className="chip-wrap">
          <AddChip icon={<Icon path={phPlus} size={16} />} onClick={() => onChange({ ...value, known: true })}>
            {t("contribute.hoursAdd")}
          </AddChip>
        </div>
      </fieldset>
    );
  }
  const toggle = (day: Weekday) =>
    onChange({ ...value, days: value.days.includes(day) ? value.days.filter((d) => d !== day) : [...value.days, day] });
  return (
    <fieldset className="form-field">
      <legend className="form-field__label">{t("contribute.hours")}</legend>
      <div className="hours-times">
        <label>
          <span>{t("contribute.opens")}</span>
          <input type="time" value={value.opens} onChange={(event) => onChange({ ...value, opens: event.target.value })} />
        </label>
        <label>
          <span>{t("contribute.closes")}</span>
          <input type="time" value={value.closes} onChange={(event) => onChange({ ...value, closes: event.target.value })} />
        </label>
      </div>
      <div className="hours-days" role="group" aria-label={t("contribute.days")}>
        {WEEK.map((day) => (
          <button key={day} type="button" aria-pressed={value.days.includes(day)} aria-label={t(`day.${day}` as Key)} onClick={() => toggle(day)}>
            {t(`day.${day}.short` as Key)}
          </button>
        ))}
      </div>
      {value.varied ? <span className="form-field__hint">{t("contribute.hoursVaried")}</span> : null}
      {!hoursValid(value) ? <span className="form-field__hint form-field__hint--caution">{t("contribute.hoursInvalid")}</span> : null}
      <button type="button" className="link-button form-field__aside" onClick={() => onChange({ ...value, known: false })}>
        {t("contribute.hoursUnsure")}
      </button>
    </fieldset>
  );
}

type PinState = "idle" | "locating" | "vague" | "failed" | "set";

/**
 * "The café is here": the person's own position becomes the pin. Nothing is
 * typed and nothing is dragged, which is what keeps the map honest.
 */
export function PinField({
  label,
  idle,
  value,
  onChange,
}: {
  label: string;
  idle: string;
  value: Coordinate | null;
  onChange: (pin: Coordinate | null) => void;
}) {
  const { t } = useI18n();
  const { refresh } = useLocation();
  const [state, setState] = useState<PinState>(value ? "set" : "idle");
  const [accuracy, setAccuracy] = useState<number | null>(null);

  async function locate() {
    setState("locating");
    const fix = await refresh();
    if (!fix) {
      setState("failed");
      return;
    }
    setAccuracy(Math.round(fix.accuracyMeters));
    if (fix.accuracyMeters > MAX_PIN_ACCURACY_METERS) {
      setState("vague");
      onChange(null);
      return;
    }
    setState("set");
    onChange({ latitude: fix.latitude, longitude: fix.longitude });
  }

  const status: Record<PinState, string> = {
    idle,
    locating: t("contribute.pinLocating"),
    vague: t("contribute.pinVague", { meters: accuracy ?? 0 }),
    failed: t("contribute.pinFailed"),
    set: t("contribute.pinSet", { meters: accuracy ?? 0 }),
  };

  return (
    <fieldset className="form-field">
      <legend className="form-field__label">{label}</legend>
      <div className={`pin-field pin-field--${state}`}>
        <span className="pin-field__status" role="status">
          {status[state]}
        </span>
        <button type="button" className="pin-field__button" onClick={() => void locate()} aria-busy={state === "locating" || undefined}>
          <Icon path={phCrosshair} size={18} />
          {state === "set" ? t("contribute.pinAgain") : t("contribute.pinHere")}
        </button>
      </div>
    </fieldset>
  );
}

/** The kinds of picture the server accepts, and how big. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

/**
 * An optional picture of the café. Opens the camera on a phone, shows what
 * was picked, and refuses a file the server would turn away anyway.
 */
export function PhotoField({ value, onChange }: { value: File | null; onChange: (file: File | null) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<"type" | "size" | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function pick(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setProblem("type");
    if (file.size > PHOTO_MAX_BYTES) return setProblem("size");
    setProblem(null);
    onChange(file);
  }

  return (
    <fieldset className="form-field">
      <legend className="form-field__label">
        {t("contribute.photo")} <span className="form-field__optional">{t("common.optional")}</span>
      </legend>
      {value && preview ? (
        <div className="photo-field photo-field--set">
          <img className="photo-field__preview" src={preview} alt={t("contribute.photoPicked")} />
          <div className="photo-field__actions">
            <button type="button" className="pin-field__button" onClick={() => input.current?.click()}>
              <Icon path={phCamera} size={18} />
              {t("contribute.photoChange")}
            </button>
            <button type="button" className="pin-field__button" onClick={() => onChange(null)}>
              <Icon path={phX} size={18} />
              {t("contribute.photoRemove")}
            </button>
          </div>
        </div>
      ) : (
        <div className="photo-field">
          <span className="pin-field__status">{t("contribute.photoHint")}</span>
          <button type="button" className="pin-field__button" onClick={() => input.current?.click()}>
            <Icon path={phCamera} size={18} />
            {t("contribute.photoAdd")}
          </button>
        </div>
      )}
      {problem ? (
        <span className="form-field__hint form-field__hint--caution" role="alert">
          {t(problem === "type" ? "contribute.photoWrongType" : "contribute.photoTooBig")}
        </span>
      ) : null}
      <input
        ref={input}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        capture="environment"
        hidden
        onChange={(event) => pick(event.target.files?.[0])}
      />
    </fieldset>
  );
}

/** What went wrong, in words someone standing outside a café can act on. */
export function sendFailure(error: unknown): Key {
  if (error instanceof ApiRequestError) {
    if (error.status === 429) return "contribute.limit";
    if (error.status === 422 || error.status === 400) return "contribute.invalid";
    if (error.status === 401) return "contribute.signedOut";
  }
  return "contribute.failed";
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p className="notice notice--caution" role="alert">
      {children}
    </p>
  );
}

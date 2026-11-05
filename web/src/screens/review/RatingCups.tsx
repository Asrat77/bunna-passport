import { phCoffee, phCoffeeFill } from "@/ui/icons";
import { useI18n } from "@/i18n/context";
import { hapticSelection } from "@/telegram/haptics";
import { Icon } from "@/ui/Icon";

/** Five cups to tap, 1 to 5. Tapping the current score clears it when `clearable`. */
export function RatingCups({
  value,
  onChange,
  size = 30,
  clearable = false,
  disabled = false,
}: {
  value: number | null;
  onChange: (rating: number | null) => void;
  size?: number;
  clearable?: boolean;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="cups" role="group" aria-label={t("checkin.rateGroup")}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            className={on ? "cups__cup cups__cup--on" : "cups__cup"}
            aria-label={t("checkin.rateCups", { count: n })}
            aria-pressed={value === n}
            disabled={disabled}
            onClick={() => {
              hapticSelection();
              onChange(clearable && value === n ? null : n);
            }}
          >
            <Icon path={on ? phCoffeeFill : phCoffee} size={size} />
          </button>
        );
      })}
    </div>
  );
}

/** A read-only score as filled and empty cups. */
export function CupScore({ rating, size = 14 }: { rating: number; size?: number }) {
  const { t } = useI18n();
  return (
    <span className="cup-score" role="img" aria-label={t("checkin.rateCups", { count: rating })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "cup-score__on" : "cup-score__off"}>
          <Icon path={n <= rating ? phCoffeeFill : phCoffee} size={size} />
        </span>
      ))}
    </span>
  );
}

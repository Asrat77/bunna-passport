import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { api } from "@/api/client";
import type { OpaqueId } from "@/api/types";
import { Chip } from "@/design/components/Chip";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

const DRINKS = ["macchiato", "buna", "espresso", "spris", "latte"];

/**
 * Asks how the visit was, once the stamp is already earned.
 *
 * The question used to sit before submitting, while someone was standing in a
 * queue wondering whether the GPS would accept them, and nobody answered it.
 * Here it costs nothing: the stamp is won either way, so this must read as a
 * postscript and never as a toll. Scrolling past it is a complete answer.
 */
export function SayingPrompt({ checkInId }: { checkInId: OpaqueId }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [drink, setDrink] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Fire and forget. The stamp does not depend on this landing, so a failure
  // must never interrupt someone leaving the screen.
  const say = (next: { rating?: number; note?: string; drink?: string }) => {
    setSent(true);
    void api
      .updateCheckIn(checkInId, next)
      .catch(() => api.updateCheckIn(checkInId, next).catch(() => {}));
  };

  const pickRating = (value: number) => {
    setRating(value);
    say({ rating: value, note: note.trim() || undefined, drink: drink ?? undefined });
  };

  const pickDrink = (value: string) => {
    const next = drink === value ? null : value;
    setDrink(next);
    say({ rating: rating ?? undefined, note: note.trim() || undefined, drink: next ?? undefined });
  };

  return (
    <View
      style={{
        width: "100%",
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text role="label" color={sent ? "primary" : "inkMuted"}>
        {sent ? t("saying.thanks") : t("saying.howWasIt")}
      </Text>

      <View style={{ flexDirection: "row", gap: space.xs }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => pickRating(star)}
            accessibilityRole="button"
            accessibilityLabel={t("saying.rateStars", { count: star })}
            hitSlop={space.xs}
            style={{ padding: space.xs }}
          >
            <MaterialCommunityIcons
              name={rating && star <= rating ? "star" : "star-outline"}
              size={30}
              color={rating && star <= rating ? colors.accent : colors.borderStrong}
            />
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {DRINKS.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={drink === option}
            onPress={() => pickDrink(option)}
          />
        ))}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        onBlur={() =>
          note.trim() &&
          say({ rating: rating ?? undefined, note: note.trim(), drink: drink ?? undefined })
        }
        placeholder={t("saying.notePlaceholder")}
        placeholderTextColor={colors.inkFaint}
        multiline
        maxLength={280}
        style={{
          minHeight: touchTarget,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceSunken,
          color: colors.ink,
          textAlignVertical: "top",
        }}
      />
    </View>
  );
}

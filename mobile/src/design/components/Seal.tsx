import { View } from "react-native";
import { useI18n } from "@/i18n/context";
import { useTheme } from "../theme";
import { fontFor, isEthiopic } from "../typography";
import { Text } from "./Text";

export type SealSize = "pin" | "sm" | "md" | "lg";

const DIMENSIONS: Record<SealSize, { size: number; initials: number; ring: number }> = {
  pin: { size: 28, initials: 11, ring: 2 },
  sm: { size: 44, initials: 15, ring: 2 },
  md: { size: 72, initials: 24, ring: 2.5 },
  lg: { size: 132, initials: 42, ring: 3 },
};

type Props = {
  name: string;
  nameAm: string;
  earned: boolean;
  size?: SealSize;
};

/**
 * Derives up to two display characters. Ethiopic syllables carry a whole
 * consonant-vowel pair each, so one fidel reads as much as two Latin letters —
 * take one for Amharic, two for Latin.
 */
function initialsFor(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  if (isEthiopic(label)) {
    return words.length > 1
      ? `${[...words[0]][0]}${[...words[1]][0]}`
      : [...words[0]].slice(0, 2).join("");
  }

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

/**
 * The stamp seal (docs/DESIGN.md §2.1). Earned seals are filled ink; unearned
 * ones are dashed outlines — visible absence is the completion hook, so the
 * unstamped variant is a first-class state, not a placeholder.
 */
export function Seal({ name, nameAm, earned, size = "md" }: Props) {
  const { colors } = useTheme();
  const { language } = useI18n();
  const dim = DIMENSIONS[size];

  const label = language === "am" && isEthiopic(nameAm) ? nameAm : name;
  const initials = initialsFor(label);
  const innerInset = size === "pin" ? 3 : 5;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        earned ? `${name} — stamp earned` : `${name} — no stamp yet`
      }
      style={{
        width: dim.size,
        height: dim.size,
        borderRadius: dim.size / 2,
        borderWidth: dim.ring,
        borderColor: earned ? colors.primary : colors.borderStrong,
        borderStyle: earned ? "solid" : "dashed",
        backgroundColor: earned ? colors.primary : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Inner ring — the second concentric line that makes it read as a stamp. */}
      <View
        style={{
          position: "absolute",
          top: innerInset,
          left: innerInset,
          right: innerInset,
          bottom: innerInset,
          borderRadius: dim.size / 2,
          borderWidth: 1,
          borderColor: earned ? colors.onPrimary : colors.borderStrong,
          opacity: earned ? 0.45 : 0.7,
        }}
      />
      <Text
        role="label"
        color={earned ? "onPrimary" : "inkFaint"}
        style={{
          fontFamily: fontFor("display", initials, "bold"),
          fontSize: dim.initials,
          lineHeight: dim.initials * 1.15,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

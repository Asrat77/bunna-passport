import { View } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { useI18n } from "@/i18n/context";
import { useTheme } from "../theme";
import { fontFor, isEthiopic } from "../typography";

export type SealSize = "pin" | "sm" | "md" | "lg";

const DIMENSIONS: Record<SealSize, { size: number; initials: number; ring: number }> = {
  pin: { size: 34, initials: 10, ring: 2 },
  sm: { size: 52, initials: 15, ring: 2 },
  md: { size: 84, initials: 23, ring: 2.5 },
  lg: { size: 152, initials: 40, ring: 3 },
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
  const center = dim.size / 2;
  const outer = center - dim.ring;
  const inner = outer - (size === "pin" ? 5 : 8);
  const rotation = size === "pin" ? 0 : ((name.length * 7) % 5) - 2;
  const stampInk = earned ? colors.primary : colors.borderStrong;
  const stampPaper = earned ? colors.primary : colors.surfaceRaised;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        earned ? `${name} — stamp earned` : `${name} — no stamp yet`
      }
      style={{ width: dim.size, height: dim.size, transform: [{ rotate: `${rotation}deg` }] }}
    >
      <Svg width={dim.size} height={dim.size} viewBox={`0 0 ${dim.size} ${dim.size}`}>
        <Circle cx={center} cy={center} r={outer} fill={stampPaper} />
        <Circle
          cx={center}
          cy={center}
          r={outer}
          fill="none"
          stroke={stampInk}
          strokeWidth={dim.ring}
          strokeDasharray={earned ? undefined : size === "pin" ? "2 3" : "5 4"}
          strokeLinecap="round"
        />
        <Circle
          cx={center}
          cy={center}
          r={inner}
          fill="none"
          stroke={earned ? colors.onPrimary : stampInk}
          strokeWidth={size === "pin" ? 1 : 1.5}
          opacity={earned ? 0.7 : 0.75}
          strokeDasharray={earned ? "1 4" : undefined}
          strokeLinecap="round"
        />

        {size !== "pin" ? (
          <G opacity={earned ? 0.88 : 0.72}>
            <Path
              d={`M${center - 11} ${center - 14}c5-5 17-5 22 0-7-2-15-2-22 0Z`}
              fill={earned ? colors.onPrimary : stampInk}
            />
            <Path
              d={`M${center - 9} ${center + 15}c5 4 13 4 18 0-6 2-12 2-18 0Z`}
              fill={earned ? colors.onPrimary : stampInk}
            />
          </G>
        ) : null}

        <SvgText
          x={center}
          y={center + dim.initials * 0.36}
          fill={earned ? colors.onPrimary : colors.inkFaint}
          fontFamily={fontFor("display", initials, "bold")}
          fontSize={dim.initials}
          fontWeight="700"
          textAnchor="middle"
        >
          {initials}
        </SvgText>
      </Svg>
    </View>
  );
}

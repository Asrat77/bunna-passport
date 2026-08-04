import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme";
import { Text } from "./Text";

type Props = {
  value: number;
  total: number;
  size?: number;
  label?: string;
};

export function ProgressRing({ value, total, size = 112, label }: Props) {
  const { colors } = useTheme();
  const stroke = Math.max(7, size * 0.075);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, value / total) : 0;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text role="numeral" align="center">
        {`${Math.round(progress * 100)}%`}
      </Text>
      {label ? (
        <Text role="caption" color="inkMuted" align="center" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

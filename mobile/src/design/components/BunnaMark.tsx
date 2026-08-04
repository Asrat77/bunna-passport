import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme";

type Props = {
  size?: number;
  inverted?: boolean;
};

/** A compact jebena-and-bean mark, drawn as vectors so it stays crisp. */
export function BunnaMark({ size = 96, inverted = false }: Props) {
  const { colors } = useTheme();
  const ink = inverted ? colors.onPrimary : colors.primary;
  const paper = inverted ? colors.primary : colors.accentSoft;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Bunna Passport"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="47" fill={paper} />
        <Circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke={ink}
          strokeWidth="2"
          strokeDasharray="1 6"
          strokeLinecap="round"
        />

        {/* Jebena body, neck and long pouring spout. */}
        <Path
          d="M39 34h18l-2 15c9 4 14 12 14 21 0 9-8 15-20 15S29 79 29 70c0-9 5-17 14-21l-4-15Z"
          fill={ink}
        />
        <Path
          d="M56 48c11-4 18-11 26-20 2-2 6 1 4 4-8 13-15 22-26 28Z"
          fill={ink}
        />
        <Path d="M37 30c2-8 5-12 11-16 1 6 0 11-3 16Z" fill={ink} />

        {/* Coffee bean cutout. */}
        <Path
          d="M42 63c0-7 5-12 11-12 7 0 12 5 12 12s-5 12-12 12c-6 0-11-5-11-12Z"
          fill={paper}
        />
        <Path d="M56 52c-5 6-6 14-2 22" fill="none" stroke={ink} strokeWidth="2.4" />
      </Svg>
    </View>
  );
}

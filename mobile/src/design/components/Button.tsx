import {
  ActivityIndicator,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme";
import { radius, space, touchTarget } from "../tokens";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "quiet";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  busy?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  fullWidth = true,
  accessibilityHint,
  style,
}: Props) {
  const { colors } = useTheme();
  const inactive = disabled || busy;

  const background =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.surfaceRaised
        : "transparent";
  const foreground = variant === "primary" ? "onPrimary" : "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        {
          minHeight: touchTarget,
          paddingHorizontal: space.xl,
          paddingVertical: space.md + 2,
          borderRadius: variant === "quiet" ? radius.full : radius.md,
          borderCurve: "continuous",
          backgroundColor: background,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: variant === "secondary" ? colors.borderStrong : colors.border,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: fullWidth ? "stretch" : "flex-start",
          opacity: inactive ? 0.55 : pressed ? 0.9 : 1,
          transform: [{ translateY: pressed ? 1 : 0 }],
          boxShadow:
            variant === "primary" && !inactive
              ? `0 8px 18px ${colors.shadow}`
              : undefined,
        },
        style,
      ]}
    >
      {/* The label stays mounted while busy so the button keeps its width. */}
      <View style={{ opacity: busy ? 0 : 1 }}>
        <Text role="bodyStrong" color={foreground} weight="bold">
          {label}
        </Text>
      </View>
      {busy ? (
        <View style={{ position: "absolute" }}>
          <ActivityIndicator color={colors[foreground]} />
        </View>
      ) : null}
    </Pressable>
  );
}

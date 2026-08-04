import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { radius, space, touchTarget } from "../tokens";
import { Text } from "./Text";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected = false, onPress, icon, style }: Props) {
  const { colors } = useTheme();

  const content = (
    <>
      {icon}
      <Text
        role="label"
        weight={selected ? "bold" : "medium"}
        color={selected ? "onPrimary" : "ink"}
      >
        {label}
      </Text>
    </>
  );

  const shape: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: touchTarget,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    borderCurve: "continuous",
    backgroundColor: selected ? colors.primary : colors.surfaceRaised,
    borderWidth: 1,
    borderColor: selected ? colors.primary : colors.border,
  };

  if (!onPress) return <View style={[shape, style]}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [shape, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      {content}
    </Pressable>
  );
}

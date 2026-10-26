import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";

type Props = {
  label: string;
  /** Receives the colour the icon should draw in. */
  icon: (color: string) => ReactNode;
  selected?: boolean;
  onPress?: () => void;
};

/** One of the four equal Explore pills (docs/DESIGN.md §2.2.1). */
export function QuickAction({ label, icon, selected = false, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        height: 44,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 6,
        backgroundColor: selected ? colors.surfaceSunken : colors.surfaceRaised,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon(selected ? colors.primary : colors.ink)}
      <Text
        role="label"
        weight="medium"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ fontSize: 13, flexShrink: 1 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

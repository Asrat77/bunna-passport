import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme";
import { radius, space } from "../tokens";

export function SkeletonBlock({
  width = "100%",
  height,
  cornerRadius = radius.sm,
}: {
  width?: DimensionValue;
  height: number;
  cornerRadius?: number;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(0.9, { duration: 850 }), -1, true));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: cornerRadius,
          borderCurve: "continuous",
          backgroundColor: colors.surfaceSunken,
        },
        style,
      ]}
    />
  );
}

export function ShopCardSkeleton() {
  return (
    <View style={{ minHeight: 84, flexDirection: "row", alignItems: "center", gap: space.md }}>
      <SkeletonBlock width={52} height={52} cornerRadius={26} />
      <View style={{ flex: 1, gap: space.sm }}>
        <SkeletonBlock width="68%" height={18} />
        <SkeletonBlock width="88%" height={12} />
      </View>
    </View>
  );
}

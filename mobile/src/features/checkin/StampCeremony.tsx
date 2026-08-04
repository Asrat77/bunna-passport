import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/design/components/Button";
import { ProgressRing } from "@/design/components/ProgressRing";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { motion, radius, space } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

type Props = {
  name: string;
  nameAm: string;
  progress: { stamped: number; total: number; area: string } | null;
  onDone: () => void;
};

/** The signature ink-press moment, kept entirely on transform and opacity. */
export function StampCeremony({ name, nameAm, progress, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const entrance = useSharedValue(reduceMotion ? 1 : 0);
  const copy = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    entrance.set(
      withTiming(0.72, { duration: motion.ceremony * 0.56, easing: Easing.out(Easing.cubic) }, () => {
        entrance.set(withSpring(1, { damping: 11, stiffness: 220, mass: 0.7 }));
      }),
    );
    copy.set(withDelay(420, withTiming(1, { duration: motion.transition })));

    const impact = setTimeout(
      () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      motion.ceremony * 0.42,
    );
    return () => clearTimeout(impact);
  }, [copy, entrance, reduceMotion]);

  const sealStyle = useAnimatedStyle(() => {
    const value = entrance.get();
    return {
      opacity: interpolate(value, [0, 0.18, 1], [0, 1, 1]),
      transform: [
        { scale: interpolate(value, [0, 0.72, 1], [1.65, 0.9, 1]) },
        { rotate: `${interpolate(value, [0, 1], [-9, -2])}deg` },
      ],
    };
  });

  const inkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.get(), [0, 0.7, 1], [0, 0.34, 0.16]),
    transform: [{ scale: interpolate(entrance.get(), [0, 0.7, 1], [0.45, 1.08, 1]) }],
  }));

  const copyStyle = useAnimatedStyle(() => ({
    opacity: copy.get(),
    transform: [{ translateY: interpolate(copy.get(), [0, 1], [14, 0]) }],
  }));

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl }}>
      <View style={{ width: 230, height: 230, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 214,
              height: 214,
              borderRadius: 107,
              backgroundColor: colors.primarySoft,
            },
            inkStyle,
          ]}
        />
        <View
          style={{
            position: "absolute",
            width: 198,
            height: 198,
            borderRadius: 99,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.primary,
            opacity: 0.34,
          }}
        />
        <Animated.View style={sealStyle}>
          <Seal name={name} nameAm={nameAm} earned size="lg" />
        </Animated.View>
      </View>

      <Animated.View style={[{ width: "100%", alignItems: "center", gap: space.md }, copyStyle]}>
        <Text role="display" align="center">
          {t("checkin.stampEarned")}
        </Text>
        <Text role="heading" color="inkMuted" align="center">
          {name}
        </Text>

        {progress ? (
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              gap: space.lg,
              marginTop: space.sm,
              padding: space.lg,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <ProgressRing value={progress.stamped} total={progress.total} size={78} />
            <Text role="label" color="inkMuted" style={{ flex: 1 }}>
              {t("checkin.neighborhoodProgress", {
                stamped: progress.stamped,
                total: progress.total,
                area: progress.area,
              })}
            </Text>
          </View>
        ) : null}

        <Button label={t("checkin.done")} onPress={onDone} style={{ marginTop: space.md }} />
      </Animated.View>
    </View>
  );
}

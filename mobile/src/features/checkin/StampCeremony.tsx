import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { Button } from "@/design/components/Button";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { motion, space } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

type Props = {
  name: string;
  nameAm: string;
  /** Neighbourhood completion, shown as the "13 of 47 in Bole" line. */
  progress: { stamped: number; total: number; area: string } | null;
  onDone: () => void;
};

/**
 * The signature moment (docs/DESIGN.md §6.2): an ink-press that overshoots,
 * settles, and lands with a single strong haptic. Replaced by a static reveal
 * when the OS reports reduced motion.
 */
export function StampCeremony({ name, nameAm, progress, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.micro,
        useNativeDriver: true,
      }),
      Animated.sequence([
        // Press down past the resting size, then settle — the "thunk".
        Animated.timing(scale, {
          toValue: 1.12,
          duration: motion.ceremony * 0.45,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const impact = setTimeout(
      () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      motion.ceremony * 0.4,
    );
    return () => clearTimeout(impact);
  }, [reduceMotion, scale, opacity]);

  if (reduceMotion === null) return null;

  return (
    <View style={{ alignItems: "center", padding: space.xl, gap: space.lg }}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Seal name={name} nameAm={nameAm} earned size="lg" />
      </Animated.View>

      <Text role="title" align="center">
        {t("checkin.stampEarned")}
      </Text>
      <Text role="heading" color="inkMuted" align="center">
        {name}
      </Text>

      {progress ? (
        <View style={{ alignItems: "center", gap: space.sm, width: "100%" }}>
          <Text role="label" color="inkMuted">
            {t("checkin.neighborhoodProgress", {
              stamped: progress.stamped,
              total: progress.total,
              area: progress.area,
            })}
          </Text>
          {/* Completion ring, flattened to a bar at this width */}
          <View
            style={{
              height: 6,
              width: "70%",
              borderRadius: 3,
              backgroundColor: colors.surfaceSunken,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress.total > 0 ? (progress.stamped / progress.total) * 100 : 0}%`,
                backgroundColor: colors.accent,
              }}
            />
          </View>
        </View>
      ) : null}

      <Button label={t("checkin.done")} onPress={onDone} style={{ marginTop: space.md }} />
    </View>
  );
}

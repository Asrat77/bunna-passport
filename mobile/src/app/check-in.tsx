import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RejectionCode } from "@/api/types";
import { useAuth } from "@/auth/context";
import { BilingualName } from "@/design/components/BilingualName";
import { BunnaMark } from "@/design/components/BunnaMark";
import { Button } from "@/design/components/Button";
import { Chip } from "@/design/components/Chip";
import { EmptyState } from "@/design/components/EmptyState";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { neighborhoodProgress, type CachedShop } from "@/db/shops";
import { StampCeremony } from "@/features/checkin/StampCeremony";
import { SayingPrompt } from "@/features/checkin/SayingPrompt";
import { useCheckIn } from "@/features/checkin/useCheckIn";
import { useI18n } from "@/i18n/context";
import { formatDistance } from "@/location/distance";
import { ACCURACY_LIMIT_METERS, hasPreciseLocation, type Fix } from "@/location/useLocation";

const DRINKS = ["macchiato", "buna", "espresso", "spris", "latte"];

const REJECTION_STRINGS: Record<RejectionCode, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  weak_gps: "checkin.error.weak_gps",
  too_far: "checkin.error.too_far",
  cooldown: "checkin.error.cooldown",
  daily_limit: "checkin.error.daily_limit",
};

function RadarArt({ submitting = false }: { submitting?: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    turn.set(withRepeat(withTiming(1, { duration: 1_800, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(turn);
  }, [reduceMotion, turn]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get() * 360}deg` }],
  }));

  return (
    <View style={{ width: 210, height: 210, alignItems: "center", justifyContent: "center" }}>
      {[190, 138, 84].map((size) => (
        <View
          key={size}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderStyle: size === 190 ? "dashed" : "solid",
            borderColor: colors.primary,
            opacity: size === 190 ? 0.4 : 0.18,
          }}
        />
      ))}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 178,
            height: 178,
            alignItems: "center",
          },
          sweepStyle,
        ]}
      >
        <View
          style={{
            width: 2,
            height: 82,
            borderRadius: 1,
            backgroundColor: colors.accent,
            opacity: 0.84,
          }}
        />
      </Animated.View>
      {submitting ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <BunnaMark size={72} />
      )}
    </View>
  );
}

export default function CheckInScreen() {
  const { shopId } = useLocalSearchParams<{ shopId?: string }>();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { signedIn, ready, syncPassport, user } = useAuth();

  const preselected = shopId ? Number(shopId) : undefined;
  const { phase, submit, retry } = useCheckIn(preselected);

  const [selected, setSelected] = useState<CachedShop | null>(null);
  const [drink, setDrink] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const [progress, setProgress] = useState<{ stamped: number; total: number; area: string } | null>(null);
  // Drives the difference between "go outside" and "turn on precise location".
  const [precise, setPrecise] = useState(true);

  useEffect(() => {
    let active = true;
    void hasPreciseLocation().then((value) => {
      if (active) setPrecise(value);
    });
    return () => {
      active = false;
    };
  }, []);

  // Check-in is the account gate; browsing never is (docs/DESIGN.md §4.2).
  useEffect(() => {
    if (ready && !signedIn) router.replace("/sign-in");
  }, [ready, signedIn, router]);

  useEffect(() => {
    if (phase.name === "choosing" && !selected && phase.candidates.length > 0) {
      setSelected(phase.candidates[0]);
    }
  }, [phase, selected]);

  // Refresh the passport mirror so the map's seals reflect the new stamp.
  useEffect(() => {
    if (phase.name !== "success") return;
    void syncPassport().catch(() => {});

    if (!phase.result.stamp_earned) return;
    void neighborhoodProgress().then((rows) => {
      const row = rows.find((entry) => entry.id === phase.shop.neighborhood_id);
      if (!row) return;
      setProgress({
        stamped: row.stamped,
        total: row.total,
        area: language === "am" ? row.name_am : row.name,
      });
    });
  }, [phase, syncPassport, language]);

  const close = () => router.back();

  const header = (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: space.sm }}>
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        style={{
          width: touchTarget,
          height: touchTarget,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.full,
          backgroundColor: colors.surfaceRaised,
        }}
      >
        <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      {header}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, gap: space.lg, flexGrow: 1 }}
      >
        {phase.name === "locating" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, paddingVertical: space.xxl }}>
            <RadarArt />
            <Text role="title">{t("checkin.locating")}</Text>
          </View>
        ) : null}

        {phase.name === "no_gps" ? (
          <EmptyState
            icon="crosshairs-off"
            title={t("checkin.error.weak_gps")}
            body={phase.message}
            actionLabel={t("common.retry")}
            onAction={retry}
          />
        ) : null}

        {phase.name === "choosing" ? (
          <ChoosingView
            fix={phase.fix}
            candidates={phase.candidates}
            selected={selected}
            onSelect={setSelected}
            drink={drink}
            onDrink={setDrink}
            showExtras={showExtras}
            onToggleExtras={() => setShowExtras((value) => !value)}
            onSubmit={() =>
              selected && submit(selected, phase.fix, drink ? { drink } : {})
            }
          />
        ) : null}

        {phase.name === "submitting" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, paddingVertical: space.xxl }}>
            <RadarArt submitting />
            <Text role="title">{t("checkin.submitting")}</Text>
            {phase.slow ? (
              <>
                <Text role="body" color="inkMuted" align="center">
                  {t("checkin.slow")}
                </Text>
                <Button label={t("checkin.cancel")} onPress={close} variant="quiet" />
              </>
            ) : null}
          </View>
        ) : null}

        {phase.name === "queued" ? (
          <EmptyState
            icon="cloud-upload-outline"
            title={t("checkin.queued")}
            body={t("checkin.queuedHint")}
            actionLabel={t("checkin.done")}
            onAction={close}
          />
        ) : null}

        {phase.name === "success" ? (
          phase.result.stamp_earned ? (
            <>
              <StampCeremony
                name={phase.shop.name}
                nameAm={phase.shop.name_am}
                level={phase.result.stamp_level ?? "bronze"}
                ordinal={user?.stamps_count ?? 1}
                progress={progress}
                onDone={close}
              />
              {/* Below the fold on purpose: scrolling past it is an answer. */}
              <SayingPrompt checkInId={phase.result.id} />
            </>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, paddingVertical: space.xxl }}>
              <View
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 46,
                  borderCurve: "continuous",
                  backgroundColor: colors.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ rotate: "-4deg" }],
                }}
              >
                <MaterialCommunityIcons name="coffee-outline" size={62} color={colors.primary} />
              </View>
              <Text role="display">{t("checkin.cupAdded")}</Text>
              <Text role="body" color="inkMuted" align="center">
                {phase.shop.name}
              </Text>
              <SayingPrompt checkInId={phase.result.id} />
              <Button label={t("checkin.done")} onPress={close} />
            </View>
          )
        ) : null}

        {phase.name === "rejected" ? (
          <View style={{ gap: space.lg, paddingTop: space.xl }}>
            <EmptyState
              icon="alert-circle-outline"
              title={
                phase.code === "weak_gps" && !precise
                  ? t("checkin.error.coarse_location")
                  : phase.code
                    ? t(REJECTION_STRINGS[phase.code], { shop: phase.shop.name })
                    : t("checkin.error.generic")
              }
              body={phase.code ? undefined : phase.message}
            />
            {phase.code === "weak_gps" && !precise ? (
              <Button label={t("checkin.openSettings")} onPress={() => void Linking.openSettings()} />
            ) : null}
            <Button
              label={phase.code === "too_far" ? t("checkin.error.too_far_action") : t("checkin.retry")}
              onPress={retry}
              variant={phase.code === "weak_gps" && !precise ? "quiet" : "primary"}
            />
            <Button label={t("common.close")} onPress={close} variant="quiet" />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoosingView(props: {
  fix: Fix;
  candidates: CachedShop[];
  selected: CachedShop | null;
  onSelect: (shop: CachedShop) => void;
  drink: string | null;
  onDrink: (drink: string | null) => void;
  showExtras: boolean;
  onToggleExtras: () => void;
  onSubmit: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { fix, candidates, selected, onSelect, drink, onDrink, showExtras, onToggleExtras, onSubmit } = props;

  const weakSignal = fix.accuracyMeters > ACCURACY_LIMIT_METERS;
  // A coarse fix never sharpens by moving, so say so instead of sending the
  // user outside to watch the same number come back.
  const coarseGrant = weakSignal && !fix.precise;

  if (candidates.length === 0) {
    return <EmptyState icon="map-marker-off-outline" title={t("checkin.noneNearby")} body={t("checkin.noneNearbyHint")} />;
  }

  return (
    <>
      {/* Honest accuracy read-out — warns before a doomed round-trip */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.md,
          borderCurve: "continuous",
          backgroundColor: weakSignal ? colors.primarySoft : colors.surfaceRaised,
          borderWidth: 1,
          borderColor: weakSignal ? colors.caution : colors.border,
        }}
      >
        <MaterialCommunityIcons
          name={weakSignal ? "crosshairs-question" : "crosshairs-gps"}
          size={16}
          color={weakSignal ? colors.caution : colors.positive}
        />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text role="caption" color={weakSignal ? "caution" : "inkMuted"}>
            {coarseGrant
              ? t("checkin.accuracyCoarse", { meters: fix.accuracyMeters })
              : weakSignal
                ? t("checkin.accuracyPoor", { meters: fix.accuracyMeters })
                : t("checkin.accuracyGood", { meters: fix.accuracyMeters })}
          </Text>
          {coarseGrant ? (
            <Pressable
              onPress={() => void Linking.openSettings()}
              accessibilityRole="button"
              hitSlop={space.sm}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text role="label" color="primary">
                {t("checkin.openSettings")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text role="title">{t("checkin.pickShop")}</Text>

      <View style={{ gap: space.sm }}>
        {candidates.map((shop) => {
          const active = selected?.id === shop.id;
          return (
            <Pressable
              key={shop.id}
              onPress={() => onSelect(shop)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={shop.name}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                padding: space.lg,
                borderRadius: radius.lg,
                borderCurve: "continuous",
                backgroundColor: active ? colors.primarySoft : colors.surfaceRaised,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
                boxShadow: active ? `0 7px 18px ${colors.shadow}` : undefined,
              }}
            >
              <Seal name={shop.name} nameAm={shop.name_am} level={shop.stamp_level} size="sm" />
              <View style={{ flex: 1 }}>
                <BilingualName name={shop.name} nameAm={shop.name_am} role="heading" />
                <Text role="caption" color="inkMuted" style={{ marginTop: space.xs }}>
                  {formatDistance(shop.distance) ?? ""}
                </Text>
              </View>
              {active ? (
                <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Optional extras stay collapsed: zero required fields beyond the tap */}
      <Pressable
        onPress={onToggleExtras}
        accessibilityRole="button"
        style={{
          minHeight: touchTarget,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceRaised,
        }}
      >
        <Text role="label" color="primary">{t("checkin.extras")}</Text>
        <MaterialCommunityIcons
          name={showExtras ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.primary}
        />
      </Pressable>

      {showExtras ? (
        <View style={{ gap: space.sm }}>
          <Text role="label" color="inkMuted">
            {t("checkin.drink")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {DRINKS.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={drink === option}
                onPress={() => onDrink(drink === option ? null : option)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* The label teaches the stamp-vs-cup model at the moment of action */}
      <Button
        label={selected?.stamped ? t("checkin.addCup") : t("checkin.stampIt")}
        onPress={onSubmit}
        disabled={!selected}
      />
    </>
  );
}

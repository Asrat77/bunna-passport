import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RejectionCode } from "@/api/types";
import { useAuth } from "@/auth/context";
import { BilingualName } from "@/design/components/BilingualName";
import { Button } from "@/design/components/Button";
import { Chip } from "@/design/components/Chip";
import { EmptyState } from "@/design/components/EmptyState";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { neighborhoodProgress, type CachedShop } from "@/db/shops";
import { StampCeremony } from "@/features/checkin/StampCeremony";
import { useCheckIn } from "@/features/checkin/useCheckIn";
import { useI18n } from "@/i18n/context";
import { formatDistance } from "@/location/distance";
import { ACCURACY_LIMIT_METERS, type Fix } from "@/location/useLocation";

const DRINKS = ["macchiato", "buna", "espresso", "spris", "latte"];

const REJECTION_STRINGS: Record<RejectionCode, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  weak_gps: "checkin.error.weak_gps",
  too_far: "checkin.error.too_far",
  cooldown: "checkin.error.cooldown",
  daily_limit: "checkin.error.daily_limit",
};

export default function CheckInScreen() {
  const { shopId } = useLocalSearchParams<{ shopId?: string }>();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { signedIn, ready, syncPassport } = useAuth();

  const preselected = shopId ? Number(shopId) : undefined;
  const { phase, submit, retry } = useCheckIn(preselected);

  const [selected, setSelected] = useState<CachedShop | null>(null);
  const [drink, setDrink] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const [progress, setProgress] = useState<{ stamped: number; total: number; area: string } | null>(null);

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
        style={{ width: touchTarget, height: touchTarget, alignItems: "center", justifyContent: "center" }}
      >
        <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      {header}
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, flexGrow: 1 }}>
        {phase.name === "locating" ? (
          <View style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xxxl }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text role="heading">{t("checkin.locating")}</Text>
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
          <View style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xxxl }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text role="heading">{t("checkin.submitting")}</Text>
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
            <StampCeremony
              name={phase.shop.name}
              nameAm={phase.shop.name_am}
              progress={progress}
              onDone={close}
            />
          ) : (
            <View style={{ alignItems: "center", gap: space.lg, paddingVertical: space.xxl }}>
              <MaterialCommunityIcons name="coffee" size={56} color={colors.accent} />
              <Text role="display">{t("checkin.cupAdded")}</Text>
              <Text role="body" color="inkMuted" align="center">
                {phase.shop.name}
              </Text>
              <Button label={t("checkin.done")} onPress={close} />
            </View>
          )
        ) : null}

        {phase.name === "rejected" ? (
          <View style={{ gap: space.lg, paddingTop: space.xl }}>
            <EmptyState
              icon="alert-circle-outline"
              title={
                phase.code
                  ? t(REJECTION_STRINGS[phase.code], { shop: phase.shop.name })
                  : t("checkin.error.generic")
              }
              body={phase.code ? undefined : phase.message}
            />
            <Button
              label={phase.code === "too_far" ? t("checkin.error.too_far_action") : t("checkin.retry")}
              onPress={retry}
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
          backgroundColor: weakSignal ? colors.primarySoft : "transparent",
        }}
      >
        <MaterialCommunityIcons
          name={weakSignal ? "crosshairs-question" : "crosshairs-gps"}
          size={16}
          color={weakSignal ? colors.caution : colors.positive}
        />
        <Text role="caption" color={weakSignal ? "caution" : "inkMuted"} style={{ flex: 1 }}>
          {weakSignal
            ? t("checkin.accuracyPoor", { meters: fix.accuracyMeters })
            : t("checkin.accuracyGood", { meters: fix.accuracyMeters })}
        </Text>
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
                padding: space.md,
                borderRadius: radius.lg,
                backgroundColor: active ? colors.primarySoft : colors.surfaceRaised,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Seal name={shop.name} nameAm={shop.name_am} earned={shop.stamped} size="sm" />
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
      <Pressable onPress={onToggleExtras} accessibilityRole="button" style={{ paddingVertical: space.sm }}>
        <Text role="label" color="primary">
          {t("checkin.extras")}
        </Text>
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

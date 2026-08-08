import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/context";
import { Button } from "@/design/components/Button";
import { EmptyState } from "@/design/components/EmptyState";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { pendingCount } from "@/features/checkin/queue";
import { useI18n } from "@/i18n/context";
import { languageNames, type Language } from "@/i18n/strings";

/** Placeholder vocabulary from the approved spec; naming remains unresolved. */
const TRUST_LADDER: Record<string, { next: string; need: number } | null> = {
  newcomer: { next: "regular", need: 10 },
  regular: { next: "curator", need: 50 },
  curator: null,
  moderator: null,
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const { user, signedIn, signOut, refreshProfile } = useAuth();
  const [queued, setQueued] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      void pendingCount().then(setQueued);
    }, [refreshProfile]),
  );

  if (!signedIn || !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <EmptyState
          icon="account-circle-outline"
          title={t("auth.gateTitle")}
          body={t("auth.gateBody")}
          actionLabel={t("auth.createAccount")}
          onAction={() => router.push("/sign-in")}
        />
      </SafeAreaView>
    );
  }

  const ladder = TRUST_LADDER[user.trust_level];
  const trustPercent = ladder
    ? Math.min(100, (user.verified_check_ins_count / ladder.need) * 100)
    : 100;
  const initial = [...user.display_name.trim()][0]?.toUpperCase() ?? "B";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: touchTarget }}
      >
        <View>
          <Text role="caption" color="primary" weight="bold">
            BUNNA PASSPORT
          </Text>
          <Text role="display">{t("profile.title")}</Text>
        </View>

        <View
          style={{
            overflow: "hidden",
            padding: space.xl,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            backgroundColor: colors.primary,
            boxShadow: `0 10px 24px ${colors.shadow}`,
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: 80,
              right: -48,
              top: -70,
              borderWidth: 24,
              borderColor: colors.accent,
              opacity: 0.24,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 26,
                borderCurve: "continuous",
                backgroundColor: colors.onPrimary,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: "-3deg" }],
              }}
            >
              <Text role="title" color="primary" weight="bold">
                {initial}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text role="title" color="onPrimary" numberOfLines={2}>
                {user.display_name}
              </Text>
              <Text role="label" color="onPrimary" style={{ opacity: 0.72 }}>
                {`@${user.handle}`}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              marginTop: space.xl,
              paddingTop: space.lg,
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 248, 237, 0.24)",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text role="heading" color="onPrimary" weight="bold">
                {String(user.stamps_count)}
              </Text>
              <Text role="caption" color="onPrimary" style={{ opacity: 0.68 }}>
                {t("passport.stamps")}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text role="heading" color="onPrimary" weight="bold">
                {String(user.verified_check_ins_count)}
              </Text>
              <Text role="caption" color="onPrimary" style={{ opacity: 0.68 }}>
                {t("passport.cups")}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            padding: space.lg,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
            gap: space.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 15,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="shield-star-outline" size={23} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text role="heading" weight="bold">
                {user.trust_level}
              </Text>
              {ladder ? (
                <Text role="caption" color="inkMuted">
                  {t("profile.trustProgress", {
                    current: user.trust_level,
                    have: user.verified_check_ins_count,
                    need: ladder.need,
                    next: ladder.next,
                  })}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceSunken, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${trustPercent}%`, backgroundColor: colors.accent }} />
          </View>
        </View>

        {queued > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              padding: space.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.accentSoft,
            }}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={colors.caution} />
            <Text role="label" style={{ flex: 1 }}>
              {t("checkin.queuedHint")}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: space.md }}>
          <Text role="heading">{t("profile.language")}</Text>
          <View style={{ gap: space.sm }}>
            {(Object.keys(languageNames) as Language[]).map((option) => {
              const selected = language === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setLanguage(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => ({
                    minHeight: touchTarget + 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                    paddingHorizontal: space.lg,
                    borderRadius: radius.lg,
                    borderCurve: "continuous",
                    backgroundColor: selected ? colors.primarySoft : colors.surfaceRaised,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: pressed ? 0.82 : 1,
                  })}
                >
                  <Text role="body" weight={selected ? "bold" : "regular"} style={{ flex: 1 }}>
                    {languageNames[option]}
                  </Text>
                  <MaterialCommunityIcons
                    name={selected ? "check-circle" : "circle-outline"}
                    size={22}
                    color={selected ? colors.primary : colors.borderStrong}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label={t("profile.aboutData")}
          onPress={() => router.push("/about-data")}
          variant="quiet"
        />

        <Button label={t("profile.signOut")} onPress={() => void signOut()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

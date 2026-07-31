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
import { useI18n } from "@/i18n/context";
import { languageNames, type Language } from "@/i18n/strings";
import { pendingCount } from "@/features/checkin/queue";

/**
 * Trust thresholds from docs/SPEC.md §7. The tier vocabulary itself is still
 * an open product decision (SPEC §14.3), so these are placeholders.
 */
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
          icon="account-outline"
          title={t("auth.gateTitle")}
          body={t("auth.gateBody")}
          actionLabel={t("auth.createAccount")}
          onAction={() => router.push("/sign-in")}
        />
      </SafeAreaView>
    );
  }

  const ladder = TRUST_LADDER[user.trust_level];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: touchTarget * 2 }}
      >
        <View style={{ gap: space.xs }}>
          <Text role="display">{user.display_name}</Text>
          <Text role="body" color="inkMuted">
            {`@${user.handle}`}
          </Text>
        </View>

        <View
          style={{
            padding: space.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
            gap: space.sm,
          }}
        >
          <Text role="label" weight="bold">
            {user.trust_level}
          </Text>
          {ladder ? (
            <>
              <Text role="caption" color="inkMuted">
                {t("profile.trustProgress", {
                  current: user.trust_level,
                  have: user.verified_check_ins_count,
                  need: ladder.need,
                  next: ladder.next,
                })}
              </Text>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.surfaceSunken,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (user.verified_check_ins_count / ladder.need) * 100)}%`,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
            </>
          ) : null}
        </View>

        {queued > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: colors.primarySoft,
            }}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={18} color={colors.caution} />
            <Text role="caption">{t("checkin.queuedHint")}</Text>
          </View>
        ) : null}

        <View style={{ gap: space.md }}>
          <Text role="heading">{t("profile.language")}</Text>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {(Object.keys(languageNames) as Language[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => setLanguage(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: language === option }}
                style={{
                  flex: 1,
                  minHeight: touchTarget,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.md,
                  backgroundColor: language === option ? colors.primarySoft : colors.surfaceRaised,
                  borderWidth: language === option ? 2 : 1,
                  borderColor: language === option ? colors.primary : colors.border,
                }}
              >
                <Text role="body" weight={language === option ? "bold" : "regular"}>
                  {languageNames[option]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button label={t("profile.signOut")} onPress={() => void signOut()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

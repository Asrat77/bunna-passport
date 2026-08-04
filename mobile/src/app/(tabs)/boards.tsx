import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api/client";
import type { LeaderboardMetric, LeaderboardPeriod } from "@/api/types";
import { useAuth } from "@/auth/context";
import { Chip } from "@/design/components/Chip";
import { EmptyState } from "@/design/components/EmptyState";
import { SkeletonBlock } from "@/design/components/Skeleton";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

type Entry = {
  rank: number;
  user: { id: number; handle: string; display_name: string };
  value: number;
};

const PERIODS: LeaderboardPeriod[] = ["week", "month", "all_time"];
const METRICS: LeaderboardMetric[] = ["cups", "shops"];

function Podium({ entries, metric }: { entries: Entry[]; metric: LeaderboardMetric }) {
  const { colors } = useTheme();
  const order = [entries[1], entries[0], entries[2]].filter((entry): entry is Entry => Boolean(entry));

  return (
    <View
      style={{
        minHeight: 190,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: space.sm,
        padding: space.lg,
        borderRadius: radius.xl,
        borderCurve: "continuous",
        backgroundColor: colors.primary,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: 90,
          right: -52,
          top: -70,
          borderWidth: 28,
          borderColor: colors.accent,
          opacity: 0.22,
        }}
      />
      {order.map((entry) => {
        const first = entry.rank === 1;
        return (
          <View key={entry.user.id} style={{ flex: 1, alignItems: "center", gap: space.xs }}>
            <View
              style={{
                width: first ? 68 : 56,
                height: first ? 68 : 56,
                borderRadius: first ? 25 : 20,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: first ? colors.accent : colors.onPrimary,
                transform: [{ rotate: first ? "-3deg" : "2deg" }],
              }}
            >
              <MaterialCommunityIcons
                name={first ? "crown-outline" : "account-outline"}
                size={first ? 30 : 24}
                color={first ? colors.onAccent : colors.primary}
              />
            </View>
            <Text role="label" color="onPrimary" weight="bold" align="center" numberOfLines={1}>
              {entry.user.display_name}
            </Text>
            <Text role="caption" color="onPrimary" align="center" style={{ opacity: 0.72 }}>
              {`#${entry.rank} · ${entry.value} ${metric}`}
            </Text>
            <View
              style={{
                width: "100%",
                height: first ? 54 : entry.rank === 2 ? 38 : 28,
                borderTopLeftRadius: radius.md,
                borderTopRightRadius: radius.md,
                backgroundColor: colors.onPrimary,
                opacity: first ? 0.22 : 0.13,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function BoardsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();

  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [metric, setMetric] = useState<LeaderboardMetric>("cups");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setLoading(true);
    api
      .listLeaderboard({ scope: "city", period, metric })
      .then(({ data }) => {
        if (active) {
          setEntries(Array.isArray(data) ? (data as Entry[]) : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [period, metric]);

  const ownRank = entries.find((entry) => entry.user.id === user?.id);
  const periodLabel: Record<LeaderboardPeriod, string> = {
    week: t("boards.week"),
    month: t("boards.month"),
    all_time: t("boards.allTime"),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: touchTarget }}
      >
        <View>
          <Text role="caption" color="primary" weight="bold">
            {t("boards.city").toUpperCase()}
          </Text>
          <Text role="display">{t("boards.title")}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {PERIODS.map((option) => (
            <Chip
              key={option}
              label={periodLabel[option]}
              selected={period === option}
              onPress={() => setPeriod(option)}
            />
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", gap: space.sm }}>
          {METRICS.map((option) => (
            <Chip
              key={option}
              label={option === "cups" ? t("boards.cups") : t("boards.shops")}
              selected={metric === option}
              onPress={() => setMetric(option)}
              style={{ flex: 1, justifyContent: "center" }}
            />
          ))}
        </View>

        {loading ? (
          <View style={{ gap: space.md }}>
            <SkeletonBlock height={190} cornerRadius={radius.xl} />
            <SkeletonBlock height={64} cornerRadius={radius.lg} />
            <SkeletonBlock height={64} cornerRadius={radius.lg} />
          </View>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={failed ? "cloud-off-outline" : "trophy-outline"}
            title={failed ? t("offline.needsConnection") : t("boards.freshBoard")}
          />
        ) : (
          <>
            <Podium entries={entries.slice(0, 3)} metric={metric} />
            <View style={{ gap: space.sm }}>
              {entries.slice(3).map((entry) => {
                const isOwn = entry.user.id === user?.id;
                return (
                  <View
                    key={entry.user.id}
                    style={{
                      minHeight: 64,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.md,
                      paddingHorizontal: space.lg,
                      paddingVertical: space.md,
                      borderRadius: radius.lg,
                      borderCurve: "continuous",
                      backgroundColor: isOwn ? colors.primarySoft : colors.surfaceRaised,
                      borderWidth: 1,
                      borderColor: isOwn ? colors.primary : colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 13,
                        backgroundColor: colors.surfaceSunken,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text role="label" weight="bold" color="primary">
                        {String(entry.rank)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text role="body" weight="medium" numberOfLines={1}>
                        {entry.user.display_name}
                      </Text>
                      <Text role="caption" color="inkMuted" numberOfLines={1}>
                        {`@${entry.user.handle}`}
                      </Text>
                    </View>
                    <Text role="heading" weight="bold">
                      {String(entry.value)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {user && !ownRank && entries.length > 0 ? (
          <View
            style={{
              padding: space.lg,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.borderStrong,
              backgroundColor: colors.surfaceRaised,
            }}
          >
            <Text role="label" color="inkMuted" align="center">
              {t("boards.unranked")}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

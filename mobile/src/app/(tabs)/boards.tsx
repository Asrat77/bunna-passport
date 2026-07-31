import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api/client";
import type { LeaderboardMetric, LeaderboardPeriod } from "@/api/types";
import { useAuth } from "@/auth/context";
import { Chip } from "@/design/components/Chip";
import { EmptyState } from "@/design/components/EmptyState";
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

export default function BoardsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();

  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [metric, setMetric] = useState<LeaderboardMetric>("cups");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    api
      .listLeaderboard({ scope: "city", period, metric })
      .then(({ data }) => {
        if (!active) return;
        // The endpoint returns an open envelope; treat anything else as empty.
        setEntries(Array.isArray(data) ? (data as Entry[]) : []);
      })
      .catch(() => {
        if (active) setFailed(true);
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
      <View style={{ padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {PERIODS.map((option) => (
            <Chip
              key={option}
              label={periodLabel[option]}
              selected={period === option}
              onPress={() => setPeriod(option)}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {METRICS.map((option) => (
            <Chip
              key={option}
              label={option === "cups" ? t("boards.cups") : t("boards.shops")}
              selected={metric === option}
              onPress={() => setMetric(option)}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          gap: space.sm,
          paddingBottom: touchTarget * 2,
        }}
      >
        {entries.length === 0 ? (
          <EmptyState
            icon={failed ? "cloud-off-outline" : "trophy-outline"}
            title={failed ? t("offline.needsConnection") : t("boards.freshBoard")}
          />
        ) : (
          entries.map((entry) => (
            <View
              key={entry.user.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.lg,
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceRaised,
                borderWidth: 1,
                borderColor: entry.user.id === user?.id ? colors.primary : colors.border,
              }}
            >
              <Text role="label" color="inkMuted" style={{ minWidth: 28 }}>
                {String(entry.rank)}
              </Text>
              <Text role="body" weight="medium" style={{ flex: 1 }}>
                {entry.user.display_name}
              </Text>
              <Text role="body" weight="bold">
                {String(entry.value)}
              </Text>
            </View>
          ))
        )}

        {/* Unranked users get a ghost slot rather than absence (DESIGN.md §4.3) */}
        {user && !ownRank && entries.length > 0 ? (
          <View
            style={{
              padding: space.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.borderStrong,
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

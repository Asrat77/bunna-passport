import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/context";
import { Button } from "@/design/components/Button";
import { EmptyState } from "@/design/components/EmptyState";
import { Seal } from "@/design/components/Seal";
import { ShopCard } from "@/design/components/ShopCard";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { listShops, neighborhoodProgress, type CachedShop, type NeighborhoodProgress } from "@/db/shops";
import { useI18n } from "@/i18n/context";

function ProgressRow({ area }: { area: NeighborhoodProgress }) {
  const { colors } = useTheme();
  const { language } = useI18n();
  const percent = area.total > 0 ? (area.stamped / area.total) * 100 : 0;

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text role="label" weight="medium">
          {language === "am" ? area.name_am : area.name}
        </Text>
        <Text role="label" color="inkMuted">
          {`${area.stamped}/${area.total}`}
        </Text>
      </View>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.surfaceSunken,
          overflow: "hidden",
        }}
      >
        <View style={{ height: "100%", width: `${percent}%`, backgroundColor: colors.accent }} />
      </View>
    </View>
  );
}

export default function PassportScreen() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { signedIn, user } = useAuth();

  const [stamped, setStamped] = useState<CachedShop[]>([]);
  const [unstamped, setUnstamped] = useState<CachedShop[]>([]);
  const [areas, setAreas] = useState<NeighborhoodProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const all = await listShops();
        const progress = await neighborhoodProgress();
        if (!active) return;
        setStamped(all.filter((shop) => shop.stamped));
        setUnstamped(all.filter((shop) => !shop.stamped));
        setAreas(progress.filter((area) => area.total > 0));
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (!signedIn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <EmptyState
          icon="book-outline"
          title={t("auth.gateTitle")}
          body={t("auth.gateBody")}
          actionLabel={t("auth.createAccount")}
          onAction={() => router.push("/sign-in")}
        />
      </SafeAreaView>
    );
  }

  const largestArea = areas.slice().sort((a, b) => b.total - a.total)[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          padding: space.lg,
          gap: space.xl,
          paddingBottom: touchTarget * 3,
        }}
      >
        <View style={{ flexDirection: "row", gap: space.lg }}>
          <View
            style={{
              flex: 1,
              padding: space.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text role="numeral">{String(user?.stamps_count ?? stamped.length)}</Text>
            <Text role="label" color="inkMuted">
              {t("passport.stamps")}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: space.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text role="numeral">{String(user?.verified_check_ins_count ?? 0)}</Text>
            <Text role="label" color="inkMuted">
              {t("passport.cups")}
            </Text>
          </View>
        </View>

        {areas.length > 0 ? (
          <View style={{ gap: space.lg }}>
            {areas.map((area) => (
              <ProgressRow key={area.id} area={area} />
            ))}
          </View>
        ) : null}

        {stamped.length === 0 ? (
          <>
            <EmptyState
              icon="stamper"
              title={t("passport.empty", {
                count: largestArea?.total ?? unstamped.length,
                area: largestArea
                  ? language === "am"
                    ? largestArea.name_am
                    : largestArea.name
                  : t("boards.city"),
              })}
            />
            <Text role="heading">{t("passport.nearby")}</Text>
            <View style={{ gap: space.sm }}>
              {unstamped.slice(0, 3).map((shop) => (
                <ShopCard key={shop.id} shop={shop} onPress={() => router.push(`/shop/${shop.id}`)} />
              ))}
            </View>
          </>
        ) : (
          <View style={{ gap: space.md }}>
            <Text role="heading">{t("passport.stamps")}</Text>
            {/* Earned seals sit next to dashed placeholders — visible absence
                is the completion hook (docs/DESIGN.md §6.3). */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.lg }}>
              {stamped.map((shop) => (
                <Seal key={shop.id} name={shop.name} nameAm={shop.name_am} earned size="md" />
              ))}
              {unstamped.slice(0, 6).map((shop) => (
                <Seal key={shop.id} name={shop.name} nameAm={shop.name_am} earned={false} size="md" />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

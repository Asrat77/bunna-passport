import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/context";
import { EmptyState } from "@/design/components/EmptyState";
import { ProgressRing } from "@/design/components/ProgressRing";
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
        <Text role="label" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
          {language === "am" ? area.name_am : area.name}
        </Text>
        <Text role="label" color="inkMuted">
          {`${area.stamped}/${area.total}`}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
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

  // One handler for every card and seal, rather than a closure per row.
  const openShop = useCallback(
    (shop: CachedShop) => router.push(`/shop/${shop.id}`),
    [router],
  );

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
          icon="book-open-page-variant-outline"
          title={t("auth.gateTitle")}
          body={t("auth.gateBody")}
          actionLabel={t("auth.createAccount")}
          onAction={() => router.push("/sign-in")}
        />
      </SafeAreaView>
    );
  }

  const totalShops = stamped.length + unstamped.length;
  const stampCount = user?.stamps_count ?? stamped.length;
  const largestArea = areas.slice().sort((a, b) => b.total - a.total)[0];
  const allSeals = [...stamped, ...unstamped.slice(0, stamped.length > 0 ? 8 : 12)];

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
          <Text role="display">{t("passport.title")}</Text>
        </View>

        <View
          style={{
            overflow: "hidden",
            minHeight: 190,
            flexDirection: "row",
            alignItems: "center",
            gap: space.lg,
            padding: space.xl,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
            boxShadow: `0 10px 24px ${colors.shadow}`,
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 150,
              height: 150,
              borderRadius: 75,
              right: -60,
              top: -58,
              backgroundColor: colors.accentSoft,
              opacity: 0.8,
            }}
          />
          <ProgressRing value={stampCount} total={totalShops} label={t("boards.city")} />
          <View style={{ flex: 1, gap: space.md }}>
            <View>
              <Text role="numeral">{String(stampCount)}</Text>
              <Text role="label" color="inkMuted">
                {t("passport.stamps")}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
                paddingTop: space.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <MaterialCommunityIcons name="coffee-outline" size={24} color={colors.accent} />
              <View>
                <Text role="heading" weight="bold">
                  {String(user?.verified_check_ins_count ?? 0)}
                </Text>
                <Text role="caption" color="inkMuted">
                  {t("passport.cups")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {areas.length > 0 ? (
          <View
            style={{
              gap: space.lg,
              padding: space.lg,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              backgroundColor: colors.surfaceRaised,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {areas.map((area) => <ProgressRow key={area.id} area={area} />)}
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
                <ShopCard key={shop.id} shop={shop} onPress={openShop} />
              ))}
            </View>
          </>
        ) : (
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text role="heading">{t("passport.stamps")}</Text>
              <Text role="caption" color="inkMuted">
                {`${stampCount}/${totalShops}`}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
              {allSeals.map((shop) => (
                <Pressable
                  key={shop.id}
                  onPress={() => router.push(`/shop/${shop.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={shop.name}
                  style={({ pressed }) => ({
                    width: 94,
                    alignItems: "center",
                    gap: space.xs,
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <Seal name={shop.name} nameAm={shop.name_am} level={shop.stamp_level} size="md" />
                  <Text role="caption" color={shop.stamped ? "ink" : "inkFaint"} numberOfLines={1} align="center">
                    {language === "am" ? shop.name_am : shop.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

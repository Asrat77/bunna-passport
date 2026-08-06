import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Mapbox from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip } from "@/design/components/Chip";
import { EmptyState } from "@/design/components/EmptyState";
import { Seal } from "@/design/components/Seal";
import { ShopCard } from "@/design/components/ShopCard";
import { ShopCardSkeleton } from "@/design/components/Skeleton";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { fonts } from "@/design/typography";
import type { CachedShop } from "@/db/shops";
import { LocationPrimer } from "@/features/explore/LocationPrimer";
import { BOLE_CENTER, MAPBOX_STYLE_URL, mapStyleConfig } from "@/features/explore/mapStyle";
import { ShopPeek } from "@/features/explore/ShopPeek";
import { useCatalog } from "@/features/explore/useCatalog";
import { useI18n } from "@/i18n/context";
import type { Coordinate } from "@/location/distance";

type ViewMode = "map" | "list";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
if (MAPBOX_TOKEN) void Mapbox.setAccessToken(MAPBOX_TOKEN);

function relativeTime(date: Date | null, t: ReturnType<typeof useI18n>["t"]): string | null {
  if (!date) return null;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 2) return t("common.justNow");
  if (minutes < 60) return t("common.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.hoursAgo", { count: hours });
  return t("common.daysAgo", { count: Math.floor(hours / 24) });
}

export default function ExploreScreen() {
  const { colors, scheme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [mode, setMode] = useState<ViewMode>("map");
  const [query, setQuery] = useState("");
  const [onlyUnstamped, setOnlyUnstamped] = useState(false);
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [peeked, setPeeked] = useState<CachedShop | null>(null);

  const { shops, loading, syncing, syncedAt, online, refresh } = useCatalog({
    query,
    origin,
    onlyUnstamped,
  });

  const styleConfig = useMemo(() => mapStyleConfig(scheme), [scheme]);
  const freshness = relativeTime(syncedAt, t);

  const openShop = useCallback(
    (shop: CachedShop) => router.push(`/shop/${shop.id}`),
    [router],
  );

  const searching = query.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View
        style={{
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: space.md,
          gap: space.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View>
            <Text role="caption" color="primary" weight="bold">
              BUNNA PASSPORT
            </Text>
            <Text role="title">{t("tab.explore")}</Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              padding: 4,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceSunken,
            }}
          >
            {(["map", "list"] as const).map((option) => {
              const selected = mode === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setMode(option)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option === "map" ? t("explore.map") : t("explore.list")}
                  style={{
                    minWidth: 48,
                    height: 40,
                    borderRadius: radius.full,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? colors.surfaceRaised : "transparent",
                    boxShadow: selected ? `0 3px 8px ${colors.shadow}` : undefined,
                  }}
                >
                  <MaterialCommunityIcons
                    name={option === "map" ? "map-outline" : "format-list-bulleted"}
                    size={20}
                    color={selected ? colors.primary : colors.inkMuted}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            minHeight: touchTarget,
            paddingHorizontal: space.lg,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
            boxShadow: `0 4px 12px ${colors.shadow}`,
          }}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("explore.search")}
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel={t("explore.search")}
            returnKeyType="search"
            style={{
              flex: 1,
              color: colors.ink,
              // One field for both scripts: the Ethiopic face also carries Latin.
              fontFamily: fonts.bodyEthiopic,
              fontSize: 16,
              paddingVertical: space.md,
            }}
          />
          {searching ? (
            <Pressable
              onPress={() => setQuery("")}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
        >
          <LocationPrimer origin={origin} onOrigin={setOrigin} />
          <Chip
            label={t("explore.notStamped")}
            selected={onlyUnstamped}
            onPress={() => setOnlyUnstamped((value) => !value)}
          />
        </ScrollView>
      </View>

      {/* Offline / freshness */}
      {!online ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            marginHorizontal: space.lg,
            marginBottom: space.sm,
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.primarySoft,
          }}
        >
          <MaterialCommunityIcons name="cloud-off-outline" size={16} color={colors.caution} />
          <Text role="caption" color="ink">
            {t("offline.banner")}
          </Text>
        </View>
      ) : null}

      {mode === "map" ? (
        <View
          style={{
            flex: 1,
            marginHorizontal: space.md,
            marginBottom: space.sm,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {MAPBOX_TOKEN ? (
            <Mapbox.MapView
              style={{ flex: 1 }}
              styleURL={MAPBOX_STYLE_URL}
              logoEnabled={false}
              attributionEnabled
              compassEnabled={false}
              scaleBarEnabled={false}
            >
              <Mapbox.StyleImport id="basemap" existing config={styleConfig} />
              <Mapbox.Camera
                centerCoordinate={origin ? [origin.longitude, origin.latitude] : BOLE_CENTER}
                zoomLevel={origin ? 14.2 : 13.5}
                animationMode="flyTo"
                animationDuration={500}
              />
              {origin ? (
                <Mapbox.MarkerView coordinate={[origin.longitude, origin.latitude]} allowOverlap>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: colors.positive,
                      borderWidth: 4,
                      borderColor: colors.surfaceRaised,
                      boxShadow: `0 2px 8px ${colors.shadow}`,
                    }}
                  />
                </Mapbox.MarkerView>
              ) : null}
              {shops.map((shop) => (
                <Mapbox.MarkerView
                  key={shop.id}
                  coordinate={[shop.longitude, shop.latitude]}
                  anchor={{ x: 0.5, y: 0.5 }}
                  allowOverlap={false}
                  isSelected={peeked?.id === shop.id}
                >
                  <Pressable
                    onPress={() => setPeeked(shop)}
                    accessibilityRole="button"
                    accessibilityLabel={shop.name}
                    hitSlop={8}
                  >
                    <Seal
                      name={shop.name}
                      nameAm={shop.name_am}
                      level={shop.stamp_level}
                      size="pin"
                    />
                  </Pressable>
                </Mapbox.MarkerView>
              ))}
            </Mapbox.MapView>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: space.xl,
                backgroundColor: colors.mapLand,
              }}
            >
              <MaterialCommunityIcons name="map-outline" size={48} color={colors.primary} />
              <Text role="heading" align="center" style={{ marginTop: space.md }}>
                {t("explore.map")}
              </Text>
              <Text role="caption" color="inkMuted" align="center" style={{ marginTop: space.xs }}>
                EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
              </Text>
            </View>
          )}

          {/* Count / freshness chip, dismissible by tapping through to list */}
          {!loading ? (
            <View
              style={{
                position: "absolute",
                top: space.md,
                left: space.lg,
                right: space.lg,
                alignItems: "center",
              }}
              pointerEvents="none"
            >
              <View
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.sm,
                  borderRadius: radius.full,
                  backgroundColor: colors.surfaceRaised,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text role="caption" color="inkMuted">
                  {syncing
                    ? t("common.loading")
                    : freshness
                      ? t("explore.updatedAgo", { ago: freshness })
                      : t("explore.shopsInAddis", { count: shops.length })}
                </Text>
              </View>
            </View>
          ) : null}

          {peeked ? (
            <ShopPeek
              shop={peeked}
              onClose={() => setPeeked(null)}
              onOpen={() => {
                const shop = peeked;
                setPeeked(null);
                openShop(shop);
              }}
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(shop) => String(shop.id)}
          renderItem={({ item }) => <ShopCard shop={item} onPress={openShop} />}
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            gap: space.sm,
            // Clears the check-in pill and the tab bar.
            paddingBottom: touchTarget * 3,
          }}
          refreshing={syncing}
          onRefresh={() => refresh(true)}
          ListEmptyComponent={
            loading ? (
              <View style={{ gap: space.md }}>
                <ShopCardSkeleton />
                <ShopCardSkeleton />
                <ShopCardSkeleton />
              </View>
            ) : searching ? (
              <EmptyState
                icon="magnify"
                title={t("explore.noResults")}
                body={t("explore.noResultsHint")}
                actionLabel={t("explore.addShop")}
                onAction={() => router.push("/shop/new")}
              />
            ) : (
              <EmptyState
                title={t("explore.emptyArea", { count: 0, area: t("boards.city") })}
                body={t("explore.emptyAreaHint")}
                actionLabel={t("explore.addShop")}
                onAction={() => router.push("/shop/new")}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

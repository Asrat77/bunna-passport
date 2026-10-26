import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { EmptyState } from "@/design/components/EmptyState";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useDockClearance } from "@/design/dock";
import { ThemeOverride, useTheme } from "@/design/theme";
import { mocha, radius, space } from "@/design/tokens";
import { fonts } from "@/design/typography";
import type { CachedShop } from "@/db/shops";
import { BeanIcon } from "@/features/explore/BeanIcon";
import { DITHER_HEIGHT, DitherHeader } from "@/features/explore/DitherHeader";
import { LocationPrimer } from "@/features/explore/LocationPrimer";
import { QuickAction } from "@/features/explore/QuickAction";
import { ShopRow, ShopRowDivider, ShopRowSkeleton } from "@/features/explore/ShopRow";
import { BOLE_CENTER, MAPBOX_STYLE_URL, mapStyleConfig } from "@/features/explore/mapStyle";
import { ShopPeek } from "@/features/explore/ShopPeek";
import { useCatalog } from "@/features/explore/useCatalog";
import { useI18n } from "@/i18n/context";
import type { Coordinate } from "@/location/distance";
import { isExpoGo } from "@/platform/runtime";

type ViewMode = "map" | "list";

// Expo Go does not contain @rnmapbox/maps. Keep the native module behind a
// runtime guard so the list/catalog experience can still be smoke-tested there.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go must not evaluate this native module.
const Mapbox = isExpoGo ? null : require("@rnmapbox/maps").default;
const MAPBOX_TOKEN = isExpoGo ? undefined : process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
if (MAPBOX_TOKEN && Mapbox) void Mapbox.setAccessToken(MAPBOX_TOKEN);

function relativeTime(date: Date | null, t: ReturnType<typeof useI18n>["t"]): string | null {
  if (!date) return null;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 2) return t("common.justNow");
  if (minutes < 60) return t("common.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.hoursAgo", { count: hours });
  return t("common.daysAgo", { count: Math.floor(hours / 24) });
}

/** Thousands separators without leaning on Intl, which Hermes only partly ships. */
function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Explore always wears Mocha (docs/DESIGN.md §2.2.1), whatever the OS mode. */
export default function ExploreScreen() {
  return (
    <ThemeOverride scheme="dark" colors={mocha}>
      <Explore />
    </ThemeOverride>
  );
}

function Explore() {
  const { colors, scheme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const dockClearance = useDockClearance();

  const [mode, setMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [onlyUnstamped, setOnlyUnstamped] = useState(false);
  const [onlyJebena, setOnlyJebena] = useState(false);
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [peeked, setPeeked] = useState<CachedShop | null>(null);
  const [focused, setFocused] = useState(false);
  // Dark status-bar icons while the white top of the header is under them.
  const [overHeader, setOverHeader] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const { shops: catalog, loading, syncing, syncedAt, online, refresh } = useCatalog({
    query,
    origin,
    onlyUnstamped,
  });
  const shops = useMemo(
    () => (onlyJebena ? catalog.filter((shop) => shop.attributes.jebena_service) : catalog),
    [catalog, onlyJebena],
  );

  const styleConfig = useMemo(() => mapStyleConfig(scheme), [scheme]);
  const freshness = relativeTime(syncedAt, t);

  const openShop = useCallback(
    (shop: CachedShop) => router.push(`/shop/${shop.id}`),
    [router],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOverHeader(event.nativeEvent.contentOffset.y < DITHER_HEIGHT / 3);
  }, []);

  const searching = query.trim().length > 0;

  const header = (
    <View>
      <DitherHeader />

      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={{
            marginTop: 18,
            height: 52,
            borderRadius: 16,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingLeft: 18,
            paddingRight: 16,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("explore.search")}
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel={t("explore.search")}
            returnKeyType="search"
            style={{
              flex: 1,
              minWidth: 0,
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
          ) : (
            <MaterialCommunityIcons name="magnify" size={20} color={colors.inkMuted} />
          )}
        </View>

        <View style={{ marginTop: 10, flexDirection: "row", gap: 6 }}>
          <LocationPrimer
            origin={origin}
            onOrigin={setOrigin}
            renderTrigger={({ active, onPress }) => (
              <QuickAction
                label={t("explore.nearMe")}
                selected={active}
                onPress={onPress}
                icon={(color) => (
                  <MaterialCommunityIcons
                    name={active ? "crosshairs-gps" : "crosshairs"}
                    size={16}
                    color={color}
                  />
                )}
              />
            )}
          />
          <QuickAction
            label={mode === "map" ? t("explore.list") : t("explore.map")}
            onPress={() => setMode((current) => (current === "map" ? "list" : "map"))}
            icon={(color) => (
              <MaterialCommunityIcons
                name={mode === "map" ? "format-list-bulleted" : "map-outline"}
                size={16}
                color={color}
              />
            )}
          />
          <QuickAction
            label={t("explore.jebena")}
            selected={onlyJebena}
            onPress={() => setOnlyJebena((value) => !value)}
            icon={(color) => <BeanIcon size={16} color={color} />}
          />
          <QuickAction
            label={t("explore.notYet")}
            selected={onlyUnstamped}
            onPress={() => setOnlyUnstamped((value) => !value)}
            icon={(color) => (
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color={color} />
            )}
          />
        </View>

        {!online ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              marginTop: space.md,
              padding: space.md,
              borderRadius: 16,
              backgroundColor: colors.surfaceRaised,
            }}
          >
            <MaterialCommunityIcons name="cloud-off-outline" size={16} color={colors.primary} />
            <Text role="caption" color="ink" style={{ flex: 1 }}>
              {t("offline.banner")}
            </Text>
          </View>
        ) : null}

        {mode === "list" ? (
          <View
            style={{
              marginTop: 24,
              marginBottom: 4,
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: space.md,
            }}
          >
            <Text role="heading" style={{ fontSize: 18, letterSpacing: -0.18 }}>
              {origin ? t("explore.closest") : t("explore.allShops")}
            </Text>
            {!loading ? (
              <Text role="label" color="inkMuted">
                {syncing
                  ? t("common.loading")
                  : t("explore.shopCount", { count: groupDigits(shops.length) })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {focused ? (
        <StatusBar style={mode === "map" || overHeader ? "dark" : "light"} />
      ) : null}

      {mode === "map" ? (
        <>
          {header}
          <View
            style={{
              flex: 1,
              marginTop: space.lg,
              marginHorizontal: 20,
              marginBottom: dockClearance + space.md,
              borderRadius: 16,
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
                  {isExpoGo ? t("explore.mapDevBuildOnly") : "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN"}
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
        </>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(shop) => String(shop.id)}
          renderItem={({ item }) => <ShopRow shop={item} onPress={openShop} />}
          ItemSeparatorComponent={ShopRowDivider}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={64}
          contentContainerStyle={{ paddingBottom: dockClearance + space.lg }}
          refreshing={syncing}
          onRefresh={() => refresh(true)}
          ListEmptyComponent={
            loading ? (
              <View>
                <ShopRowSkeleton />
                <ShopRowSkeleton />
                <ShopRowSkeleton />
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
    </View>
  );
}

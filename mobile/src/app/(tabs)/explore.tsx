import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Camera, Map, Marker } from "@maplibre/maplibre-react-native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip } from "@/design/components/Chip";
import { EmptyState } from "@/design/components/EmptyState";
import { Seal } from "@/design/components/Seal";
import { ShopCard } from "@/design/components/ShopCard";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { fonts } from "@/design/typography";
import type { CachedShop } from "@/db/shops";
import { LocationPrimer } from "@/features/explore/LocationPrimer";
import { BOLE_CENTER, mapStyle } from "@/features/explore/mapStyle";
import { ShopPeek } from "@/features/explore/ShopPeek";
import { useCatalog } from "@/features/explore/useCatalog";
import { useI18n } from "@/i18n/context";
import type { Coordinate } from "@/location/distance";

type ViewMode = "map" | "list";

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

  const style = useMemo(() => mapStyle(scheme), [scheme]);
  const freshness = relativeTime(syncedAt, t);

  const openShop = useCallback(
    (shop: CachedShop) => router.push(`/shop/${shop.id}`),
    [router],
  );

  const searching = query.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      {/* Search */}
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            minHeight: touchTarget,
            paddingHorizontal: space.lg,
            borderRadius: radius.full,
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
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
      </View>

      {/* Filters and view toggle */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingHorizontal: space.lg,
          paddingBottom: space.md,
        }}
      >
        <LocationPrimer origin={origin} onOrigin={setOrigin} />
        <Chip
          label={t("explore.notStamped")}
          selected={onlyUnstamped}
          onPress={() => setOnlyUnstamped((value) => !value)}
        />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setMode(mode === "map" ? "list" : "map")}
          accessibilityRole="button"
          accessibilityLabel={mode === "map" ? t("explore.list") : t("explore.map")}
          style={{
            width: touchTarget,
            height: touchTarget - 12,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.full,
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MaterialCommunityIcons
            name={mode === "map" ? "format-list-bulleted" : "map-outline"}
            size={20}
            color={colors.ink}
          />
        </Pressable>
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
        <View style={{ flex: 1 }}>
          <Map
            style={{ flex: 1 }}
            mapStyle={style}
            logo={false}
            attribution
            compass={false}
          >
            <Camera
              initialViewState={{
                center: origin ? [origin.longitude, origin.latitude] : BOLE_CENTER,
                zoom: 13.5,
              }}
            />
            {shops.map((shop) => (
              <Marker
                key={shop.id}
                lngLat={[shop.longitude, shop.latitude]}
                anchor="center"
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
                    earned={shop.stamped}
                    size="pin"
                  />
                </Pressable>
              </Marker>
            ))}
          </Map>

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
          renderItem={({ item }) => <ShopCard shop={item} onPress={() => openShop(item)} />}
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            gap: space.sm,
            // Clears the check-in pill and the tab bar.
            paddingBottom: touchTarget * 3,
          }}
          refreshing={syncing}
          onRefresh={() => refresh(true)}
          ListEmptyComponent={
            loading ? null : searching ? (
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

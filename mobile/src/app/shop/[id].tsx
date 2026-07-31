import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/api/client";
import type { ShopDetail } from "@/api/types";
import { BilingualName } from "@/design/components/BilingualName";
import { Button } from "@/design/components/Button";
import { Chip } from "@/design/components/Chip";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { findShop, type CachedShop } from "@/db/shops";
import { useI18n } from "@/i18n/context";

const AMENITY_ICONS: Record<
  string,
  React.ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  wifi: "wifi",
  outdoor_seating: "table-chair",
  jebena_service: "kettle-steam-outline",
  espresso_bar: "coffee-maker",
  takeaway: "cup-outline",
  parking: "parking",
};

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();

  const [cached, setCached] = useState<CachedShop | null>(null);
  const [detail, setDetail] = useState<ShopDetail | null>(null);
  const [photosRequested, setPhotosRequested] = useState(false);

  const shopId = Number(id);

  useEffect(() => {
    if (!Number.isFinite(shopId)) return;
    // Cache first so the screen paints offline, then enrich from the network.
    void findShop(shopId).then(setCached);
    api
      .getShop(shopId)
      .then(({ data }) => setDetail(data))
      .catch(() => {});
  }, [shopId]);

  if (!cached && !detail) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  const name = detail?.name ?? cached?.name ?? "";
  const nameAm = detail?.name_am ?? cached?.name_am ?? "";
  const landmark = detail?.landmark ?? cached?.landmark ?? "";
  const stamped = cached?.stamped ?? false;
  const latitude = detail?.latitude ?? cached?.latitude ?? 0;
  const longitude = detail?.longitude ?? cached?.longitude ?? 0;
  const neighborhood =
    language === "am"
      ? (detail?.neighborhood.name_am ?? cached?.neighborhood_name_am ?? "")
      : (detail?.neighborhood.name ?? cached?.neighborhood_name ?? "");
  const amenities = detail?.attributes ?? cached?.attributes ?? {};

  const openDirections = () => {
    // Landmark text is the real wayfinding; coordinates are the fallback.
    void Linking.openURL(`geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(name)})`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={{
            width: touchTarget,
            height: touchTarget,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.xl }}>
        {/* Photos — thumb-first, full size only on request (DESIGN.md §7) */}
        {detail && detail.photos.length > 0 ? (
          photosRequested ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }}>
              <View style={{ flexDirection: "row", gap: space.sm, paddingHorizontal: space.lg }}>
                {detail.photos.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.urls.medium }}
                    accessibilityLabel={photo.caption ?? name}
                    contentFit="cover"
                    transition={200}
                    style={{ width: 260, height: 170, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken }}
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <Button
              label={t("shop.loadPhotos", { size: `${detail.photos.length * 40}KB` })}
              onPress={() => setPhotosRequested(true)}
              variant="secondary"
            />
          )
        ) : null}

        <View>
          <BilingualName name={name} nameAm={nameAm} role="display" secondaryRole="heading" numberOfLines={2} />
          <Text role="body" color="inkMuted" style={{ marginTop: space.sm }}>
            {neighborhood}
          </Text>
        </View>

        {/* Stamp status band — the passport's presence on every shop */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.lg,
            padding: space.lg,
            borderRadius: radius.lg,
            backgroundColor: stamped ? colors.primarySoft : colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Seal name={name} nameAm={nameAm} earned={stamped} size="md" />
          <View style={{ flex: 1 }}>
            {stamped ? (
              <>
                <Text role="heading">{t("checkin.stampEarned")}</Text>
                {detail ? (
                  <Text role="caption" color="inkMuted" style={{ marginTop: space.xs }}>
                    {t("shop.visits", { count: detail.check_ins_count })}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text role="body" color="inkMuted">
                {t("shop.noStamp")}
              </Text>
            )}
          </View>
        </View>

        {/* Landmark directions lead; there are no street addresses in Addis */}
        {landmark ? (
          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
              <MaterialCommunityIcons name="sign-direction" size={20} color={colors.primary} />
              <Text role="body" style={{ flex: 1 }}>
                {landmark}
              </Text>
            </View>
            <Button label={t("shop.directions")} onPress={openDirections} variant="secondary" />
          </View>
        ) : null}

        {Object.values(amenities).some(Boolean) ? (
          <View style={{ gap: space.md }}>
            <Text role="heading">{t("shop.attributes")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {Object.entries(amenities)
                .filter(([, enabled]) => enabled)
                .map(([key]) => (
                  <Chip
                    key={key}
                    label={key.replace(/_/g, " ")}
                    icon={
                      <MaterialCommunityIcons
                        name={AMENITY_ICONS[key] ?? "check"}
                        size={16}
                        color={colors.ink}
                      />
                    }
                  />
                ))}
            </View>
          </View>
        ) : null}

        <Button
          label={t("checkin.action")}
          onPress={() => router.push({ pathname: "/check-in", params: { shopId: String(shopId) } })}
        />

        {/* Contribution actions stay quiet — contextual, not competing */}
        <View style={{ gap: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text role="caption" color="inkFaint">
            {t("shop.wrongInfo")}
          </Text>
          <View style={{ flexDirection: "row", gap: space.lg, flexWrap: "wrap" }}>
            <Text role="label" color="primary">
              {t("shop.suggestEdit")}
            </Text>
            <Text role="label" color="primary">
              {t("shop.addPhoto")}
            </Text>
            <Text role="label" color="primary">
              {t("shop.report")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

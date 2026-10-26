import { memo } from "react";
import { Pressable, View } from "react-native";
import type { StampLevel } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { mochaTokens } from "@/design/tokens";
import { fonts, isEthiopic } from "@/design/typography";
import type { CachedShop } from "@/db/shops";
import { useI18n } from "@/i18n/context";
import { formatDistance } from "@/location/distance";
import { BeanIcon } from "./BeanIcon";

const PRICE_BANDS: Record<string, number> = {
  budget: 1,
  standard: 2,
  premium: 3,
  splurge: 4,
};

/** Rings for the 48pt stamp mark. Gold and diamond have no Mocha tone yet. */
const STAMP_PAINT: Record<StampLevel, { ring: string; fill: string; icon: string }> = {
  bronze: { ring: mochaTokens.mocha, fill: mochaTokens.bronzeFill, icon: mochaTokens.mochaLight },
  silver: { ring: mochaTokens.silver, fill: mochaTokens.silverFill, icon: mochaTokens.silver },
  gold: { ring: mochaTokens.silver, fill: mochaTokens.silverFill, icon: mochaTokens.silver },
  diamond: { ring: mochaTokens.silver, fill: mochaTokens.silverFill, icon: mochaTokens.silver },
};

function StampMark({ level }: { level: StampLevel | null }) {
  const paint = level ? STAMP_PAINT[level] : null;

  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        borderStyle: paint ? "solid" : "dashed",
        borderColor: paint ? paint.ring : mochaTokens.stampEmptyRing,
        backgroundColor: paint ? paint.fill : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BeanIcon color={paint ? paint.icon : mochaTokens.stampEmptyIcon} />
    </View>
  );
}

type Props = {
  shop: CachedShop;
  onPress: (shop: CachedShop) => void;
};

/**
 * Flat Explore row: no card, no border, a divider between rows. The second
 * name only shows when it adds the other script.
 */
export const ShopRow = memo(function ShopRow({ shop, onPress }: Props) {
  const { language, t } = useI18n();

  const preferAmharic = language === "am" && isEthiopic(shop.name_am);
  const primary = preferAmharic ? shop.name_am : shop.name;
  const other = preferAmharic ? shop.name : shop.name_am;
  const secondary =
    other.trim().length > 0 && isEthiopic(other) !== isEthiopic(primary) ? other : null;

  const neighborhood =
    language === "am" && shop.neighborhood_name_am
      ? shop.neighborhood_name_am
      : shop.neighborhood_name;
  const place = [neighborhood, shop.landmark, shop.price_band && shop.price_band in PRICE_BANDS
    ? "ብር".repeat(PRICE_BANDS[shop.price_band])
    : null]
    .filter(Boolean)
    .join(" · ");

  const distance = formatDistance(shop.distance);
  const cups =
    shop.stamp_visits === 1
      ? t("explore.cupOne")
      : t("explore.cupMany", { count: shop.stamp_visits });

  return (
    <Pressable
      onPress={() => onPress(shop)}
      accessibilityRole="button"
      accessibilityLabel={primary}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 13,
        paddingHorizontal: 20,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <StampMark level={shop.stamp_level} />

      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <Text role="bodyStrong" numberOfLines={1} style={{ flexShrink: 1, fontSize: 16 }}>
            {primary}
          </Text>
          {secondary ? (
            <Text role="label" color="inkMuted" numberOfLines={1} style={{ flexShrink: 2 }}>
              {secondary}
            </Text>
          ) : null}
        </View>
        {place ? (
          <Text role="label" color="inkMuted" numberOfLines={1}>
            {place}
          </Text>
        ) : null}
        {shop.stamp_level ? (
          <Text role="caption" color="inkFaint" style={{ fontSize: 13 }}>
            {`${cups} · ${t(`level.${shop.stamp_level}`)}`}
          </Text>
        ) : (
          <Text role="caption" color="primary" weight="medium" style={{ fontSize: 13 }}>
            {t("explore.notStamped")}
          </Text>
        )}
      </View>

      {distance ? (
        <Text
          role="label"
          style={{
            fontSize: 15,
            ...(isEthiopic(distance) ? null : { fontFamily: fonts.monoLatin }),
          }}
        >
          {distance}
        </Text>
      ) : null}
    </Pressable>
  );
});

export function ShopRowDivider() {
  return <View style={{ height: 1, marginHorizontal: 20, backgroundColor: mochaTokens.divider }} />;
}

export function ShopRowSkeleton() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 20 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: mochaTokens.surface }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ width: "60%", height: 14, borderRadius: 7, backgroundColor: mochaTokens.surface }} />
        <View style={{ width: "40%", height: 12, borderRadius: 6, backgroundColor: mochaTokens.surface }} />
      </View>
    </View>
  );
}

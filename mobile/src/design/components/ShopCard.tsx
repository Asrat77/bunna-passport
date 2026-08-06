import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import type { CachedShop } from "@/db/shops";
import { formatDistance } from "@/location/distance";
import { useI18n } from "@/i18n/context";
import { useTheme } from "../theme";
import { radius, space } from "../tokens";
import { BilingualName } from "./BilingualName";
import { Seal } from "./Seal";
import { Text } from "./Text";

const PRICE_BANDS: Record<string, number> = {
  budget: 1,
  standard: 2,
  premium: 3,
  splurge: 4,
};

/** Price in birr glyphs, never "$$" — money here is ETB (docs/SPEC.md §6). */
function PriceBand({ band }: { band: string | null }) {
  if (!band || !(band in PRICE_BANDS)) return null;

  return (
    <Text role="caption" color="inkMuted" accessibilityLabel={`Price band: ${band}`}>
      {"ብር".repeat(PRICE_BANDS[band])}
    </Text>
  );
}

type Props = {
  shop: CachedShop;
  /**
   * Receives the shop so the list can hoist one handler instead of building a
   * closure per row. A new closure per item defeats memoisation on long lists.
   */
  onPress: (shop: CachedShop) => void;
};

export function ShopCard({ shop, onPress }: Props) {
  const { colors } = useTheme();
  const { language, t } = useI18n();
  const handlePress = () => onPress(shop);

  const distance = formatDistance(shop.distance);
  const neighborhood =
    language === "am" && shop.neighborhood_name_am
      ? shop.neighborhood_name_am
      : shop.neighborhood_name;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        // Comfortably past the 48dp floor once padding is counted.
        minHeight: 72,
        padding: space.lg,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.93 : 1,
        transform: [{ translateY: pressed ? 1 : 0 }],
        boxShadow: `0 5px 14px ${colors.shadow}`,
      })}
    >
      <Seal name={shop.name} nameAm={shop.name_am} level={shop.stamp_level} size="sm" />

      <View style={{ flex: 1 }}>
        <BilingualName name={shop.name} nameAm={shop.name_am} role="heading" />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            marginTop: space.xs,
            flexWrap: "wrap",
          }}
        >
          <Text role="caption" color="inkMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {neighborhood}
          </Text>
          {shop.landmark ? (
            <Text role="caption" color="inkFaint" numberOfLines={1} style={{ flexShrink: 2 }}>
              {`· ${shop.landmark}`}
            </Text>
          ) : null}
          <PriceBand band={shop.price_band} />
        </View>
      </View>

      <View style={{ alignItems: "flex-end", gap: space.xs }}>
        {distance ? (
          <Text role="caption" color="inkMuted">
            {distance}
          </Text>
        ) : null}
        {shop.attributes.jebena_service ? (
          <MaterialCommunityIcons
            name="kettle-steam-outline"
            size={16}
            color={colors.inkFaint}
            accessibilityLabel={t("shop.attributes")}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import { BilingualName } from "@/design/components/BilingualName";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import type { CachedShop } from "@/db/shops";
import { useI18n } from "@/i18n/context";
import { formatDistance } from "@/location/distance";

type Props = {
  shop: CachedShop;
  onClose: () => void;
  onOpen: () => void;
};

/**
 * Bottom-anchored peek: keeps map context, one tap from full detail
 * (docs/DESIGN.md §5.1).
 */
export function ShopPeek({ shop, onClose, onOpen }: Props) {
  const { colors } = useTheme();
  const { language, t } = useI18n();

  const distance = formatDistance(shop.distance);
  const neighborhood =
    language === "am" && shop.neighborhood_name_am
      ? shop.neighborhood_name_am
      : shop.neighborhood_name;

  return (
    <View
      style={{
        position: "absolute",
        left: space.lg,
        right: space.lg,
        bottom: space.lg,
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={shop.name}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          padding: space.lg,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          backgroundColor: colors.surfaceRaised,
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: `0 12px 28px ${colors.shadow}`,
        }}
      >
        <Seal name={shop.name} nameAm={shop.name_am} earned={shop.stamped} size="sm" />

        <View style={{ flex: 1 }}>
          <BilingualName name={shop.name} nameAm={shop.name_am} role="heading" />
          <Text role="caption" color="inkMuted" numberOfLines={1} style={{ marginTop: space.xs }}>
            {[neighborhood, shop.landmark].filter(Boolean).join(" · ")}
          </Text>
          <Text role="caption" color={shop.stamped ? "positive" : "inkFaint"} style={{ marginTop: space.xs }}>
            {shop.stamped
              ? t("checkin.stampEarned")
              : distance
                ? t("common.away", { distance })
                : t("shop.noStamp")}
          </Text>
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.inkMuted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

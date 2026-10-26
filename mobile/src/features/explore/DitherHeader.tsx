import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/design/components/Text";
import { mochaTokens } from "@/design/tokens";
import { fonts, isEthiopic } from "@/design/typography";
import { useAuth } from "@/auth/context";
import { useI18n } from "@/i18n/context";

/**
 * 1x/2x/3x variants are pre-scaled with nearest-neighbour; native image views
 * have no pixelated filter, so this is what keeps the dither cells sharp.
 */
const DITHER = require("../../../assets/images/dither-mocha-240.png");

export const DITHER_HEIGHT = 240;

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (isEthiopic(name)) return [...words[0]][0];
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * The dithered white-to-mocha header with the greeting on its white part and
 * the headline on the dark part below (docs/DESIGN.md §2.2.1).
 */
export function DitherHeader() {
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const name = user?.display_name?.trim() ?? "";
  const initials = initialsOf(name);
  const lead = t("explore.headlineLead");
  const accent = t("explore.headlineAccent");
  const ethiopic = isEthiopic(lead + accent);

  return (
    <View>
      {/* The white runs up under the status bar so the greeting has room. */}
      <View style={{ height: insets.top, backgroundColor: mochaTokens.headerPaper }} />
      <View>
        <Image
          source={DITHER}
          contentFit="cover"
          contentPosition="top"
          accessible={false}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: DITHER_HEIGHT }}
        />

        <View style={{ paddingTop: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 48 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: mochaTokens.headerInk,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials ? (
                <Text role="label" weight="bold" style={{ color: mochaTokens.avatarInk }}>
                  {initials}
                </Text>
              ) : (
                <MaterialCommunityIcons name="account-outline" size={20} color={mochaTokens.avatarInk} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                role="bodyStrong"
                numberOfLines={1}
                style={{ color: mochaTokens.headerInk, lineHeight: 24 }}
              >
                {name ? t("explore.greeting", { name }) : t("explore.greetingGuest")}
              </Text>
              <Text
                role="label"
                numberOfLines={1}
                style={{ color: mochaTokens.headerInkMuted, lineHeight: 20 }}
              >
                {t("explore.greetingSub")}
              </Text>
            </View>
          </View>

          <RNText
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.4}
            style={{
              marginTop: 136,
              fontFamily: ethiopic ? fonts.bodyEthiopicBold : fonts.displayLatin,
              fontSize: 31,
              // Fidel needs the taller line (DESIGN.md §2.3); Latin sets tight.
              lineHeight: ethiopic ? 50 : 34,
              letterSpacing: ethiopic ? 0 : -1.24,
              color: mochaTokens.text,
            }}
          >
            {lead} <RNText style={{ color: mochaTokens.mochaLight }}>{accent}</RNText>
          </RNText>
        </View>
      </View>
    </View>
  );
}

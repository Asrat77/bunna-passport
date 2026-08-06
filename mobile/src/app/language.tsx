import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BunnaMark } from "@/design/components/BunnaMark";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { useI18n } from "@/i18n/context";
import { catalogs, languageNames, type Language } from "@/i18n/strings";

const OPTIONS: Language[] = ["am", "en"];

/** Value before identity: one crafted brand moment, then straight to the map. */
export default function LanguageScreen() {
  const { colors } = useTheme();
  const { setLanguage } = useI18n();

  const choose = (language: Language) => {
    setLanguage(language);
    router.replace("/(tabs)/explore");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        bounces={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{
            minHeight: 390,
            overflow: "hidden",
            backgroundColor: colors.primary,
            paddingHorizontal: space.xl,
            paddingTop: space.xxl,
            paddingBottom: 72,
            borderBottomLeftRadius: 46,
            borderBottomRightRadius: 46,
            borderCurve: "continuous",
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 230,
              height: 230,
              borderRadius: 115,
              right: -74,
              top: -58,
              borderWidth: 32,
              borderColor: colors.accent,
              opacity: 0.22,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 132,
              height: 132,
              borderRadius: 66,
              left: -45,
              bottom: 24,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: colors.onPrimary,
              opacity: 0.24,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <BunnaMark size={112} inverted />
            <View style={{ transform: [{ rotate: "8deg" }], opacity: 0.55 }}>
              <Seal name="Addis" nameAm="አዲስ" level="bronze" size="sm" />
            </View>
          </View>

          <View style={{ marginTop: space.xl, maxWidth: 330 }}>
            <Text role="display" color="onPrimary">
              Bunna Passport
            </Text>
            <Text role="heading" color="onPrimary" style={{ marginTop: space.xs, opacity: 0.82 }}>
              ቡና ፓስፖርት
            </Text>
            <Text role="body" color="onPrimary" style={{ marginTop: space.md, opacity: 0.82 }}>
              {catalogs.en["app.tagline"]}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: -38,
            marginHorizontal: space.lg,
            padding: space.xl,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
            boxShadow: `0 12px 28px ${colors.shadow}`,
          }}
        >
          <Text role="title">ቋንቋ ይምረጡ</Text>
          <Text role="body" color="inkMuted" style={{ marginTop: 2, marginBottom: space.xl }}>
            Choose your language
          </Text>

          <View style={{ gap: space.md }}>
            {OPTIONS.map((language) => (
              <Pressable
                key={language}
                onPress={() => choose(language)}
                accessibilityRole="button"
                accessibilityLabel={languageNames[language]}
                style={({ pressed }) => ({
                  minHeight: touchTarget * 1.55,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.lg,
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderRadius: radius.lg,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.primarySoft : colors.surface,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                })}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 18,
                    borderCurve: "continuous",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: language === "am" ? colors.primary : colors.accentSoft,
                  }}
                >
                  <Text
                    role="heading"
                    color={language === "am" ? "onPrimary" : "primary"}
                    weight="bold"
                  >
                    {language === "am" ? "ሀ" : "Aa"}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text role="heading" weight="bold">
                    {languageNames[language]}
                  </Text>
                  <Text role="caption" color="inkMuted">
                    {catalogs[language]["language.subtitle"]}
                  </Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={22} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

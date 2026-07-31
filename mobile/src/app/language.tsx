import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Seal } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { useI18n } from "@/i18n/context";
import { catalogs, languageNames, type Language } from "@/i18n/strings";

const OPTIONS: Language[] = ["am", "en"];

/**
 * First launch, once. Doubles as the only brand moment before the product —
 * there is no carousel and no tutorial (docs/DESIGN.md §4.4).
 */
export default function LanguageScreen() {
  const { colors } = useTheme();
  const { setLanguage } = useI18n();

  const choose = (language: Language) => {
    setLanguage(language);
    router.replace("/(tabs)/explore");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flex: 1, padding: space.xl, justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: space.xxxl }}>
          <Seal name="Bunna Passport" nameAm="ቡና ፓስፖርት" earned size="lg" />
          <Text role="display" align="center" style={{ marginTop: space.xl }}>
            Bunna Passport
          </Text>
          <Text
            role="body"
            color="inkMuted"
            align="center"
            style={{ marginTop: space.sm, maxWidth: 320 }}
          >
            {catalogs.en["app.tagline"]}
          </Text>
        </View>

        {/* Both labels render in their own script, so the choice needs no
            translation of itself. */}
        <Text role="heading" align="center" style={{ marginBottom: space.xs }}>
          ቋንቋ ይምረጡ
        </Text>
        <Text
          role="label"
          color="inkMuted"
          align="center"
          style={{ marginBottom: space.xl }}
        >
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
                minHeight: touchTarget * 1.4,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceRaised,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: space.lg,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text role="heading" weight="bold">
                {languageNames[language]}
              </Text>
              <Text role="caption" color="inkMuted">
                {catalogs[language]["language.subtitle"]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

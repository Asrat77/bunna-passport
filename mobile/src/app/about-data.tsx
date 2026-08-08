import { useRouter } from "expo-router";
import { Linking, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/design/components/Button";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";

/**
 * Where the catalogue came from.
 *
 * The first shops were imported from OpenStreetMap, whose licence requires
 * that the credit be visible rather than buried in a repository. It is also
 * simply true, and worth saying to people being asked to maintain the rest of
 * it themselves.
 */
export default function AboutDataScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <Text role="display">{t("aboutData.title")}</Text>

        <View
          style={{
            gap: space.md,
            padding: space.lg,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text role="body">{t("aboutData.openStreetMap")}</Text>
          <Text role="caption" color="inkMuted">
            {t("aboutData.licence")}
          </Text>
        </View>

        <Text role="body">{t("aboutData.community")}</Text>

        <Button
          label={t("aboutData.readLicence")}
          variant="secondary"
          onPress={() => void Linking.openURL(OSM_COPYRIGHT)}
        />
        <Button label={t("common.close")} variant="quiet" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

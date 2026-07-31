import { Redirect } from "expo-router";
import { View } from "react-native";
import { useI18n } from "@/i18n/context";

/**
 * Entry gate. The language choice is the only thing that precedes the map —
 * everything else in onboarding happens inside the product (DESIGN.md §4.2).
 */
export default function Index() {
  const { ready, chosen } = useI18n();

  if (!ready) return <View />;
  return <Redirect href={chosen ? "/(tabs)/explore" : "/language"} />;
}

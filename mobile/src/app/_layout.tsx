// Imported per weight rather than from each package root: the root re-exports
// every weight and italic, which would drag ~2MB of unused faces into the APK.
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { NotoSansEthiopic_400Regular } from "@expo-google-fonts/noto-sans-ethiopic/400Regular";
import { NotoSansEthiopic_500Medium } from "@expo-google-fonts/noto-sans-ethiopic/500Medium";
import { NotoSansEthiopic_700Bold } from "@expo-google-fonts/noto-sans-ethiopic/700Bold";
import { NotoSerifEthiopic_600SemiBold } from "@expo-google-fonts/noto-serif-ethiopic/600SemiBold";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/auth/context";
import { ThemeProvider, useTheme } from "@/design/theme";
import { useQueueFlush } from "@/features/checkin/useQueueFlush";
import { I18nProvider } from "@/i18n/context";
import { openDatabase } from "@/db/index";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Losing the splash handle is never worth failing startup over.
});

function Navigator() {
  const { colors, scheme } = useTheme();
  const { signedIn } = useAuth();

  useQueueFlush(signedIn);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="language" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="shop/[id]" />
        <Stack.Screen
          name="check-in"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="sign-in"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    NotoSerifEthiopic_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    NotoSansEthiopic_400Regular,
    NotoSansEthiopic_500Medium,
    NotoSansEthiopic_700Bold,
  });

  useEffect(() => {
    // Opening early means the first screen reads a warm cache, not an empty one.
    openDatabase().catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // Ethiopic must not fall back to a system font, so hold the splash until the
  // faces are resident (docs/DESIGN.md §2.3).
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <Navigator />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

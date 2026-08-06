import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/auth/context";
import { ThemeProvider, useTheme } from "@/design/theme";
import { useQueueFlush } from "@/features/checkin/useQueueFlush";
import { I18nProvider } from "@/i18n/context";
import { openDatabase } from "@/db/index";

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
          name="shop/new"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="check-in"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="suggest-edit"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="report"
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
  useEffect(() => {
    // Opening early means the first screen reads a warm cache, not an empty one.
    openDatabase().catch(() => {});
  }, []);

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

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget, zIndex } from "@/design/tokens";
import { fonts } from "@/design/typography";
import { useI18n } from "@/i18n/context";

/** Tabs where the check-in pill is the obvious next action (DESIGN.md §3). */
const PILL_ROUTES = ["/explore", "/passport"];

function CheckInPill() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!PILL_ROUTES.includes(pathname)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: touchTarget + insets.bottom + space.lg,
        alignItems: "center",
        zIndex: zIndex.nav,
      }}
    >
      <Pressable
        onPress={() => router.push("/check-in")}
        accessibilityRole="button"
        accessibilityLabel={t("checkin.action")}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          minHeight: touchTarget,
          paddingHorizontal: space.xl,
          borderRadius: radius.full,
          backgroundColor: colors.primary,
          opacity: pressed ? 0.9 : 1,
          // Two elevation levels max per screen; this is the higher one.
          elevation: 6,
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        })}
      >
        <MaterialCommunityIcons name="coffee" size={20} color={colors.onPrimary} />
        <Text role="bodyStrong" color="onPrimary" weight="bold">
          {t("checkin.action")}
        </Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: {
            backgroundColor: colors.surfaceRaised,
            borderTopColor: colors.border,
            height: touchTarget + 20,
            paddingTop: space.xs,
          },
          // Labels always visible: discoverability beats minimalism here.
          tabBarLabelStyle: { fontFamily: fonts.bodyLatinMedium, fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: t("tab.explore"),
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "map-marker" : "map-marker-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="passport"
          options={{
            title: t("tab.passport"),
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "book" : "book-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="boards"
          options={{
            title: t("tab.boards"),
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "trophy" : "trophy-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("tab.profile"),
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "account" : "account-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
      <CheckInPill />
    </>
  );
}

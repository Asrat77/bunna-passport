import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dock, dockBottomPadding } from "@/design/dock";
import { mochaTokens } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

const ICONS: Record<
  string,
  { default: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; active: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }
> = {
  explore: { default: "home-variant-outline", active: "home-variant" },
  passport: { default: "book-open-page-variant-outline", active: "book-open-page-variant" },
  boards: { default: "chart-bar", active: "chart-bar" },
  profile: { default: "account-circle-outline", active: "account-circle" },
};

const CHECK_IN_ROUTES = new Set(["explore", "passport"]);
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
type TabRoute = TabBarProps["state"]["routes"][number];

/**
 * Icon-only tabs: the focused one widens into a rounded rectangle, the rest
 * are circles. The label is still the accessible name.
 */
function TabButton(props: {
  route: TabRoute;
  focused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { route, focused, label, onPress, onLongPress } = props;
  const icon = ICONS[route.name] ?? ICONS.explore;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: focused ? dock.activeTabWidth : dock.tab,
        height: dock.tab,
        borderRadius: focused ? 16 : dock.tab / 2,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? mochaTokens.surfaceActive : mochaTokens.surface,
        borderWidth: focused ? 0 : 1,
        borderColor: mochaTokens.surfaceActive,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <MaterialCommunityIcons
        name={focused ? icon.active : icon.default}
        size={20}
        color={focused ? mochaTokens.text : mochaTokens.text2}
      />
    </Pressable>
  );
}

/**
 * Full-width Mocha dock floating over the screen: tabs on the left, check-in
 * on the right as the one light object in the bar.
 */
function TabDock({ state, descriptors, navigation }: TabBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;
  const showCheckIn = CHECK_IN_ROUTES.has(activeRoute);

  const tab = (route: TabRoute, index: number) => {
    const focused = state.index === index;
    const options = descriptors[route.key]?.options;
    const label = typeof options?.title === "string" ? options.title : route.name;

    return (
      <TabButton
        key={route.key}
        route={route}
        focused={focused}
        label={label}
        onPress={() => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
      />
    );
  };

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        borderTopWidth: 1,
        borderTopColor: mochaTokens.divider,
      }}
    >
      {/* Real blur on iOS; Android draws the translucent fill alone. */}
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: mochaTokens.barBg }]} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: dock.row,
          paddingTop: dock.padding,
          paddingHorizontal: dock.padding,
          paddingBottom: dockBottomPadding(insets.bottom),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: dock.gap }}>
          {state.routes.map(tab)}
        </View>

        {showCheckIn ? (
          <Pressable
            onPress={() => router.push("/check-in")}
            accessibilityRole="button"
            accessibilityLabel={t("checkin.action")}
            style={({ pressed }) => ({
              width: dock.row,
              height: dock.row,
              borderRadius: dock.row / 2,
              backgroundColor: mochaTokens.text,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <MaterialCommunityIcons name="plus" size={24} color={mochaTokens.bg} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs screenOptions={{ headerShown: false, freezeOnBlur: true }} tabBar={(props) => <TabDock {...props} />}>
      <Tabs.Screen name="explore" options={{ title: t("tab.explore") }} />
      <Tabs.Screen name="passport" options={{ title: t("tab.passport") }} />
      <Tabs.Screen name="boards" options={{ title: t("tab.boards") }} />
      <Tabs.Screen name="profile" options={{ title: t("tab.profile") }} />
    </Tabs>
  );
}

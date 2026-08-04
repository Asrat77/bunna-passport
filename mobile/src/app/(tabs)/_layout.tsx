import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space, touchTarget } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

const ICONS: Record<
  string,
  { default: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; active: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }
> = {
  explore: { default: "map-search-outline", active: "map-search" },
  passport: { default: "book-open-page-variant-outline", active: "book-open-page-variant" },
  boards: { default: "trophy-outline", active: "trophy" },
  profile: { default: "account-circle-outline", active: "account-circle" },
};

const CHECK_IN_ROUTES = new Set(["explore", "passport"]);
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
type TabRoute = TabBarProps["state"]["routes"][number];

function TabButton(props: {
  route: TabRoute;
  focused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
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
        flex: 1,
        minWidth: touchTarget,
        minHeight: 62,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View
        style={{
          minWidth: 42,
          height: 30,
          borderRadius: radius.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? colors.primarySoft : "transparent",
        }}
      >
        <MaterialCommunityIcons
          name={focused ? icon.active : icon.default}
          size={22}
          color={focused ? colors.primary : colors.inkMuted}
        />
      </View>
      <Text
        role="caption"
        weight={focused ? "bold" : "medium"}
        color={focused ? "primary" : "inkMuted"}
        numberOfLines={1}
        style={{ fontSize: 10, lineHeight: 14 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * One coherent dock: the hero action grows out of the navigation instead of
 * hovering as a separate pill. Labels stay visible for discoverability.
 */
function TabDock({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
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
        paddingHorizontal: space.md,
        paddingBottom: Math.max(insets.bottom, space.sm),
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          minHeight: 72,
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: space.xs,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          backgroundColor: colors.surfaceRaised,
          borderWidth: 1,
          borderColor: colors.border,
          boxShadow: `0 -4px 18px ${colors.shadow}`,
        }}
      >
        {tab(state.routes[0], 0)}
        {tab(state.routes[1], 1)}

        <View style={{ flex: 1.1, minWidth: 68, minHeight: 70, alignItems: "center" }}>
          {showCheckIn ? (
            <Pressable
              onPress={() => router.push("/check-in")}
              accessibilityRole="button"
              accessibilityLabel={t("checkin.action")}
              style={({ pressed }) => ({
                position: "absolute",
                top: -18,
                width: 62,
                height: 62,
                borderRadius: 22,
                borderCurve: "continuous",
                backgroundColor: colors.primary,
                borderWidth: 5,
                borderColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
                transform: [{ translateY: pressed ? 1 : 0 }, { rotate: "-2deg" }],
                boxShadow: `0 8px 18px ${colors.shadow}`,
              })}
            >
              <MaterialCommunityIcons name="coffee-to-go-outline" size={26} color={colors.onPrimary} />
            </Pressable>
          ) : null}
          <Text
            role="caption"
            weight="bold"
            color={showCheckIn ? "primary" : "inkFaint"}
            numberOfLines={1}
            style={{ position: "absolute", bottom: 5, fontSize: 10, lineHeight: 14 }}
          >
            {showCheckIn ? t("checkin.action") : ""}
          </Text>
        </View>

        {tab(state.routes[2], 2)}
        {tab(state.routes[3], 3)}
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

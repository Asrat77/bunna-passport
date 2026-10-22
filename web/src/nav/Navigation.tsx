import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import type { CheckIn, OpaqueId } from "@/api/types";
import type { ShopFilter } from "@/data/nearby";

export type Tab = "explore" | "passport" | "boards";

export type Route =
  | { name: Tab }
  | { name: "shop"; id: OpaqueId }
  | { name: "checkin"; shopId?: OpaqueId }
  | { name: "ceremony"; checkIn: CheckIn; wasAwake: boolean }
  | { name: "studio" }
  | { name: "map" }
  | { name: "cafes"; query?: string; filter?: ShopFilter };

type Navigation = {
  route: Route;
  /** The tab underneath whatever is pushed, for the dock. */
  tab: Tab;
  canGoBack: boolean;
  push: (route: Route) => void;
  replace: (route: Route) => void;
  back: () => void;
  switchTab: (tab: Tab) => void;
};

const NavigationContext = createContext<Navigation | null>(null);

const isTab = (route: Route): route is { name: Tab } =>
  route.name === "explore" || route.name === "passport" || route.name === "boards";

/**
 * A plain screen stack. Tabs sit at the bottom; Shop, Check in, the ceremony,
 * the Studio and All cafés push on top and come off with Telegram's BackButton.
 */
export function NavigationProvider({ initial, children }: { initial: Route; children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([initial]);

  const push = useCallback((route: Route) => setStack((s) => [...s, route]), []);
  const replace = useCallback((route: Route) => setStack((s) => [...s.slice(0, -1), route]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const switchTab = useCallback((tab: Tab) => setStack([{ name: tab }]), []);

  const value = useMemo<Navigation>(() => {
    const route = stack[stack.length - 1];
    const base = [...stack].reverse().find(isTab);
    return {
      route,
      tab: base?.name ?? "explore",
      canGoBack: stack.length > 1,
      push,
      replace,
      back,
      switchTab,
    };
  }, [stack, push, replace, back, switchTab]);

  return <NavigationContext value={value}>{children}</NavigationContext>;
}

export function useNavigation(): Navigation {
  const navigation = use(NavigationContext);
  if (!navigation) throw new Error("useNavigation must be used inside <NavigationProvider>");
  return navigation;
}

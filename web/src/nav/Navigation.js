import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, use, useCallback, useMemo, useState } from "react";
const NavigationContext = createContext(null);
const isTab = (route) => route.name === "explore" || route.name === "passport" || route.name === "stats";
/**
 * A plain screen stack. Tabs sit at the bottom; Shop, Check in, the ceremony,
 * Profile, the Studio and All cafés push on top and come off with Telegram's BackButton.
 */
export function NavigationProvider({ initial, children }) {
    const [stack, setStack] = useState([initial]);
    const push = useCallback((route) => setStack((s) => [...s, route]), []);
    const replace = useCallback((route) => setStack((s) => [...s.slice(0, -1), route]), []);
    const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
    const switchTab = useCallback((tab) => setStack([{ name: tab }]), []);
    const value = useMemo(() => {
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
    return _jsx(NavigationContext, { value: value, children: children });
}
export function useNavigation() {
    const navigation = use(NavigationContext);
    if (!navigation)
        throw new Error("useNavigation must be used inside <NavigationProvider>");
    return navigation;
}

import { miniApp } from "@telegram-apps/sdk-react";
import { createContext, use, useEffect, useLayoutEffect, useState } from "react";
import { palette } from "@/design/palette";
const darkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");
function useSystemScheme() {
    const [scheme, setScheme] = useState(() => darkQuery()?.matches ? "dark" : "light");
    useEffect(() => {
        const query = darkQuery();
        if (!query)
            return;
        const onChange = () => setScheme(query.matches ? "dark" : "light");
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }, []);
    return scheme;
}
/**
 * The app keeps its own palette rather than Telegram's theme: light or Dark
 * Roast follows the phone's setting and switches live, and Telegram's chrome
 * is recoloured to match.
 */
export function useColorScheme() {
    const scheme = useSystemScheme();
    useLayoutEffect(() => {
        document.documentElement.dataset.theme = scheme;
        // Telegram's own chrome takes the app surface so the header blends in.
        const { surface } = palette[scheme];
        miniApp.setHeaderColor.ifAvailable(surface);
        miniApp.setBackgroundColor.ifAvailable(surface);
        miniApp.setBottomBarColor.ifAvailable(surface);
    }, [scheme]);
    return scheme;
}
export const SchemeContext = createContext("light");
export function useScheme() {
    return use(SchemeContext);
}

import { miniApp, themeParams, useSignal } from "@telegram-apps/sdk-react";
import { createContext, use, useEffect, useLayoutEffect, useState } from "react";
import { palette, type ColorScheme } from "@/design/palette";
import { inTelegram } from "./sdk";

const darkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");

function useSystemScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() =>
    darkQuery()?.matches ? "dark" : "light",
  );
  useEffect(() => {
    const query = darkQuery();
    if (!query) return;
    const onChange = () => setScheme(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return scheme;
}

/**
 * Follows Telegram's colour scheme and switches live on themeChanged
 * (decision 2). Outside Telegram it follows the OS instead.
 */
export function useColorScheme(): ColorScheme {
  const telegramDark = useSignal(themeParams.isDark);
  const system = useSystemScheme();
  const scheme: ColorScheme = inTelegram ? (telegramDark ? "dark" : "light") : system;

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

export const SchemeContext = createContext<ColorScheme>("light");

export function useScheme(): ColorScheme {
  return use(SchemeContext);
}

import { miniApp } from "@telegram-apps/sdk-react";
import { useEffect } from "react";
import { mochaChrome, palette } from "@/design/palette";
import { useScheme } from "./theme";

/**
 * Mocha screens keep their colours in both phone themes (docs/DESIGN.md
 * §2.2.1). Telegram's header goes white to run into the dither art, the rest
 * of its chrome goes Mocha, and both go back to the app surface on the way out.
 */
export function useMochaChrome() {
  const scheme = useScheme();
  useEffect(() => {
    miniApp.setHeaderColor.ifAvailable(mochaChrome.header);
    miniApp.setBackgroundColor.ifAvailable(mochaChrome.background);
    miniApp.setBottomBarColor.ifAvailable(mochaChrome.background);
    document.documentElement.classList.add("mocha-page");
    return () => {
      const { surface } = palette[scheme];
      miniApp.setHeaderColor.ifAvailable(surface);
      miniApp.setBackgroundColor.ifAvailable(surface);
      miniApp.setBottomBarColor.ifAvailable(surface);
      document.documentElement.classList.remove("mocha-page");
    };
  }, [scheme]);
}

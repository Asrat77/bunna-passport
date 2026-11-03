import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { inTelegram } from "./sdk";

/** Where this launch came from, for analytics. Never carries the invite token itself. */
export function launchContext(): { in_telegram: boolean; platform: string; launch_source: string } {
  let platform = "web";
  let startParam: string | undefined;
  if (inTelegram) {
    try {
      const params = retrieveLaunchParams();
      platform = String(params.tgWebAppPlatform ?? "unknown");
      startParam = params.tgWebAppStartParam;
    } catch {
      platform = "unknown";
    }
  }
  const invited = startParam?.startsWith("invite_") || new URLSearchParams(window.location.search).has("invite");
  return {
    in_telegram: inTelegram,
    platform,
    launch_source: invited ? "invite" : startParam ? "start_param" : "direct",
  };
}

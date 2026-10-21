import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { inTelegram } from "./sdk";

const DESKTOP_PLATFORMS = new Set(["tdesktop", "macos", "web", "weba", "webk", "unigram"]);

/**
 * Telegram Desktop and Web can open the Mini App, but a laptop's location
 * can't vouch for being at a café, so check-in asks for the phone instead.
 */
export function onDesktopTelegram(): boolean {
  if (!inTelegram) return false;
  try {
    return DESKTOP_PLATFORMS.has(String(retrieveLaunchParams().tgWebAppPlatform));
  } catch {
    return false;
  }
}

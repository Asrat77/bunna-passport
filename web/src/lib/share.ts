import { shareURL } from "@telegram-apps/sdk-react";

/**
 * Where a shared stamp points. Set VITE_SHARE_URL to the bot's Mini App link
 * (https://t.me/<bot>/<app>) once the bot exists; until then, this site.
 */
const SHARE_URL: string = import.meta.env.VITE_SHARE_URL ?? window.location.origin;

/** Telegram's share sheet inside Telegram, the Web Share API elsewhere. */
export async function shareStamp(text: string): Promise<boolean> {
  const [shared] = shareURL.ifAvailable(SHARE_URL, text);
  if (shared) return true;
  if (navigator.share) {
    try {
      await navigator.share({ text, url: SHARE_URL });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

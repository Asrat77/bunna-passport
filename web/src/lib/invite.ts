import { retrieveLaunchParams, shareURL } from "@telegram-apps/sdk-react";

const START_PREFIX = "invite_";
const TOKEN = /^[A-Za-z0-9]{8,64}$/;

/**
 * The invite token a launch carries, if any. Inside Telegram it arrives as
 * the Mini App's start parameter (t.me/<bot>?startapp=invite_<token>); on the
 * plain website as ?invite=<token>.
 */
export function inviteTokenFrom(startParam: string | undefined | null, search: string): string | null {
  const fromStart = startParam?.startsWith(START_PREFIX) ? startParam.slice(START_PREFIX.length) : null;
  const token = fromStart ?? new URLSearchParams(search).get("invite");
  return token && TOKEN.test(token) ? token : null;
}

let taken = false;

/** The launch's invite, handed out once so Back doesn't reopen it. */
export function takeLaunchInvite(): string | null {
  if (taken) return null;
  taken = true;

  let startParam: string | undefined;
  try {
    startParam = retrieveLaunchParams().tgWebAppStartParam;
  } catch {
    startParam = undefined;
  }
  const token = inviteTokenFrom(startParam, window.location.search);
  if (token && window.location.search.includes("invite=")) {
    // A reload shouldn't offer the same invite again.
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState(null, "", url);
  }
  return token;
}

/**
 * Sends the invite link on its own, for someone with no stamp to put on a
 * card yet: Telegram's share sheet, the phone's, or the clipboard.
 */
export async function shareInviteLink(url: string, text: string): Promise<"shared" | "copied" | null> {
  const [shared] = shareURL.ifAvailable(url, text);
  if (shared) return "shared";
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch {
      // Closed the sheet; fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return null;
  }
}

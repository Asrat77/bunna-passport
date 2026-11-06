import { retrieveLaunchParams, shareMessage, shareURL } from "@telegram-apps/sdk-react";
import { readFlag, writeFlag } from "@/telegram/storage";

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
 * Sends the invite on its own, for someone with no stamp to put on a card
 * yet. Inside Telegram that's the prepared message, whose button opens the
 * app; otherwise Telegram's link sheet, the phone's, or the clipboard.
 */
export async function shareInviteLink(
  url: string,
  text: string,
  preparedMessageId?: string | null,
): Promise<"shared" | "copied" | null> {
  if (preparedMessageId) {
    const [called, sending] = shareMessage.ifAvailable(preparedMessageId);
    if (called) {
      try {
        await sending;
        return "shared";
      } catch {
        // Closed the chat picker, or the message expired.
        return null;
      }
    }
  }
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

const INVITED_BY = "bunna.invitedBy";
const HANDLE = /^[a-z0-9_]{3,30}$/;

/**
 * Who brought a new person in, kept until their first stamp so the
 * first-stamp guide and ceremony can say the friend will see it.
 */
export function rememberInviter(handle: string): Promise<void> {
  return writeFlag(INVITED_BY, handle);
}

export async function readInviter(): Promise<string | null> {
  const handle = await readFlag(INVITED_BY);
  return handle && HANDLE.test(handle) ? handle : null;
}

export function forgetInviter(): Promise<void> {
  return writeFlag(INVITED_BY, "");
}

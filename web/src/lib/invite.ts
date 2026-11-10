import { retrieveLaunchParams, shareMessage, shareURL } from "@telegram-apps/sdk-react";
import { readFlag, writeFlag } from "@/telegram/storage";

const TOKEN = /^[A-Za-z0-9]{8,64}$/;
const SHOP = /^[1-9][0-9]{0,9}$/;

/** What a launch link carries (app/models/launch_link.rb on the server). */
export type LaunchLink = { invite: string | null; shopId: number | null };

/**
 * Reads a launch link. Inside Telegram it all arrives as the Mini App's
 * start parameter, parts joined by "__" (t.me/<bot>?startapp=invite_<token>,
 * or shop_12__src_qr-12 from a café sticker); on the plain website as
 * ?invite=<token>&shop=<id>. The src tag is only for the server, which reads
 * it from the signed launch data when it makes the account.
 */
export function launchLinkFrom(startParam: string | undefined | null, search: string): LaunchLink {
  const parts = new Map<string, string>();
  for (const part of (startParam ?? "").split("__")) {
    const cut = part.indexOf("_");
    if (cut > 0) parts.set(part.slice(0, cut), part.slice(cut + 1));
  }
  const query = new URLSearchParams(search);
  const invite = parts.get("invite") ?? query.get("invite");
  const shop = parts.get("shop") ?? query.get("shop");
  return {
    invite: invite && TOKEN.test(invite) ? invite : null,
    shopId: shop && SHOP.test(shop) ? Number(shop) : null,
  };
}

/** The invite token a launch carries, if any. */
export function inviteTokenFrom(startParam: string | undefined | null, search: string): string | null {
  return launchLinkFrom(startParam, search).invite;
}

let taken = false;

/** The launch's link, handed out once so Back doesn't reopen it. */
export function takeLaunchLink(): LaunchLink {
  if (taken) return { invite: null, shopId: null };
  taken = true;

  let startParam: string | undefined;
  try {
    startParam = retrieveLaunchParams().tgWebAppStartParam;
  } catch {
    startParam = undefined;
  }
  const link = launchLinkFrom(startParam, window.location.search);
  if (/[?&](invite|shop|src)=/.test(window.location.search)) {
    // A reload shouldn't open the same invite or café again.
    const url = new URL(window.location.href);
    for (const key of ["invite", "shop", "src"]) url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
  }
  return link;
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

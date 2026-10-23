import { downloadFile, shareMessage, shareStory, shareURL } from "@telegram-apps/sdk-react";

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

/** The share card image as a file, for the Web Share API. */
async function cardFile(url: string, name: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return new File([await response.blob()], name, { type: "image/png" });
  } catch {
    return null;
  }
}

/** Hands the phone's share sheet the image itself, where it takes files. */
async function shareFile(url: string, name: string, text: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;
  const file = await cardFile(url, name);
  if (!file || !navigator.canShare({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], text });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends the post card to a chat. Inside Telegram that's the prepared photo
 * message (Bot API 8.0), so friends see the card rather than a link; older
 * clients get Telegram's link sheet with the card's URL. The prepared
 * message's button carries the sender's invite; the fallbacks put the
 * invite link in the text instead.
 */
export async function shareCardToChat(
  card: { postUrl: string; preparedMessageId: string | null; inviteUrl?: string },
  caption: string,
): Promise<boolean> {
  if (card.preparedMessageId) {
    const [called, sending] = shareMessage.ifAvailable(card.preparedMessageId);
    if (called) {
      try {
        await sending;
        return true;
      } catch {
        // Closed the chat picker, or the message expired: nothing to undo.
        return false;
      }
    }
  }
  const text = card.inviteUrl ? `${caption}\n${card.inviteUrl}` : caption;
  const [linked] = shareURL.ifAvailable(card.postUrl, text);
  if (linked) return true;
  return (await shareFile(card.postUrl, "bunna-stamp.png", text)) || shareStamp(text);
}

/** Telegram stories need Bot API 7.8; the screen hides the button otherwise. */
export const canShareStory = (): boolean => shareStory.isAvailable();

export function shareCardToStory(storyUrl: string, text: string): boolean {
  const [called] = shareStory.ifAvailable(storyUrl, { text });
  return called;
}

/**
 * Saves the story card to the phone for Instagram or TikTok, which have no
 * way in from a webview. Telegram 8.0 asks to download it; elsewhere the
 * share sheet's "Save image", or the image opened in a new tab.
 */
export async function saveStoryCard(storyUrl: string): Promise<boolean> {
  const [called, downloading] = downloadFile.ifAvailable(storyUrl, "bunna-stamp-story.png");
  if (called) {
    try {
      await downloading;
      return true;
    } catch {
      return false;
    }
  }
  if (await shareFile(storyUrl, "bunna-stamp-story.png", "")) return true;
  window.open(storyUrl, "_blank", "noopener");
  return true;
}

import {
  backButton,
  init,
  isTMA,
  mainButton,
  miniApp,
  secondaryButton,
  swipeBehavior,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

/**
 * True when the page was opened inside Telegram. The same build also runs as a
 * plain website (handoff, Primary actions), so every Telegram call is guarded.
 */
export const inTelegram: boolean = (() => {
  try {
    return isTMA();
  } catch {
    return false;
  }
})();

let started = false;

/** Mounts the SDK components the app uses. Safe to call more than once. */
export function startTelegram(): void {
  if (!inTelegram || started) return;
  started = true;

  init();
  miniApp.mountSync.ifAvailable();
  themeParams.mountSync.ifAvailable();
  backButton.mount.ifAvailable();
  mainButton.mount.ifAvailable();
  secondaryButton.mount.ifAvailable();
  swipeBehavior.mount.ifAvailable();
  // A vertical swipe would close the app mid check-in.
  swipeBehavior.disableVertical.ifAvailable();
  const [mounting, viewportReady] = viewport.mount.ifAvailable();
  if (mounting) void viewportReady.then(() => viewport.expand.ifAvailable());
  miniApp.ready.ifAvailable();
}

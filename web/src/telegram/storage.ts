import { cloudStorage } from "@telegram-apps/sdk-react";

/**
 * How long to wait on Telegram's CloudStorage. It answers over the client
 * bridge, and some clients (Telegram Desktop in particular) sometimes never
 * answer, which would leave the app on its launch screen for good.
 */
const CLOUD_TIMEOUT_MS = 1500;

function local(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Small per-user flags, such as having seen Welcome. Telegram's CloudStorage
 * follows the person across their devices; the plain website keeps them in
 * localStorage. Either can be unavailable or slow, so failures and timeouts
 * fall back to this device's copy.
 */
export async function readFlag(key: string): Promise<string | null> {
  try {
    if (cloudStorage.getItem.isAvailable()) {
      const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), CLOUD_TIMEOUT_MS));
      const value = await Promise.race([cloudStorage.getItem(key), timeout]);
      return value || local(key);
    }
    return local(key);
  } catch {
    return local(key);
  }
}

export async function writeFlag(key: string, value: string): Promise<void> {
  // Always keep a copy on this device, for when CloudStorage doesn't answer.
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: CloudStorage below may still keep it.
  }
  try {
    if (cloudStorage.setItem.isAvailable()) {
      await cloudStorage.setItem(key, value);
    }
  } catch {
    // A flag that didn't save only means seeing the screen once more.
  }
}

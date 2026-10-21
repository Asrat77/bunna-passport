import { cloudStorage } from "@telegram-apps/sdk-react";

/**
 * Small per-user flags, such as having seen Welcome. Telegram's CloudStorage
 * follows the person across their devices; the plain website keeps them in
 * localStorage. Either can be unavailable, so failures read as "not set".
 */
export async function readFlag(key: string): Promise<string | null> {
  try {
    if (cloudStorage.getItem.isAvailable()) {
      const value = await cloudStorage.getItem(key);
      return value || null;
    }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writeFlag(key: string, value: string): Promise<void> {
  try {
    if (cloudStorage.setItem.isAvailable()) {
      await cloudStorage.setItem(key, value);
      return;
    }
    window.localStorage.setItem(key, value);
  } catch {
    // A flag that didn't save only means seeing the screen once more.
  }
}

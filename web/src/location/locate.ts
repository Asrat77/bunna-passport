import { locationManager } from "@telegram-apps/sdk-react";

export type Fix = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  at: number;
};

export type LocateError = "denied" | "unavailable" | "timeout";

export class LocationError extends Error {
  constructor(readonly reason: LocateError) {
    super(reason);
  }
}

/**
 * One fresh position. Telegram's LocationManager (Bot API 8.0) is preferred
 * inside Telegram because webview geolocation is unreliable on some Android
 * builds; the browser API is the fallback everywhere else, and also when
 * Telegram can't supply a position itself (no location on that device, or
 * a client that hasn't finished mounting the manager).
 */
export async function locate(): Promise<Fix> {
  if (await telegramLocationReady()) {
    const fix = await telegramLocate();
    if (fix) return fix;
    if (locationManager.isAccessRequested() && !locationManager.isAccessGranted()) {
      throw new LocationError("denied");
    }
  }
  return browserLocate();
}

// The manager mounts asynchronously at launch, so a tap right after opening
// the app would otherwise skip Telegram and land on the webview's geolocation.
async function telegramLocationReady(): Promise<boolean> {
  if (!locationManager.isSupported()) return false;
  try {
    if (locationManager.isMounting()) {
      await locationManager.mountPromise();
    } else if (!locationManager.isMounted()) {
      const [called, mounting] = locationManager.mount.ifAvailable();
      if (called) await mounting;
    }
  } catch {
    return false;
  }
  return locationManager.isMounted() && locationManager.isAvailable();
}

// Null when Telegram has no position to give; the caller decides what's next.
async function telegramLocate(): Promise<Fix | null> {
  try {
    const data = (await locationManager.requestLocation()) as
      | { latitude: number; longitude: number; horizontal_accuracy?: number | null }
      | null;
    if (!data) return null;
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyMeters: Math.round(data.horizontal_accuracy ?? 999),
      at: Date.now(),
    };
  } catch {
    return null;
  }
}

function browserLocate(): Promise<Fix> {
  if (!("geolocation" in navigator)) return Promise.reject(new LocationError("unavailable"));
  return new Promise<Fix>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
          at: position.timestamp,
        }),
      (error) =>
        reject(
          new LocationError(
            error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
  });
}

/** Lets someone who said no turn location back on. */
export function openLocationSettings(): boolean {
  const [called] = locationManager.openSettings.ifAvailable();
  return called;
}

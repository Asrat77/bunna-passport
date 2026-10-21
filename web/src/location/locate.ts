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
 * builds; the browser API is the fallback everywhere else.
 */
export async function locate(): Promise<Fix> {
  if (locationManager.requestLocation.isAvailable()) {
    const data = (await locationManager.requestLocation()) as
      | { latitude: number; longitude: number; horizontal_accuracy?: number | null }
      | null;
    if (!data) {
      throw new LocationError(locationManager.isAccessGranted() ? "unavailable" : "denied");
    }
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyMeters: Math.round(data.horizontal_accuracy ?? 999),
      at: Date.now(),
    };
  }

  if (!("geolocation" in navigator)) throw new LocationError("unavailable");
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

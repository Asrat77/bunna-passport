import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import type { Coordinate } from "./distance";

/**
 * Server-side verification thresholds, mirrored from app/models/check_in.rb.
 *
 * These exist only to warn the user before a doomed round-trip. The server
 * owns the verdict and never discloses these numbers (docs/SPEC.md §8) — the
 * client must not reimplement the decision.
 */
export const ACCURACY_LIMIT_METERS = 100;
export const DISTANCE_LIMIT_METERS = 250;

export type LocationPermission = "unknown" | "granted" | "denied";

export type Fix = Coordinate & {
  accuracyMeters: number;
  mocked: boolean;
  /**
   * False when the OS granted only approximate location. Requesting high
   * accuracy cannot override that, so every fix comes back coarse and no
   * amount of standing outside will improve it — a different problem from a
   * weak signal, and it needs different advice.
   */
  precise: boolean;
};

/**
 * Android reports whether it granted a fine or coarse fix. iOS exposes no
 * equivalent through the permission scope, so anything that is not a known
 * coarse grant counts as precise — a false "your settings are wrong" is worse
 * than missing the case.
 */
function isPrecise(permission: Location.LocationPermissionResponse): boolean {
  return permission.android?.accuracy !== "coarse";
}

/** Whether the OS is currently willing to give a GPS-grade fix. */
export async function hasPreciseLocation(): Promise<boolean> {
  return isPrecise(await Location.getForegroundPermissionsAsync());
}

export function useLocationPermission() {
  const [permission, setPermission] = useState<LocationPermission>("unknown");

  useEffect(() => {
    let active = true;
    Location.getForegroundPermissionsAsync().then(({ granted, canAskAgain }) => {
      if (!active) return;
      // "Unknown" is reserved for never-asked, so the primer shows once.
      if (granted) setPermission("granted");
      else if (!canAskAgain) setPermission("denied");
    });
    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    const next: LocationPermission = granted ? "granted" : "denied";
    setPermission(next);
    return next;
  }, []);

  return { permission, request };
}

/** One-shot high-accuracy fix. Used by Explore for sorting and by check-in. */
export async function readFix(): Promise<Fix> {
  const [position, precise] = await Promise.all([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    hasPreciseLocation(),
  ]);

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    // Android can report null accuracy; treat unknown as unusable rather than
    // perfect, so the user is warned instead of silently rejected.
    accuracyMeters: Math.round(position.coords.accuracy ?? 999),
    mocked: position.mocked ?? false,
    precise,
  };
}

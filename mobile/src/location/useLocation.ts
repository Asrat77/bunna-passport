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
};

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
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    // Android can report null accuracy; treat unknown as unusable rather than
    // perfect, so the user is warned instead of silently rejected.
    accuracyMeters: Math.round(position.coords.accuracy ?? 999),
    mocked: position.mocked ?? false,
  };
}

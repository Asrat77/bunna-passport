import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { ApiRequestError, NetworkError } from "@/api/errors";
import type { CheckIn, RejectionCode } from "@/api/types";
import { listShops, recordStamp, type CachedShop } from "@/db/shops";
import { distanceMeters } from "@/location/distance";
import { DISTANCE_LIMIT_METERS, readFix, type Fix } from "@/location/useLocation";
import { enqueue } from "./queue";

export type CheckInPhase =
  | { name: "locating" }
  | { name: "no_gps"; message: string }
  | { name: "choosing"; fix: Fix; candidates: CachedShop[] }
  | { name: "submitting"; shop: CachedShop; slow: boolean }
  | { name: "queued"; shop: CachedShop }
  | { name: "success"; shop: CachedShop; result: CheckIn }
  | { name: "rejected"; shop: CachedShop; code: RejectionCode | null; message: string };

const SLOW_AFTER_MS = 2_000;

/**
 * The check-in state machine (docs/DESIGN.md §5.3).
 *
 * The idempotency key is minted once when the flow opens and reused for every
 * attempt, so a retry over a flaky connection returns the original check-in
 * instead of creating a second one.
 */
export function useCheckIn(preselectedShopId?: number) {
  const [phase, setPhase] = useState<CheckInPhase>({ name: "locating" });
  const idempotencyKey = useRef(Crypto.randomUUID());
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locate = useCallback(async () => {
    setPhase({ name: "locating" });
    try {
      const fix = await readFix();
      const shops = await listShops({ origin: fix });
      // The server owns the verdict; this only narrows the visible choices.
      const candidates = shops.filter(
        (shop) => distanceMeters(fix, shop) <= DISTANCE_LIMIT_METERS,
      );

      const preselected = preselectedShopId
        ? shops.find((shop) => shop.id === preselectedShopId)
        : undefined;

      setPhase({
        name: "choosing",
        fix,
        candidates:
          preselected && !candidates.some((shop) => shop.id === preselected.id)
            ? [preselected, ...candidates]
            : candidates,
      });
    } catch (error) {
      setPhase({
        name: "no_gps",
        message: error instanceof Error ? error.message : "Location unavailable",
      });
    }
  }, [preselectedShopId]);

  useEffect(() => {
    void locate();
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, [locate]);

  const submit = useCallback(
    async (shop: CachedShop, fix: Fix, extras: { drink?: string; rating?: number; note?: string } = {}) => {
      setPhase({ name: "submitting", shop, slow: false });
      slowTimer.current = setTimeout(
        () => setPhase((current) => (current.name === "submitting" ? { ...current, slow: true } : current)),
        SLOW_AFTER_MS,
      );

      const input = {
        shop_id: shop.id,
        idempotency_key: idempotencyKey.current,
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy_meters: fix.accuracyMeters,
        mock_location: fix.mocked,
        ...extras,
      };

      try {
        const { data } = await api.checkIn(input);
        if (data.stamp_earned) await recordStamp(shop.id, data.occurred_at);
        setPhase({ name: "success", shop, result: data });
      } catch (error) {
        if (error instanceof NetworkError) {
          // Retry-safe by construction, so accept it now and send it later.
          await enqueue(input);
          setPhase({ name: "queued", shop });
          return;
        }

        if (error instanceof ApiRequestError) {
          setPhase({
            name: "rejected",
            shop,
            code: error.rejectionCode,
            message: error.message,
          });
          return;
        }

        throw error;
      } finally {
        if (slowTimer.current) clearTimeout(slowTimer.current);
      }
    },
    [],
  );

  return { phase, submit, retry: locate };
}

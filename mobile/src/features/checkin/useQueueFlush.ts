import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { flushQueue } from "./queue";

/**
 * Drains queued check-ins when the device comes back online or the app returns
 * to the foreground. Safe to fire repeatedly: each queued attempt carries its
 * original idempotency key, so a replay returns the first check-in rather than
 * creating a second one (docs/SPEC.md §8).
 */
export function useQueueFlush(enabled: boolean): void {
  const running = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const flush = async () => {
      if (running.current) return;
      running.current = true;
      try {
        await flushQueue();
      } catch {
        // Nothing is lost: unsent rows stay queued for the next trigger.
      } finally {
        running.current = false;
      }
    };

    void flush();

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flush();
    });
    const appStateSubscription = AppState.addEventListener("change", (status) => {
      if (status === "active") void flush();
    });

    return () => {
      unsubscribeNet();
      appStateSubscription.remove();
    };
  }, [enabled]);
}

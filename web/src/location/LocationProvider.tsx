import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readFlag, writeFlag } from "@/telegram/storage";
import { LocationError, locate, type Fix, type LocateError } from "./locate";

type Status = "idle" | "locating" | "ready" | LocateError;

type LocationState = {
  fix: Fix | null;
  status: Status;
  /** Asks for a fresh position; resolves with it, or null on failure. */
  refresh: () => Promise<Fix | null>;
};

const LocationContext = createContext<LocationState | null>(null);
const GRANTED_KEY = "bunna.locationGranted";

/**
 * Holds the last known position for sorting lists. Location is only asked
 * for when someone taps something that needs it, or on launch once they've
 * said yes before — never in the background (DESIGN.md, location primer).
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const pending = useRef<Promise<Fix | null> | null>(null);

  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    setStatus("locating");
    pending.current = locate()
      .then((next) => {
        setFix(next);
        setStatus("ready");
        void writeFlag(GRANTED_KEY, "1");
        return next;
      })
      .catch((error: unknown) => {
        setStatus(error instanceof LocationError ? error.reason : "unavailable");
        return null;
      })
      .finally(() => {
        pending.current = null;
      });
    return pending.current;
  }, []);

  useEffect(() => {
    void readFlag(GRANTED_KEY).then((granted) => {
      if (granted) void refresh();
    });
  }, [refresh]);

  const value = useMemo(() => ({ fix, status, refresh }), [fix, status, refresh]);
  return <LocationContext value={value}>{children}</LocationContext>;
}

export function useLocation(): LocationState {
  const location = use(LocationContext);
  if (!location) throw new Error("useLocation must be used inside <LocationProvider>");
  return location;
}

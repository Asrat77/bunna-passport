import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readFlag, writeFlag } from "@/telegram/storage";
import { LocationError, locate } from "./locate";
const LocationContext = createContext(null);
const GRANTED_KEY = "bunna.locationGranted";
/**
 * Holds the last known position for sorting lists. Location is only asked
 * for when someone taps something that needs it, or on launch once they've
 * said yes before — never in the background (DESIGN.md, location primer).
 */
export function LocationProvider({ children }) {
    const [fix, setFix] = useState(null);
    const [status, setStatus] = useState("idle");
    const pending = useRef(null);
    const refresh = useCallback(() => {
        if (pending.current)
            return pending.current;
        setStatus("locating");
        pending.current = locate()
            .then((next) => {
            setFix(next);
            setStatus("ready");
            void writeFlag(GRANTED_KEY, "1");
            return next;
        })
            .catch((error) => {
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
            if (granted)
                void refresh();
        });
    }, [refresh]);
    const value = useMemo(() => ({ fix, status, refresh }), [fix, status, refresh]);
    return _jsx(LocationContext, { value: value, children: children });
}
export function useLocation() {
    const location = use(LocationContext);
    if (!location)
        throw new Error("useLocation must be used inside <LocationProvider>");
    return location;
}

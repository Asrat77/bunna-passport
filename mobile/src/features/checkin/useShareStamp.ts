import * as Sharing from "expo-sharing";
import { useCallback, useRef, useState } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

type State = "idle" | "rendering" | "failed";

/**
 * Turns the off-screen card into a file and hands it to the system.
 *
 * Nothing is posted by this app. The share sheet is the boundary: what happens
 * to the picture after that is the sender's business, and no network request
 * of ours is involved at any point — the card is drawn and captured on the
 * device, so this works with no connection at all.
 */
export function useShareStamp() {
  const cardRef = useRef<View>(null);
  const [state, setState] = useState<State>("idle");

  const share = useCallback(async () => {
    if (state === "rendering") return;
    setState("rendering");
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setState("failed");
        return;
      }
      // Capturing on demand rather than up front: most people never share, and
      // rendering a 1080x1350 bitmap is not free on the phones this targets.
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Bunna Passport",
      });
      setState("idle");
    } catch {
      setState("failed");
    }
  }, [state]);

  return { cardRef, state, share };
}

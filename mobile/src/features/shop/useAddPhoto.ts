import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { api } from "@/api/client";

type State = "idle" | "picking" | "uploading" | "sent" | "failed";

/**
 * Picking and uploading one shop photo.
 *
 * Compressed hard before upload: mobile data in Addis is expensive
 * (docs/SPEC.md §6), and a moderator reviewing the queue does not need a
 * twelve-megapixel original.
 */
export function useAddPhoto(shopId: number) {
  const [state, setState] = useState<State>("idle");

  const addPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setState("failed");
      return;
    }

    setState("picking");
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (picked.canceled || !picked.assets[0]) {
      setState("idle");
      return;
    }

    setState("uploading");
    try {
      await api.submitPhoto(shopId, picked.assets[0].uri);
      setState("sent");
    } catch {
      setState("failed");
    }
  }, [shopId]);

  return { state, addPhoto };
}

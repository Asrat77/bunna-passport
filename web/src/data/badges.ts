import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Badge } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import type { Key } from "@/i18n/context";

/** Every badge with the viewer's progress, for the passport's shelf. */
export function useBadges() {
  const enabled = useAuth().status === "signedIn";
  return useQuery({ queryKey: ["badges"], queryFn: async () => (await api.listBadges()).data, enabled });
}

type Translate = (key: Key, values?: Record<string, string | number>) => string;

/**
 * A badge's name and description in the viewer's language. Definitions live
 * on the server, so a badge the app doesn't know yet keeps the server's
 * English rather than showing a key.
 */
export function badgeText(badge: Pick<Badge, "slug" | "name" | "description">, t: Translate) {
  const name = `badge.${badge.slug}.name` as Key;
  const description = `badge.${badge.slug}.description` as Key;
  const known = (key: Key) => {
    const text = t(key);
    return text && text !== key ? text : null;
  };
  return { name: known(name) ?? badge.name, description: known(description) ?? badge.description };
}

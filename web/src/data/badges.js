import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
/** Every badge with the viewer's progress, for the passport's shelf. */
export function useBadges() {
    const enabled = useAuth().status === "signedIn";
    return useQuery({ queryKey: ["badges"], queryFn: async () => (await api.listBadges()).data, enabled });
}
/**
 * A badge's name and description in the viewer's language. Definitions live
 * on the server, so a badge the app doesn't know yet keeps the server's
 * English rather than showing a key.
 */
export function badgeText(badge, t) {
    const name = `badge.${badge.slug}.name`;
    const description = `badge.${badge.slug}.description`;
    const known = (key) => {
        const text = t(key);
        return text && text !== key ? text : null;
    };
    return { name: known(name) ?? badge.name, description: known(description) ?? badge.description };
}

import { useMemo } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { cleanTraits } from "@/design/doodle/traits";
import { useProfile } from "./queries";
/**
 * The signed-in person's profile picture: their chosen seed, else their
 * Telegram id (handoff, Doodle avatar), the parts they picked in the editor,
 * and whether it's awake yet this coffee day.
 */
export function useMyDoodle() {
    const { telegramId, user } = useAuth();
    const { data: profile } = useProfile();
    const me = profile ?? user;
    const saved = me?.avatar_traits;
    const traits = useMemo(() => cleanTraits(saved), [saved]);
    return {
        seed: me?.avatar_seed ?? telegramId ?? String(me?.id ?? "bunna"),
        traits,
        awake: me?.had_cup_today ?? false,
    };
}
/** Anyone else's profile picture seed on a board. */
export function doodleSeedFor(user) {
    return user.avatar_seed ?? String(user.id);
}
/** Anyone else's chosen parts, with anything unknown left to their seed. */
export function doodleTraitsFor(user) {
    return cleanTraits(user.avatar_traits);
}

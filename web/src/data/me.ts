import { useAuth } from "@/auth/AuthProvider";
import { useProfile } from "./queries";

/**
 * The signed-in person's doodle: their chosen seed, else their Telegram id
 * (handoff, Doodle avatar), and whether it's awake yet this coffee day.
 */
export function useMyDoodle(): { seed: string; awake: boolean } {
  const { telegramId, user } = useAuth();
  const { data: profile } = useProfile();
  const me = profile ?? user;
  return {
    seed: me?.avatar_seed ?? telegramId ?? String(me?.id ?? "bunna"),
    awake: me?.had_cup_today ?? false,
  };
}

/** Anyone else's doodle seed on a board. */
export function doodleSeedFor(user: { id: number; avatar_seed: string | null }): string {
  return user.avatar_seed ?? String(user.id);
}

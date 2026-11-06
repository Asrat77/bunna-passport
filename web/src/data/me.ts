import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { cleanTraits, type AvatarTraits } from "@/design/doodle/traits";
import { useI18n } from "@/i18n/context";
import { useProfile } from "./queries";

/**
 * Tells the server which language the app is showing, so the bot writes to
 * this person in the same one. Runs whenever the two differ.
 */
export function useSyncBotLanguage() {
  const { language } = useI18n();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const signedIn = profile != null;
  const saved = profile?.language;

  useEffect(() => {
    if (!signedIn || saved === language) return;
    api
      .updateProfile({ language })
      .then(({ data }) => queryClient.setQueryData(["profile"], data))
      .catch(() => {
        // Not worth bothering anyone over: the bot keeps its last language.
      });
  }, [signedIn, saved, language, queryClient]);
}

/**
 * The signed-in person's profile picture: their chosen seed, else their
 * Telegram id (handoff, Doodle avatar), the parts they picked in the editor,
 * and whether it's awake yet this coffee day.
 */
export function useMyDoodle(): { seed: string; traits: Partial<AvatarTraits>; awake: boolean } {
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
export function doodleSeedFor(user: { id: number; avatar_seed: string | null }): string {
  return user.avatar_seed ?? String(user.id);
}

/** Anyone else's chosen parts, with anything unknown left to their seed. */
export function doodleTraitsFor(user: { avatar_traits?: Partial<AvatarTraits> | null }): Partial<AvatarTraits> {
  return cleanTraits(user.avatar_traits);
}

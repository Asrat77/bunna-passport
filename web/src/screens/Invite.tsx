import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import type { InvitePreview } from "@/api/types";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction, SecondaryAction } from "@/telegram/buttons";
import { rememberInviter } from "@/lib/invite";
import { hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { FriendDoodle } from "./stats/FriendsSection";
import { showFriendsNext } from "./Stats";
import "./invite.css";

/**
 * Opened from someone's invite link. Shows who sent it and asks before
 * making the two of you friends, since friends see each other's visits.
 * Someone who hasn't checked in anywhere yet also gets a short note on
 * what the app is, since the link may be how they first heard of it, and
 * after saying yes lands on Explore's first-stamp guide instead of the
 * friends list, which would be empty of anything of theirs.
 */
export function Invite({ token }: { token: string }) {
  const { t } = useI18n();
  const { back, canGoBack, switchTab } = useNavigation();
  const queryClient = useQueryClient();
  const preview = useQuery({
    queryKey: ["invitePreview", token],
    queryFn: async () => (await api.previewInvite(token)).data,
    retry: (count, error) => count < 2 && !(error instanceof ApiRequestError),
  });
  const seeFriends = () => {
    showFriendsNext();
    switchTab("stats");
  };
  const leave = () => (canGoBack ? back() : switchTab("explore"));
  const accept = useMutation({
    mutationFn: async () => (await api.acceptInvite(token)).data,
    onSuccess: async () => {
      hapticSuccess();
      for (const key of ["friends", "feed", "leaderboard", "invite"]) void queryClient.invalidateQueries({ queryKey: [key] });
      const preview = queryClient.getQueryData<InvitePreview>(["invitePreview", token]);
      if (preview?.new_here) {
        await rememberInviter(preview.inviter.handle);
        switchTab("explore");
      } else {
        seeFriends();
      }
    },
  });

  const data = preview.data;
  const inviter = data?.inviter;
  const gone = preview.error instanceof ApiRequestError && preview.error.status === 404;

  return (
    <main className="screen screen--glow invite">
      <BackControl onBack={leave} label={t("common.back")} />
      <Headline first={t("invite.title")} second={t("invite.titleB")} />

      {preview.isPending ? (
        <div className="skeleton" style={{ height: 220 }} aria-busy="true" />
      ) : !data || !inviter ? (
        <p className="notice notice--caution">
          {gone ? t("invite.gone") : t("common.somethingWrong")}{" "}
          {gone ? null : (
            <button type="button" className="link-button" onClick={() => void preview.refetch()}>
              {t("common.retry")}
            </button>
          )}
        </p>
      ) : (
        <div className="card invite__card">
          <FriendDoodle friend={inviter} size={112} />
          <p className="invite__from">
            {data.own
              ? t("invite.own")
              : data.already_friends
                ? t("invite.already", { handle: inviter.handle })
                : t(data.new_here ? "invite.fromNew" : "invite.from", { handle: inviter.handle })}
          </p>
          {data.own || data.already_friends ? null : <p className="invite__body muted">{t("invite.body")}</p>}
        </div>
      )}

      {data && inviter && data.new_here && !data.own && !data.already_friends ? (
        <section className="card invite__about" aria-labelledby="invite-about-title">
          <h2 id="invite-about-title" className="invite__about-title">
            {t("invite.aboutTitle")}
          </h2>
          <ul className="invite__about-list">
            <li>{t("invite.about1")}</li>
            <li>{t("invite.about2")}</li>
            <li>{t("invite.about3")}</li>
          </ul>
        </section>
      ) : null}

      {accept.isError ? <p className="notice notice--caution">{t("common.somethingWrong")}</p> : null}

      {data && inviter && !data.own && !data.already_friends ? (
        <>
          <SecondaryAction text={t("invite.notNow")} onClick={leave} />
          <PrimaryAction text={t("invite.accept", { handle: inviter.handle })} loading={accept.isPending} onClick={() => accept.mutate()} />
        </>
      ) : data?.already_friends ? (
        <PrimaryAction text={t("invite.seeFriends")} onClick={seeFriends} />
      ) : (
        <PrimaryAction text={t("common.back")} onClick={leave} disabled={preview.isPending} />
      )}
    </main>
  );
}

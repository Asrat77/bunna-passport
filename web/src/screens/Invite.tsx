import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import { useI18n } from "@/i18n/context";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction, SecondaryAction } from "@/telegram/buttons";
import { hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { FriendDoodle } from "./stats/FriendsSection";
import { showFriendsNext } from "./Stats";
import "./invite.css";

/**
 * Opened from someone's invite link. Shows who sent it and asks before
 * making the two of you friends, since friends see each other's visits.
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
    onSuccess: () => {
      hapticSuccess();
      for (const key of ["friends", "feed", "leaderboard", "invite"]) void queryClient.invalidateQueries({ queryKey: [key] });
      seeFriends();
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
                : t("invite.from", { handle: inviter.handle })}
          </p>
          {data.own || data.already_friends ? null : <p className="invite__body muted">{t("invite.body")}</p>}
        </div>
      )}

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

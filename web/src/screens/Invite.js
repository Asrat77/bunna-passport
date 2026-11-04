import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
export function Invite({ token }) {
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
            for (const key of ["friends", "feed", "leaderboard", "invite"])
                void queryClient.invalidateQueries({ queryKey: [key] });
            seeFriends();
        },
    });
    const data = preview.data;
    const inviter = data?.inviter;
    const gone = preview.error instanceof ApiRequestError && preview.error.status === 404;
    return (_jsxs("main", { className: "screen screen--glow invite", children: [_jsx(BackControl, { onBack: leave, label: t("common.back") }), _jsx(Headline, { first: t("invite.title"), second: t("invite.titleB") }), preview.isPending ? (_jsx("div", { className: "skeleton", style: { height: 220 }, "aria-busy": "true" })) : !data || !inviter ? (_jsxs("p", { className: "notice notice--caution", children: [gone ? t("invite.gone") : t("common.somethingWrong"), " ", gone ? null : (_jsx("button", { type: "button", className: "link-button", onClick: () => void preview.refetch(), children: t("common.retry") }))] })) : (_jsxs("div", { className: "card invite__card", children: [_jsx(FriendDoodle, { friend: inviter, size: 112 }), _jsx("p", { className: "invite__from", children: data.own
                            ? t("invite.own")
                            : data.already_friends
                                ? t("invite.already", { handle: inviter.handle })
                                : t("invite.from", { handle: inviter.handle }) }), data.own || data.already_friends ? null : _jsx("p", { className: "invite__body muted", children: t("invite.body") })] })), accept.isError ? _jsx("p", { className: "notice notice--caution", children: t("common.somethingWrong") }) : null, data && inviter && !data.own && !data.already_friends ? (_jsxs(_Fragment, { children: [_jsx(SecondaryAction, { text: t("invite.notNow"), onClick: leave }), _jsx(PrimaryAction, { text: t("invite.accept", { handle: inviter.handle }), loading: accept.isPending, onClick: () => accept.mutate() })] })) : data?.already_friends ? (_jsx(PrimaryAction, { text: t("invite.seeFriends"), onClick: seeFriends })) : (_jsx(PrimaryAction, { text: t("common.back"), onClick: leave, disabled: preview.isPending }))] }));
}

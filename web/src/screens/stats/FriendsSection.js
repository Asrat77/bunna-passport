import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { phArrowClockwise, phUserPlus } from "@/ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/api/client";
import { doodleSeedFor, doodleTraitsFor } from "@/data/me";
import { useFeed, useFriends, useInvite, usePassport } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { addisCoffeeDay, shiftDay } from "@/lib/coffeeDay";
import { shareInviteLink } from "@/lib/invite";
import { useNavigation } from "@/nav/Navigation";
import { hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./friends.css";
/**
 * Coffee friends: an invite that rides on your latest share card, the last
 * month of friends' visits by day, and the people you're friends with.
 */
export function FriendsSection() {
    const { t } = useI18n();
    const friends = useFriends();
    const feed = useFeed();
    const list = friends.data ?? [];
    const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);
    return (_jsxs(_Fragment, { children: [_jsx(Headline, { first: t("friends.title"), second: t("friends.titleB"), size: 32 }), _jsx(InviteCard, {}), friends.isError ? (_jsxs("div", { className: "notice notice--caution", children: [t("friends.loadFailed"), " ", _jsx("button", { type: "button", className: "link-button", onClick: () => void friends.refetch(), children: t("common.retry") })] })) : friends.isPending ? (_jsx("div", { className: "skeleton", style: { height: 180 } })) : list.length === 0 ? (_jsx("p", { className: "notice", children: t("friends.noFriends") })) : (_jsxs(_Fragment, { children: [_jsxs("section", { className: "friends-feed", "aria-labelledby": "friends-feed-title", children: [_jsx("h2", { id: "friends-feed-title", className: "section-title", children: t("friends.feed") }), feed.isPending ? (_jsx("div", { className: "skeleton", style: { height: 140 } })) : items.length === 0 ? (_jsx("p", { className: "notice", children: t("friends.feedEmpty") })) : (_jsx(FeedDays, { items: items })), feed.hasNextPage ? (_jsx("button", { type: "button", className: "pill-button friends-feed__more", disabled: feed.isFetchingNextPage, onClick: () => void feed.fetchNextPage(), children: t("friends.more") })) : null] }), _jsx(FriendList, { friends: list }), _jsx("p", { className: "boards__footnote", children: t("friends.footnote") })] }))] }));
}
/**
 * Inviting is sharing: with a stamp, the share card screen sends it with your
 * invite on its button. Without one yet, just the link.
 */
function InviteCard() {
    const { t } = useI18n();
    const { push } = useNavigation();
    const queryClient = useQueryClient();
    const { data: passport } = usePassport();
    const invite = useInvite();
    const [note, setNote] = useState(null);
    const latest = passport?.stamps[0];
    const rotate = useMutation({
        mutationFn: async () => (await api.rotateInvite()).data,
        onSuccess: (data) => {
            queryClient.setQueryData(["invite"], data);
            setNote(t("friends.newLinkDone"));
        },
    });
    async function sendLink() {
        if (!invite.data)
            return;
        const result = await shareInviteLink(invite.data.url, t("friends.inviteText"));
        if (result)
            hapticSuccess();
        setNote(result === "copied" ? t("friends.copied") : null);
    }
    return (_jsxs("section", { className: "card invite-card", "aria-labelledby": "invite-card-title", children: [_jsxs("h2", { id: "invite-card-title", className: "invite-card__title", children: [_jsx(Icon, { path: phUserPlus, size: 20 }), t("friends.inviteTitle")] }), _jsx("p", { className: "invite-card__body muted", children: t(latest ? "friends.inviteBody" : "friends.inviteBodyNoStamp") }), _jsxs("div", { className: "invite-card__actions", children: [latest ? (_jsx("button", { type: "button", className: "action action--primary invite-card__action", onClick: () => push({ name: "share", target: { shopId: latest.shop.id }, shopName: latest.shop.name }), children: t("friends.inviteWithStamp") })) : null, _jsx("button", { type: "button", className: `action ${latest ? "action--secondary" : "action--primary"} invite-card__action`, disabled: !invite.data, onClick: () => void sendLink(), children: t("friends.inviteLink") })] }), _jsxs("div", { className: "invite-card__foot", children: [note ? _jsx("span", { className: "invite-card__note", role: "status", children: note }) : _jsx("span", {}), _jsxs("button", { type: "button", className: "link-button invite-card__rotate", disabled: rotate.isPending, onClick: () => rotate.mutate(), children: [_jsx(Icon, { path: phArrowClockwise, size: 16 }), t("friends.newLink")] })] })] }));
}
/** Day labels from the coffee day the server sends, in Addis time. */
function useDayLabel() {
    const { t, language } = useI18n();
    return (day) => {
        const today = addisCoffeeDay(new Date());
        if (day === today)
            return t("friends.today");
        if (day === shiftDay(today, -1))
            return t("friends.yesterday");
        return new Date(`${day}T12:00:00Z`).toLocaleDateString(language === "am" ? "am-ET" : "en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        });
    };
}
function FeedDays({ items }) {
    const label = useDayLabel();
    const days = useMemo(() => {
        const groups = [];
        for (const item of items) {
            const last = groups[groups.length - 1];
            if (last?.day === item.coffee_day)
                last.items.push(item);
            else
                groups.push({ day: item.coffee_day, items: [item] });
        }
        return groups;
    }, [items]);
    return (_jsx(_Fragment, { children: days.map((group) => (_jsxs("div", { className: "feed-day", children: [_jsx("h3", { className: "feed-day__label eyebrow", children: label(group.day) }), _jsx("ul", { className: "card feed-rows", children: group.items.map((item) => (_jsx(FeedRow, { item: item }, item.id))) })] }, group.day))) }));
}
function FeedRow({ item }) {
    const { t, language } = useI18n();
    const { push } = useNavigation();
    const shop = language === "am" ? item.shop.name_am : item.shop.name;
    const area = language === "am" ? item.shop.neighborhood.name_am : item.shop.neighborhood.name;
    const extras = [item.drink, item.rating ? "★".repeat(item.rating) : null].filter(Boolean).join(" · ");
    return (_jsx("li", { children: _jsxs("button", { type: "button", className: "feed-row", onClick: () => push({ name: "shop", id: item.shop.id }), children: [_jsx(FriendDoodle, { friend: item.user, size: 40 }), _jsxs("span", { className: "feed-row__text", children: [_jsxs("span", { className: "feed-row__line", children: [_jsxs("strong", { children: ["@", item.user.handle] }), " ", t(item.stamp_earned ? "friends.stamped" : "friends.visited", { shop })] }), _jsxs("span", { className: "feed-row__meta muted", children: [area, extras ? ` · ${extras}` : ""] }), item.note ? _jsxs("span", { className: "feed-row__note", children: ["\u201C", item.note, "\u201D"] }) : null] }), item.stamp_earned ? _jsx("span", { className: "feed-row__badge mono", children: t(`level.${item.stamp_level ?? "bronze"}`) }) : null] }) }));
}
function FriendList({ friends }) {
    const { t } = useI18n();
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState(null);
    const remove = useMutation({
        mutationFn: (id) => api.removeFriend(id),
        onSuccess: (_data, id) => {
            queryClient.setQueryData(["friends"], (current) => current?.filter((friend) => friend.id !== id));
            void queryClient.invalidateQueries({ queryKey: ["feed"] });
            void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
            setConfirming(null);
        },
    });
    return (_jsxs("section", { className: "friend-list", "aria-labelledby": "friend-list-title", children: [_jsx("h2", { id: "friend-list-title", className: "section-title", children: t("friends.list", { count: friends.length }) }), _jsx("ul", { className: "card board-rows", children: friends.map((friend) => (_jsxs("li", { className: "board-row", children: [_jsx(FriendDoodle, { friend: friend, size: 36 }), _jsxs("span", { className: "board-row__who", children: [_jsxs("span", { className: "board-row__handle", children: ["@", friend.handle] }), _jsx("span", { className: "board-row__note", children: confirming === friend.id
                                        ? t("friends.removeConfirm", { handle: friend.handle })
                                        : `${cupNote(friend, t)} · ${t("friends.stamps", { count: friend.stamps_count })}` })] }), confirming === friend.id ? (_jsxs("span", { className: "friend-list__confirm", children: [_jsx("button", { type: "button", className: "pill-button", onClick: () => setConfirming(null), children: t("friends.keep") }), _jsx("button", { type: "button", className: "pill-button pill-button--danger", disabled: remove.isPending, onClick: () => remove.mutate(friend.id), children: t("friends.removeYes") })] })) : (_jsx("button", { type: "button", className: "link-button friend-list__remove", "aria-label": t("friends.removeLabel", { handle: friend.handle }), onClick: () => setConfirming(friend.id), children: t("friends.remove") }))] }, friend.id))) })] }));
}
function cupNote(friend, t) {
    if (friend.had_cup_today === null)
        return t("boards.private");
    return friend.had_cup_today ? t("boards.hadCup") : t("boards.noCupYet");
}
export function FriendDoodle({ friend, size }) {
    const { t } = useI18n();
    const handle = `@${friend.handle}`;
    const awake = friend.had_cup_today === true;
    const label = friend.had_cup_today === null ? t("doodle.other", { handle }) : t(awake ? "doodle.otherAwake" : "doodle.otherSleepy", { handle });
    return _jsx(Doodle, { seed: doodleSeedFor(friend), traits: doodleTraitsFor(friend), mood: awake ? "awake" : "sleepy", size: size, label: label });
}

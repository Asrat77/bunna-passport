import { phArrowClockwise, phUserPlus } from "@/ui/icons";
import { type InfiniteData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/api/client";
import { REACTION_KINDS, type FeedItem, type Friend, type ReactionKind, type Reactions, type ReceivedReaction } from "@/api/types";
import { doodleSeedFor, doodleTraitsFor } from "@/data/me";
import { guessReactions } from "@/data/reactions";
import { drinkLabel } from "@/data/reviews";
import { useFeed, useFriends, useInvite, usePassport, useReceivedReactions } from "@/data/queries";
import { Doodle } from "@/design/doodle/Doodle";
import { useI18n } from "@/i18n/context";
import { addisCoffeeDay, shiftDay } from "@/lib/coffeeDay";
import { shareInviteLink } from "@/lib/invite";
import { useNavigation } from "@/nav/Navigation";
import { hapticSelection, hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./friends.css";

type T = ReturnType<typeof useI18n>["t"];

export const REACTION_EMOJI: Record<ReactionKind, string> = { coffee: "☕", heart: "❤️", fire: "🔥", clap: "👏" };
type FeedPages = InfiniteData<{ items: FeedItem[]; nextCursor?: number }>;

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

  return (
    <>
      <Headline first={t("friends.title")} second={t("friends.titleB")} size={32} />
      <InviteCard />

      {friends.isError ? (
        <div className="notice notice--caution">
          {t("friends.loadFailed")}{" "}
          <button type="button" className="link-button" onClick={() => void friends.refetch()}>
            {t("common.retry")}
          </button>
        </div>
      ) : friends.isPending ? (
        <div className="skeleton" style={{ height: 180 }} />
      ) : list.length === 0 ? (
        <p className="notice">{t("friends.noFriends")}</p>
      ) : (
        <>
          <ReceivedReactions />
          <section className="friends-feed" aria-labelledby="friends-feed-title">
            <h2 id="friends-feed-title" className="section-title">
              {t("friends.feed")}
            </h2>
            {feed.isPending ? (
              <div className="skeleton" style={{ height: 140 }} />
            ) : items.length === 0 ? (
              <p className="notice">{t("friends.feedEmpty")}</p>
            ) : (
              <FeedDays items={items} />
            )}
            {feed.hasNextPage ? (
              <button type="button" className="pill-button friends-feed__more" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
                {t("friends.more")}
              </button>
            ) : null}
          </section>

          <FriendList friends={list} />
          <p className="boards__footnote">{t("friends.footnote")}</p>
        </>
      )}
    </>
  );
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
  const inviteText = t("friends.inviteText");
  const inviteButton = t("friends.inviteButton");
  // Made ahead of the tap, like share cards, so the share sheet opens at once.
  // A prepared message carries a native "Open" button; without one the link
  // goes in the text instead.
  const prepared = useQuery({
    queryKey: ["inviteMessage", invite.data?.token, inviteText, inviteButton],
    queryFn: async () => (await api.prepareInviteMessage(inviteText, inviteButton)).data.prepared_message_id,
    enabled: Boolean(invite.data),
    staleTime: 30 * 60_000,
    retry: false,
  });
  const [note, setNote] = useState<string | null>(null);
  const latest = passport?.stamps[0];

  const rotate = useMutation({
    mutationFn: async () => (await api.rotateInvite()).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["invite"], data);
      setNote(t("friends.newLinkDone"));
    },
  });

  async function sendLink() {
    if (!invite.data) return;
    const result = await shareInviteLink(invite.data.url, inviteText, prepared.data ?? null);
    if (result) hapticSuccess();
    setNote(result === "copied" ? t("friends.copied") : null);
  }

  return (
    <section className="card invite-card" aria-labelledby="invite-card-title">
      <h2 id="invite-card-title" className="invite-card__title">
        <Icon path={phUserPlus} size={20} />
        {t("friends.inviteTitle")}
      </h2>
      <p className="invite-card__body muted">{t(latest ? "friends.inviteBody" : "friends.inviteBodyNoStamp")}</p>
      <div className="invite-card__actions">
        {latest ? (
          <button
            type="button"
            className="action action--primary invite-card__action"
            onClick={() => push({ name: "share", target: { shopId: latest.shop.id }, shopName: latest.shop.name })}
          >
            {t("friends.inviteWithStamp")}
          </button>
        ) : null}
        <button
          type="button"
          className={`action ${latest ? "action--secondary" : "action--primary"} invite-card__action`}
          disabled={!invite.data}
          onClick={() => void sendLink()}
        >
          {t("friends.inviteLink")}
        </button>
      </div>
      <div className="invite-card__foot">
        {note ? <span className="invite-card__note" role="status">{note}</span> : <span />}
        <button type="button" className="link-button invite-card__rotate" disabled={rotate.isPending} onClick={() => rotate.mutate()}>
          <Icon path={phArrowClockwise} size={16} />
          {t("friends.newLink")}
        </button>
      </div>
    </section>
  );
}

/** Day labels from the coffee day the server sends, in Addis time. */
function useDayLabel() {
  const { t, language } = useI18n();
  return (day: string) => {
    const today = addisCoffeeDay(new Date());
    if (day === today) return t("friends.today");
    if (day === shiftDay(today, -1)) return t("friends.yesterday");
    return new Date(`${day}T12:00:00Z`).toLocaleDateString(language === "am" ? "am-ET" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };
}

function FeedDays({ items }: { items: FeedItem[] }) {
  const label = useDayLabel();
  const days = useMemo(() => {
    const groups: { day: string; items: FeedItem[] }[] = [];
    for (const item of items) {
      const last = groups[groups.length - 1];
      if (last?.day === item.coffee_day) last.items.push(item);
      else groups.push({ day: item.coffee_day, items: [item] });
    }
    return groups;
  }, [items]);

  return (
    <>
      {days.map((group) => (
        <div key={group.day} className="feed-day">
          <h3 className="feed-day__label eyebrow">{label(group.day)}</h3>
          <ul className="card feed-rows">
            {group.items.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const { t, language } = useI18n();
  const { push } = useNavigation();
  const shop = language === "am" ? item.shop.name_am : item.shop.name;
  const area = language === "am" ? item.shop.neighborhood.name_am : item.shop.neighborhood.name;
  const extras = [item.drink ? drinkLabel(item.drink, t) : null, item.rating ? "★".repeat(item.rating) : null].filter(Boolean).join(" · ");

  return (
    <li className="feed-item">
      <button type="button" className="feed-row" onClick={() => push({ name: "shop", id: item.shop.id })}>
        <FriendDoodle friend={item.user} size={40} />
        <span className="feed-row__text">
          <span className="feed-row__line">
            <strong>@{item.user.handle}</strong> {t(item.stamp_earned ? "friends.stamped" : "friends.visited", { shop })}
          </span>
          <span className="feed-row__meta muted">
            {area}
            {extras ? ` · ${extras}` : ""}
          </span>
          {item.note ? <span className="feed-row__note">“{item.note}”</span> : null}
        </span>
        {item.stamp_earned ? <span className="feed-row__badge mono">{t(`level.${item.stamp_level ?? "bronze"}`)}</span> : null}
      </button>
      <ReactionBar item={item} />
    </li>
  );
}

/**
 * One reaction per visit: tap a kind to set it, tap yours again to take it
 * back. The feed updates at once and settles on what the server says.
 */
function ReactionBar({ item }: { item: FeedItem }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const react = useMutation({
    mutationFn: async (kind: ReactionKind | null) => (await api.reactToFeedItem(item.id, kind)).data,
    onMutate: (kind) => {
      const previous = item.reactions;
      setReactions(queryClient, item.id, guessReactions(previous, kind));
      return { previous };
    },
    onError: (_error, _kind, context) => {
      if (context) setReactions(queryClient, item.id, context.previous);
    },
    onSuccess: (reactions) => setReactions(queryClient, item.id, reactions),
  });
  const counts = new Map(item.reactions.counts.map((row) => [row.kind, row.count]));

  return (
    <div className="reaction-bar" role="group" aria-label={t("friends.reactLabel", { handle: item.user.handle })}>
      {REACTION_KINDS.map((kind) => {
        const mine = item.reactions.mine === kind;
        const count = counts.get(kind) ?? 0;
        return (
          <button
            key={kind}
            type="button"
            className="reaction-chip"
            aria-pressed={mine}
            aria-label={t(`reaction.${kind}`)}
            disabled={react.isPending}
            onClick={() => {
              hapticSelection();
              react.mutate(mine ? null : kind);
            }}
          >
            <span aria-hidden="true">{REACTION_EMOJI[kind]}</span>
            {count > 0 ? <span className="reaction-chip__count mono">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function setReactions(queryClient: ReturnType<typeof useQueryClient>, id: FeedItem["id"], reactions: Reactions) {
  queryClient.setQueryData<FeedPages>(["feed"], (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((entry) => (entry.id === id ? { ...entry, reactions } : entry)),
          })),
        }
      : data,
  );
}

/** Friends' reactions to your own visits, newest first. */
function ReceivedReactions() {
  const { t, language } = useI18n();
  const received = useReceivedReactions();
  const [expanded, setExpanded] = useState(false);
  const list = received.data ?? [];
  if (list.length === 0) return null;
  const shown = expanded ? list : list.slice(0, 3);

  return (
    <section className="friends-reactions" aria-labelledby="friends-reactions-title">
      <h2 id="friends-reactions-title" className="section-title">
        {t("friends.reactionsTitle")}
      </h2>
      <ul className="card feed-rows">
        {shown.map((reaction: ReceivedReaction) => (
          <li key={reaction.id} className="feed-row feed-row--static">
            <FriendDoodle friend={reaction.user} size={32} />
            <span className="feed-row__text">
              <span className="feed-row__line">
                <strong>@{reaction.user.handle}</strong>{" "}
                {t("friends.reactedTo", {
                  emoji: REACTION_EMOJI[reaction.kind],
                  shop: language === "am" ? reaction.check_in.shop.name_am : reaction.check_in.shop.name,
                })}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {list.length > shown.length ? (
        <button type="button" className="pill-button friends-feed__more" onClick={() => setExpanded(true)}>
          {t("friends.more")}
        </button>
      ) : null}
    </section>
  );
}

function FriendList({ friends }: { friends: Friend[] }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<number | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => api.removeFriend(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Friend[]>(["friends"], (current) => current?.filter((friend) => friend.id !== id));
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      setConfirming(null);
    },
  });

  return (
    <section className="friend-list" aria-labelledby="friend-list-title">
      <h2 id="friend-list-title" className="section-title">
        {t("friends.list", { count: friends.length })}
      </h2>
      <ul className="card board-rows">
        {friends.map((friend) => (
          <li key={friend.id} className="board-row">
            <FriendDoodle friend={friend} size={36} />
            <span className="board-row__who">
              <span className="board-row__handle">@{friend.handle}</span>
              <span className="board-row__note">
                {confirming === friend.id
                  ? t("friends.removeConfirm", { handle: friend.handle })
                  : `${cupNote(friend, t)} · ${t("friends.stamps", { count: friend.stamps_count })}`}
              </span>
            </span>
            {confirming === friend.id ? (
              <span className="friend-list__confirm">
                <button type="button" className="pill-button" onClick={() => setConfirming(null)}>
                  {t("friends.keep")}
                </button>
                <button type="button" className="pill-button pill-button--danger" disabled={remove.isPending} onClick={() => remove.mutate(friend.id)}>
                  {t("friends.removeYes")}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="link-button friend-list__remove"
                aria-label={t("friends.removeLabel", { handle: friend.handle })}
                onClick={() => setConfirming(friend.id)}
              >
                {t("friends.remove")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function cupNote(friend: Friend, t: T): string {
  if (friend.had_cup_today === null) return t("boards.private");
  return friend.had_cup_today ? t("boards.hadCup") : t("boards.noCupYet");
}

export function FriendDoodle({ friend, size }: { friend: Friend; size: number }) {
  const { t } = useI18n();
  const handle = `@${friend.handle}`;
  const awake = friend.had_cup_today === true;
  const label =
    friend.had_cup_today === null ? t("doodle.other", { handle }) : t(awake ? "doodle.otherAwake" : "doodle.otherSleepy", { handle });
  return <Doodle seed={doodleSeedFor(friend)} traits={doodleTraitsFor(friend)} mood={awake ? "awake" : "sleepy"} size={size} label={label} />;
}

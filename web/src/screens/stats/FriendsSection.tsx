import { mdiAccountPlus, mdiRefresh } from "@mdi/js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/api/client";
import type { FeedItem, Friend } from "@/api/types";
import { doodleSeedFor } from "@/data/me";
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

type T = ReturnType<typeof useI18n>["t"];

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
    const result = await shareInviteLink(invite.data.url, t("friends.inviteText"));
    if (result) hapticSuccess();
    setNote(result === "copied" ? t("friends.copied") : null);
  }

  return (
    <section className="card invite-card" aria-labelledby="invite-card-title">
      <h2 id="invite-card-title" className="invite-card__title">
        <Icon path={mdiAccountPlus} size={20} />
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
          <Icon path={mdiRefresh} size={16} />
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
  const extras = [item.drink, item.rating ? "★".repeat(item.rating) : null].filter(Boolean).join(" · ");

  return (
    <li>
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
    </li>
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
  return <Doodle seed={doodleSeedFor(friend)} mood={awake ? "awake" : "sleepy"} size={size} label={label} />;
}

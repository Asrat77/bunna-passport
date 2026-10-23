import { mdiDownload } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type ShareTarget } from "@/api/client";
import { useI18n } from "@/i18n/context";
import { canShareStory, saveStoryCard, shareCardToChat, shareCardToStory } from "@/lib/share";
import { useNavigation } from "@/nav/Navigation";
import { BackControl, PrimaryAction } from "@/telegram/buttons";
import { hapticSuccess } from "@/telegram/haptics";
import { Headline } from "@/ui/Headline";
import { Icon } from "@/ui/Icon";
import "./sharecard.css";

/**
 * Previews the stamp's share card and sends it on: to a Telegram chat as a
 * photo, to a Telegram story, or saved to the phone for Instagram and TikTok.
 * The server draws the cards (app/models/share_card.rb).
 */
export function ShareCard({ target, shopName }: { target: ShareTarget; shopName: string }) {
  const { t } = useI18n();
  const { back } = useNavigation();
  const [hideDoodle, setHideDoodle] = useState(false);
  const caption = t("share.caption", { shop: shopName });
  const cards = useQuery({
    queryKey: ["shareCards", target, !hideDoodle, caption],
    queryFn: async () => (await api.createShareCards(target, { doodle: !hideDoodle, caption })).data,
    // A prepared Telegram message lasts a while; the image URLs don't change.
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const card = cards.data;
  const done = (shared: boolean) => {
    if (shared) hapticSuccess();
  };

  return (
    <main className="screen share-card">
      <BackControl onBack={back} label={t("common.back")} />
      <Headline first={t("share.title")} second={t("share.titleB")} />

      <figure className="share-card__preview card">
        {card ? (
          <img src={card.post_url} alt={t("share.preview", { shop: shopName })} width={1080} height={1350} />
        ) : cards.isError ? (
          <figcaption className="share-card__failed">
            {t("share.failed")}{" "}
            <button type="button" className="link-button" onClick={() => void cards.refetch()}>
              {t("common.retry")}
            </button>
          </figcaption>
        ) : (
          <div className="skeleton share-card__skeleton" aria-busy="true" />
        )}
      </figure>

      <label className="share-card__toggle">
        <span className="share-card__toggle-text">
          {t("share.hideDoodle")}
          <span className="muted">{t("share.hideDoodleHint")}</span>
        </span>
        <input type="checkbox" role="switch" checked={hideDoodle} onChange={(event) => setHideDoodle(event.target.checked)} />
      </label>

      <div className="share-card__more">
        {canShareStory() ? (
          <button type="button" className="action action--secondary" disabled={!card} onClick={() => card && done(shareCardToStory(card.story_url, caption))}>
            {t("share.toStory")}
          </button>
        ) : null}
        <button type="button" className="action action--secondary" disabled={!card} onClick={() => card && void saveStoryCard(card.story_url).then(done)}>
          <Icon path={mdiDownload} size={20} />
          {t("share.save")}
        </button>
        <p className="share-card__hint muted">{t("share.saveHint")}</p>
        <p className="share-card__hint muted">{t("share.invites")}</p>
      </div>

      <PrimaryAction
        text={t("share.toChat")}
        disabled={!card}
        loading={cards.isFetching}
        onClick={() => {
          if (!card) return;
          void shareCardToChat(
            { postUrl: card.post_url, preparedMessageId: card.prepared_message_id, inviteUrl: card.invite_url },
            caption,
          ).then(done);
        }}
      />
    </main>
  );
}

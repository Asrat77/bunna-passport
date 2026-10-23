class Api::V1::ShareCardsController < Api::V1::BaseController
  CAPTION_LIMIT = 300

  # Rendering takes a second or two, so keep a tap-happy client in check.
  rate_limit to: 30, within: 1.hour

  # Renders (or reuses) the post and story cards for one of the caller's own
  # verified check-ins and returns where to fetch them. Telegram needs these
  # public URLs for shareMessage and shareToStory, and phones save the story
  # card for Instagram and TikTok.
  #
  # From a shop rather than a check-in, it shares the visit that earned the
  # caller's stamp there.
  def create
    check_in = find_check_in

    unless check_in.verified?
      return render_error(:unprocessable_entity, "check_in_not_verified", "Only a verified check-in has a stamp to share.")
    end

    doodle = ActiveModel::Type::Boolean.new.cast(params.fetch(:doodle, true))
    images = ShareCard::FORMATS.keys.index_with { |format| ShareImage.for!(check_in, format: format, doodle: doodle) }
    post_url = card_url(images.fetch("post"))

    render_data({
      check_in_id: check_in.id,
      doodle: doodle,
      post_url: post_url,
      story_url: card_url(images.fetch("story")),
      prepared_message_id: prepare_message(images.fetch("post"), post_url)
    })
  end

  private
    def find_check_in
      if params[:shop_id]
        Current.user.check_ins.verified.where(shop_id: params[:shop_id]).order(:occurred_at, :id).first!
      else
        Current.user.check_ins.find(params[:check_in_id])
      end
    end

    # PUBLIC_BASE_URL is the address Telegram and phones can reach. Behind the
    # development proxy the request's own host is localhost, which they can't.
    def card_url(image)
      base = ENV["PUBLIC_BASE_URL"].presence
      return share_image_url(image.token, format: :png) unless base

      uri = URI(base)
      share_image_url(image.token, format: :png, protocol: uri.scheme, host: uri.host, port: uri.port)
    end

    # A photo message with the post card that the Mini App hands to
    # shareMessage, so friends get the image itself rather than a link. Only
    # for Telegram accounts; without it the app falls back to a share link.
    def prepare_message(image, url)
      return unless Current.user.telegram_user_id && Telegram::Bot.configured?

      result = { type: "photo", id: image.token, photo_url: url, thumbnail_url: url }
      caption = params[:caption].to_s.strip.first(CAPTION_LIMIT)
      result[:caption] = caption if caption.present?
      if (username = ENV["TELEGRAM_BOT_USERNAME"].presence)
        result[:reply_markup] = { inline_keyboard: [ [ { text: "Bunna Passport", url: "https://t.me/#{username.delete_prefix('@')}" } ] ] }
      end

      Telegram::Bot.new.save_prepared_inline_message(user_id: Current.user.telegram_user_id, result: result)
    rescue Telegram::Bot::Error => error
      Rails.logger.warn("[share_cards] #{error.message}")
      nil
    end
end

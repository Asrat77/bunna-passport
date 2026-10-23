class Api::V1::ShareCardsController < Api::V1::BaseController
  # Rendering takes a second or two, so keep a tap-happy client in check.
  rate_limit to: 30, within: 1.hour

  # Renders (or reuses) the post and story cards for one of the caller's own
  # verified check-ins and returns where to fetch them. Telegram needs these
  # public URLs for shareMessage and shareToStory, and phones save the story
  # card for Instagram and TikTok.
  def create
    check_in = Current.user.check_ins.find(params[:check_in_id])

    unless check_in.verified?
      return render_error(:unprocessable_entity, "check_in_not_verified", "Only a verified check-in has a stamp to share.")
    end

    doodle = ActiveModel::Type::Boolean.new.cast(params.fetch(:doodle, true))
    images = ShareCard::FORMATS.keys.index_with { |format| ShareImage.for!(check_in, format: format, doodle: doodle) }

    render_data({
      check_in_id: check_in.id,
      doodle: doodle,
      post_url: share_image_url(images.fetch("post").token, format: :png),
      story_url: share_image_url(images.fetch("story").token, format: :png)
    })
  end
end

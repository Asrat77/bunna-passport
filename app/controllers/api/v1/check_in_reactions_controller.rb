class Api::V1::CheckInReactionsController < Api::V1::BaseController
  RECEIVED_LIMIT = 30

  # Generous for tapping through a feed, but not a script. Counted per
  # person, not per IP: phones on the same mobile network share addresses.
  rate_limit to: 200, within: 1.hour, only: %i[ update destroy ], by: -> { Current.user.id },
    with: -> { render_error(:too_many_requests, "rate_limit_exceeded", "Too many reactions. Try again later.") }

  # Reactions friends left on your own visits over the feed's month, newest
  # first. Only from people who are still your friends.
  def index
    reactions = CheckInReaction.received_by(Current.user)
      .where(check_ins: { occurred_at: CheckIn::FEED_WINDOW.ago.. })
      .includes(:user, check_in: :shop).limit(RECEIVED_LIMIT).to_a
    cup_today_ids = User.ids_with_cup_today(reactions.map(&:user_id).uniq)

    render_data(
      reactions.map do |reaction|
        check_in = reaction.check_in
        {
          id: reaction.id,
          kind: reaction.kind,
          user: friend_json(reaction.user, cup_today_ids),
          check_in: {
            id: check_in.id,
            shop: { id: check_in.shop_id, name: check_in.shop.name, name_am: check_in.shop.name_am },
            coffee_day: User.coffee_day_start(check_in.occurred_at).to_date.iso8601
          },
          reacted_at: reaction.updated_at.iso8601
        }
      end
    )
  end

  # Sets the caller's reaction, replacing one they left before. Only on a
  # visit the caller can see in their feed.
  def update
    check_in = visible_check_in
    kind = params.require(:kind).to_s
    reaction = check_in.reactions.find_or_initialize_by(user: Current.user)
    reaction.update!(kind: kind)
    render_data(reactions_for(check_in))
  rescue ActiveRecord::RecordNotUnique
    # A double tap raced itself; the other request saved it.
    retry
  end

  def destroy
    check_in = visible_check_in
    check_in.reactions.where(user: Current.user).delete_all
    render_data(reactions_for(check_in))
  end

  private
    def visible_check_in
      CheckIn.friend_feed_for(Current.user).find(params[:check_in_id])
    end

    def reactions_for(check_in)
      counts = CheckInReaction.counts_by_check_in([ check_in.id ])[check_in.id]
      reactions_json(counts, check_in.reactions.find_by(user: Current.user)&.kind)
    end
end

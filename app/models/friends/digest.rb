# The evening round-up of what friends did since the last one: stamps they
# pressed at new cafés, and reactions they left on your visits. One message a
# day at most, sent hours after the visits, so it never says where a friend
# is right now and never turns into a stream of pings.
class Friends::Digest
  MAX_LINES = 5
  # Never reach further back than this, even for someone's first round-up.
  LOOKBACK = 1.day

  attr_reader :user, :since, :now

  def initialize(user, now: Time.current)
    @user = user
    @now = now
    @since = [ user.last_friend_digest_at, now - LOOKBACK ].compact.max
  end

  # Verified visits that pressed a new stamp, by friends who share visits.
  def new_stamps
    @new_stamps ||= CheckIn.verified.joins(:stamp)
      .where(user_id: user.friendships.select(:friend_id))
      .where(user_id: User.where(shares_visits: true).select(:id))
      .where(counted_at: since..now)
      .includes(:user, :shop).order(:counted_at, :id).to_a
  end

  def reactions
    @reactions ||= CheckInReaction.received_by(user).where(updated_at: since..now)
      .includes(:user, check_in: :shop).reorder(:updated_at, :id).to_a
  end

  def empty?
    new_stamps.empty? && reactions.empty?
  end
end

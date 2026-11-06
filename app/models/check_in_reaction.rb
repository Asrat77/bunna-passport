# A friend's quick reaction to a visit in their feed: one per person per
# visit, picked from a short fixed set so no one can write anything in it.
class CheckInReaction < ApplicationRecord
  KINDS = %w[ coffee heart fire clap ].freeze
  EMOJI = { "coffee" => "☕", "heart" => "❤️", "fire" => "🔥", "clap" => "👏" }.freeze

  belongs_to :check_in
  belongs_to :user

  validates :kind, inclusion: { in: KINDS }
  validates :user_id, uniqueness: { scope: :check_in_id }

  # Reactions on someone's own visits from people who are still their friends,
  # newest first: what the Mini App and the round-up show them.
  def self.received_by(user)
    joins(:check_in)
      .where(check_ins: { user_id: user.id })
      .where(user_id: user.friendships.select(:friend_id))
      .order(updated_at: :desc, id: :desc)
  end

  # Counts per kind, in the KINDS order, for one or many visits.
  def self.counts_by_check_in(check_in_ids)
    where(check_in_id: check_in_ids).group(:check_in_id, :kind).count
      .each_with_object(Hash.new { |hash, key| hash[key] = {} }) { |((check_in_id, kind), count), memo| memo[check_in_id][kind] = count }
  end

  def emoji
    EMOJI.fetch(kind)
  end
end

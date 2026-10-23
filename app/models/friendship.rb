# Two people who agreed to see each other's coffee. Mutual: accepting an
# invite link writes a row each way, and either side removing it deletes both.
class Friendship < ApplicationRecord
  # Generous for a coffee circle, and it keeps a link posted to a big group
  # from turning one account into everyone's friend.
  LIMIT = 500

  class LimitReached < StandardError; end

  belongs_to :user
  belongs_to :friend, class_name: "User"

  validates :friend_id, uniqueness: { scope: :user_id }
  validate :not_self

  def self.connect!(user, other)
    raise ArgumentError, "can't befriend yourself" if user == other
    return false if exists?(user: user, friend: other)

    transaction do
      [ user, other ].each do |side|
        side.lock!
        raise LimitReached if side.friendships.count >= LIMIT
      end
      create!(user: user, friend: other)
      create!(user: other, friend: user)
    end
    true
  rescue ActiveRecord::RecordNotUnique
    # The other person accepted the same link a moment ago.
    false
  end

  def self.disconnect!(user, other)
    where(user: user, friend: other).or(where(user: other, friend: user)).delete_all
  end

  private
    def not_self
      errors.add(:friend, "can't be yourself") if user_id.present? && user_id == friend_id
    end
end

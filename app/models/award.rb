class Award < ApplicationRecord
  belongs_to :user
  belongs_to :badge
  belongs_to :check_in, optional: true

  validates :earned_at, presence: true

  # Badges ride after the stamp message, never alongside it (DESIGN.md §6.3).
  after_create_commit -> { SendBadgeNotificationJob.set(wait: 5.seconds).perform_later(self) if user.bot_chat? }
end

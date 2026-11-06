# The evening friends round-up. Fans out one job per person so a failure for
# one doesn't stop the rest.
class SendFriendDigestsJob < ApplicationJob
  queue_as :default

  def perform(now: Time.current)
    return unless Telegram::Bot.configured?

    ActiveJob.perform_all_later(User.friend_digestable(now).map { |user| SendFriendDigestJob.new(user) })
  end
end

# The afternoon "had a cup?" nudge, for people whose doodle is still asleep.
# Fans out one job per person so a failure for one doesn't stop the rest.
class SendDailyNudgesJob < ApplicationJob
  queue_as :default

  def perform(now: Time.current)
    return unless Telegram::Bot.configured?

    users = User.nudgeable(now).to_a
    had_cup = User.ids_with_cup_today(users.map(&:id), now: now)
    ActiveJob.perform_all_later(users.reject { |user| had_cup.include?(user.id) }.map { |user| SendNudgeJob.new(user) })
  end
end

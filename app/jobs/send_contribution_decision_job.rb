# Tells someone in Telegram that a moderator approved or rejected what they
# sent in: a new café, an edit to one, or a photo. Contributions that went
# live straight away (auto-approved) need no message; the person saw that in
# the app when they sent it.
class SendContributionDecisionJob < ApplicationJob
  queue_as :default

  retry_on Telegram::Bot::Error, attempts: 3, wait: :polynomially_longer
  discard_on ActiveJob::DeserializationError

  def perform(contribution)
    user = contribution.user
    return unless Telegram::Bot.configured? && user.bot_chat?
    # Reversed, or decided again, since this was queued: say nothing stale.
    return unless contribution.approved? || contribution.rejected?

    Telegram::Bot.new.send_message(chat_id: user.telegram_user_id, **Telegram::Messages.contribution_decision(contribution))
  rescue Telegram::Bot::Forbidden
    user.stop_bot_chat!
  end
end

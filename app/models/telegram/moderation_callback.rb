# A tap on one of the buttons that came with the moderation digest. Only a
# moderator's tap counts, whoever the chat belongs to, and the same rules as
# the console apply: an item someone else already settled is left alone.
#
# The message is then redrawn with the outcome and without its buttons, so
# everyone who received the digest can see it is done once they reopen it.
class Telegram::ModerationCallback
  ACTIONS = %w[ ci_ok ci_no ed_ok ed_no ].freeze
  REJECTION_REASON = "Rejected by a moderator in Telegram.".freeze

  def initialize(callback, bot:)
    @callback = callback
    @bot = bot
    @action, id = callback["data"].to_s.delete_prefix(Telegram::Messages::MODERATION_PREFIX).split(":", 2)
    @id = Integer(id, exception: false)
  end

  def handle
    moderator = User.find_by(telegram_user_id: @callback.dig("from", "id"))
    return answer("Only moderators can do that.") unless moderator&.moderator?
    return answer("That button is out of date.") unless ACTIONS.include?(@action) && @id

    record, outcome = act(moderator)
    return answer("That item is gone.") unless record

    redraw(record, outcome)
    answer(outcome)
  end

  private
    def act(moderator)
      case @action
      when "ci_ok", "ci_no" then settle_check_in(moderator)
      when "ed_ok", "ed_no" then settle_edit(moderator)
      end
    end

    def settle_check_in(moderator)
      check_in = CheckIn.find_by(id: @id)
      return unless check_in

      check_in.with_lock do
        next [ check_in, "Already #{check_in.status}." ] unless check_in.flagged?

        if @action == "ci_ok"
          check_in.verify!
          [ check_in, "✅ Verified by #{moderator.display_name}." ]
        else
          check_in.reject!
          [ check_in, "❌ Rejected by #{moderator.display_name}." ]
        end
      end
    end

    def settle_edit(moderator)
      contribution = Contribution.find_by(id: @id, contributable_type: "Shop::Edit")
      return unless contribution

      contribution.with_lock do
        next [ contribution, "Already #{contribution.status.humanize.downcase}." ] unless contribution.pending?

        if @action == "ed_ok"
          contribution.approve!(reviewer: moderator)
          [ contribution, "✅ Approved by #{moderator.display_name}." ]
        else
          contribution.reject!(reviewer: moderator, reason: REJECTION_REASON)
          [ contribution, "❌ Rejected by #{moderator.display_name}." ]
        end
      end
    rescue ActiveRecord::RecordInvalid => error
      # An edit that no longer applies (say the café's hours changed shape):
      # leave it pending for the console.
      [ contribution.reload, "Couldn't apply it here: #{error.record.errors.full_messages.to_sentence}. Open it in the console." ]
    end

    def redraw(record, outcome)
      message = @callback["message"]
      return unless message

      @bot.edit_message_text(chat_id: message.dig("chat", "id"), message_id: message["message_id"],
        **Telegram::Messages.moderation_item(record.reload, outcome: outcome))
    rescue Telegram::Bot::Error => error
      Rails.logger.warn("Moderation message could not be redrawn: #{error.message}")
    end

    def answer(text)
      @bot.answer_callback_query(callback_query_id: @callback["id"], text: text.truncate(200))
    end
end

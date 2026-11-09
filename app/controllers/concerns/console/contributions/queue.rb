# After a decision, go straight to the next contribution waiting, oldest
# first, so a moderator can work through the queue without the list.
module Console::Contributions::Queue
  extend ActiveSupport::Concern

  private
    def contribution
      @contribution ||= Contribution.find(params[:contribution_id])
    end

    # Whether the contributor gets told, which depends on them having started the bot.
    def telegram_note(what)
      user = contribution.user
      user.bot_chat? ? " #{user.display_name} will hear #{what} in Telegram." : " @#{user.handle} hasn't started the bot, so they won't be told."
    end

    def after_decision_path
      following = Contribution.pending.where.not(id: contribution.id).order(:created_at).first
      following ? console_contribution_path(following) : console_contributions_path
    end
end

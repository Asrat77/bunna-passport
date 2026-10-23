class AddTelegramBotChatToUsers < ActiveRecord::Migration[8.1]
  def change
    # A bot may only write to someone who has started it, and must stop once
    # they block it. Set by /start, cleared by a block.
    add_column :users, :telegram_chat_started_at, :datetime
    add_column :users, :daily_nudges, :boolean, default: true, null: false
    # Guards against a second nudge in one coffee day if the job runs twice.
    add_column :users, :last_nudged_at, :datetime
  end
end

# The visit that earned a badge, so the check-in ceremony can show it and an
# idempotent replay of that check-in shows the same badge again. Badges earned
# by a contribution, or before this column, have none.
class AddCheckInToAwards < ActiveRecord::Migration[8.1]
  def change
    add_reference :awards, :check_in, foreign_key: true, null: true
  end
end

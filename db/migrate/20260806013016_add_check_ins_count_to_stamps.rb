class AddCheckInsCountToStamps < ActiveRecord::Migration[8.1]
  def up
    add_column :stamps, :check_ins_count, :integer, default: 0, null: false
    add_check_constraint :stamps, "check_ins_count >= 0", name: "stamps_non_negative_check_ins"

    # A stamp's level is how often its owner has been counted at that shop, so
    # existing stamps have to inherit the visits they already earned.
    execute <<~SQL
      UPDATE stamps
      SET check_ins_count = (
        SELECT COUNT(*) FROM check_ins
        WHERE check_ins.user_id = stamps.user_id
          AND check_ins.shop_id = stamps.shop_id
          AND check_ins.counted_at IS NOT NULL
      )
    SQL
  end

  def down
    remove_check_constraint :stamps, name: "stamps_non_negative_check_ins"
    remove_column :stamps, :check_ins_count
  end
end

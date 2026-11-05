# What a review can carry beyond a rating and a note: what the visitor paid,
# a few quick tags, and two timestamps the server keeps for itself (when the
# bot last asked for a rating, and when a moderator hid the review).
#
# Drinks were saved as the label in the visitor's language. They become the
# same codes the mobile app always sent, so each reader sees their own word.
class AddReviewFieldsToCheckIns < ActiveRecord::Migration[8.1]
  DRINK_CODES = {
    "macchiato" => "macchiato", "ማኪያቶ" => "macchiato",
    "buna" => "buna", "ቡና" => "buna",
    "spris" => "spris", "ስፕሪስ" => "spris"
  }.freeze

  def up
    add_column :check_ins, :price_birr, :integer
    add_column :check_ins, :tags, :json, null: false, default: []
    add_column :check_ins, :review_prompted_at, :datetime
    add_column :check_ins, :review_hidden_at, :datetime
    add_check_constraint :check_ins, "price_birr IS NULL OR price_birr BETWEEN 1 AND 5000", name: "check_ins_price_birr"

    DRINK_CODES.each do |label, code|
      execute <<~SQL.squish
        UPDATE check_ins SET drink = #{connection.quote(code)}
        WHERE LOWER(TRIM(drink)) = #{connection.quote(label)}
      SQL
    end
  end

  def down
    remove_check_constraint :check_ins, name: "check_ins_price_birr"
    remove_column :check_ins, :review_hidden_at
    remove_column :check_ins, :review_prompted_at
    remove_column :check_ins, :tags
    remove_column :check_ins, :price_birr
  end
end

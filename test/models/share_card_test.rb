require "test_helper"

class ShareCardTest < ActiveSupport::TestCase
  setup do
    @user = create_user(created_at: 2.days.ago, avatar_seed: "meklit")
    @check_in = CheckIn.record!(
      user: @user,
      shop: shops(:bole),
      idempotency_key: "share-card",
      latitude: shops(:bole).latitude,
      longitude: shops(:bole).longitude,
      accuracy_meters: 10
    )
  end

  test "prints the shop, its neighbourhood, the stamp number and the date" do
    svg = ShareCard.new(@check_in).to_svg

    assert_includes svg, "BUNA HOUSE"
    assert_includes svg, "ቡና ቤት · #{neighborhoods(:bole).name_am}"
    assert_includes svg, "STAMP №1"
    assert_includes svg, ShareCard::InkStamp.date(@check_in.occurred_at.in_time_zone("Africa/Addis_Ababa"))
  end

  test "draws the user's own doodle, awake, unless they hide it" do
    face = ShareCard::Doodle.paths("meklit", "awake")

    assert_includes ShareCard.new(@check_in).to_svg, face[:head]
    assert_not_includes ShareCard.new(@check_in, doodle: false).to_svg, face[:head]
  end

  test "never prints the user's name, handle or the time of day" do
    svg = ShareCard.new(@check_in, format: "story").to_svg

    assert_not_includes svg, @user.display_name
    assert_not_includes svg, @user.handle
    assert_not_includes svg, @check_in.occurred_at.in_time_zone("Africa/Addis_Ababa").strftime("%H:%M")
  end

  test "links the bot in the footer once it has a name" do
    with_env("TELEGRAM_BOT_USERNAME" => "@bunnapassportbot") do
      assert_includes ShareCard.new(@check_in).to_svg, "t.me/bunnapassportbot"
    end
  end

  test "rejects an unknown format" do
    assert_raises(ArgumentError) { ShareCard.new(@check_in, format: "banner") }
  end

  test "renders a PNG at each size" do
    skip "rsvg-convert is not installed" unless system("rsvg-convert", "--version", out: File::NULL, err: File::NULL)

    { "post" => [ 1080, 1350 ], "story" => [ 1080, 1920 ] }.each do |format, (width, height)|
      png = ShareCard.new(@check_in, format: format).to_png

      assert png.start_with?("\x89PNG".b), format
      assert_equal [ width, height ], png.byteslice(16, 8).unpack("NN"), format
    end
  end

  private
    def with_env(values)
      previous = values.keys.index_with { |key| ENV[key] }
      values.each { |key, value| ENV[key] = value }
      yield
    ensure
      previous.each { |key, value| ENV[key] = value }
    end
end

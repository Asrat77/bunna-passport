require "test_helper"

class ShareCard::DoodleTest < ActiveSupport::TestCase
  # The web tests check the same fixture, produced by the design canvas's own
  # generator, so a face on a share card is the face the user picked.
  CANVAS = JSON.parse(Rails.root.join("web/src/design/doodle/__fixtures__/canvas-doodles.json").read)

  CANVAS.each do |key, expected|
    seed, mood = key.split("|")

    test "draws #{seed} #{mood} exactly as the canvas does" do
      paths = ShareCard::Doodle.paths(seed, mood).except(:hash)

      assert_equal expected, paths.transform_keys(&:to_s)
    end
  end

  test "keeps the face when only the mood changes" do
    sleepy = ShareCard::Doodle.paths("abebe", "sleepy")
    awake = ShareCard::Doodle.paths("abebe", "awake")

    %i[head headStroke hairFill hairLine nose glasses neck].each do |part|
      assert_equal sleepy[part], awake[part], part
    end
  end

  test "rejects an unknown mood" do
    assert_raises(ArgumentError) { ShareCard::Doodle.new("abebe", "grumpy") }
  end
end

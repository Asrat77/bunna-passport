require "test_helper"

class ShareCard::DoodleTest < ActiveSupport::TestCase
  FIXTURES = Rails.root.join("web/src/design/doodle/__fixtures__")
  # The web tests check the same fixtures: the canvas one from the design
  # canvas's own generator, the editor one from the Mini App's, so a face on a
  # share card is the face the user picked.
  CANVAS = JSON.parse(FIXTURES.join("canvas-doodles.json").read)
  EDITOR = JSON.parse(FIXTURES.join("editor-doodles.json").read)
  CATALOG = JSON.parse(FIXTURES.join("../catalog.json").read)

  CANVAS.each do |key, expected|
    seed, mood = key.split("|")

    test "draws #{seed} #{mood} exactly as the canvas does" do
      paths = ShareCard::Doodle.paths(seed, mood).transform_keys(&:to_s).slice(*expected.keys)

      assert_equal expected, paths
    end
  end

  EDITOR.each do |key, expected|
    seed, mood, traits = key.split("|", 3)

    test "draws #{seed} #{mood} with #{traits} exactly as the editor does" do
      paths = ShareCard::Doodle.paths(seed, mood, JSON.parse(traits)).except(:hash).transform_keys(&:to_s)

      assert_equal expected, paths
    end
  end

  test "offers the same choices and colours as the Mini App" do
    assert_equal CATALOG["options"], Avatar::OPTIONS
    assert_equal CATALOG["colors"], Avatar::COLORS
  end

  test "keeps the face when only the mood changes" do
    sleepy = ShareCard::Doodle.paths("abebe", "sleepy")
    awake = ShareCard::Doodle.paths("abebe", "awake")

    %i[head headStroke hairFill hairLine nose glasses neck].each do |part|
      assert_equal sleepy[part], awake[part], part
    end
  end

  test "ignores traits it doesn't know" do
    assert_equal ShareCard::Doodle.paths("abebe", "awake"), ShareCard::Doodle.paths("abebe", "awake", { "hair" => "mohawk", "wings" => "on" })
  end

  test "colours the face it draws" do
    svg = ShareCard::Doodle.new("abebe", "awake", { "skin" => "mocha", "hair" => "afro", "hair_color" => "auburn", "hat" => "none" }).to_svg

    assert_includes svg, Avatar::COLORS["skin"]["mocha"]
    assert_includes svg, Avatar::COLORS["hair_color"]["auburn"]
  end

  test "rejects an unknown mood" do
    assert_raises(ArgumentError) { ShareCard::Doodle.new("abebe", "grumpy") }
  end
end

require "test_helper"

class ShareCard::FontsTest < ActiveSupport::TestCase
  FONT_DIR = Rails.root.join("vendor/fonts/share_card")
  # sfnt version tags for TrueType and OpenType/CFF. WOFF starts with "wOFF".
  SFNT_TAGS = [ "\x00\x01\x00\x00".b, "OTTO".b, "true".b ].freeze

  test "ships plain TrueType or OpenType fonts that production can shape" do
    fonts = FONT_DIR.glob("*.{ttf,otf,woff,woff2}")

    assert_not_empty fonts
    fonts.each do |path|
      assert_includes SFNT_TAGS, path.binread(4), "#{path.basename} must be .ttf or .otf, not WOFF (bookworm's Pango can't shape WOFF)"
    end
  end

  test "includes an Ethiopic font for the Amharic on every card" do
    names = FONT_DIR.glob("*.ttf").map { |path| path.basename.to_s }

    assert names.any? { |name| name.start_with?("noto-sans-ethiopic") }
    assert names.any? { |name| name.start_with?("noto-serif-ethiopic") }
  end
end

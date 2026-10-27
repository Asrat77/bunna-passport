require "test_helper"

class ShareCard::InkStampTest < ActiveSupport::TestCase
  # Shared with web/src/design/stamp/geometry.test.ts.
  SHARED = JSON.parse(Rails.root.join("web/src/design/stamp/__fixtures__/stamp-geometry.json").read)

  test "lays out names as the Mini App does" do
    SHARED["nameLayout"].each do |name, expected|
      lines, size = ShareCard::InkStamp.name_layout(name.upcase)

      assert_equal expected["lines"], lines, name
      assert_in_delta expected["size"], size, 1e-9, name
      assert_equal expected["baselines"], ShareCard::InkStamp.name_baselines(lines, size), name
    end
  end

  test "sizes the Amharic line as the Mini App does" do
    SHARED["amharicFontSize"].each do |text, size|
      assert_in_delta size, ShareCard::InkStamp.amharic_font_size(text), 1e-9, text
    end
  end

  test "seeds the ink texture as the Mini App does" do
    SHARED["inkNoiseSeed"].each do |name, seed|
      assert_equal seed, ShareCard::InkStamp.ink_noise_seed(name), name
    end
  end

  test "tilts each stamp as the Mini App does" do
    SHARED["stampRotation"].each do |key, rotation|
      assert_equal rotation, ShareCard::InkStamp.rotation(key), key
    end
  end

  test "prints dates like a rubber stamp" do
    assert_equal "21 OCT 2026", ShareCard::InkStamp.date(Time.zone.local(2026, 10, 21, 9, 30))
  end

  test "places the ring glyphs as the Mini App does" do
    glyphs = ShareCard::InkStamp.ring_glyphs

    assert_equal SHARED["ringGlyphs"].size, glyphs.size
    SHARED["ringGlyphs"].zip(glyphs).each do |expected, (char, x, y, degrees, size)|
      assert_equal expected["char"], char
      assert_in_delta expected["x"], x, 0.011
      assert_in_delta expected["y"], y, 0.011
      assert_in_delta expected["rotate"], degrees, 0.011
      assert_equal expected["size"], size
    end
  end

  test "prints an unearned stamp as an empty slot" do
    svg = ShareCard::InkStamp.new(name: "Tomoca", amharic: "ቶሞካ", date: "YOUR STAMP", level: "none").to_svg

    assert_includes svg, %(stroke-dasharray="9 7")
    assert_not_includes svg, "PASSPORT"
  end

  test "escapes shop names" do
    svg = ShareCard::InkStamp.new(name: "Tom&Co<b>", amharic: "ቶሞካ", date: "1 JAN 2026").to_svg

    assert_includes svg, "TOM&amp;CO&lt;B&gt;"
  end
end

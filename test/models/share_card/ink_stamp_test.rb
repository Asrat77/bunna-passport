require "test_helper"

class ShareCard::InkStampTest < ActiveSupport::TestCase
  # Shared with web/src/design/stamp/geometry.test.ts.
  SHARED = JSON.parse(Rails.root.join("web/src/design/stamp/__fixtures__/stamp-geometry.json").read)

  test "sizes names as the Mini App does" do
    SHARED["nameFontSize"].each do |name, size|
      assert_in_delta size, ShareCard::InkStamp.name_font_size(name.upcase), 1e-9, name
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

  test "lays the ring text along the circle, starting at the left and running over the top" do
    glyphs = ShareCard::InkStamp.ring_glyphs
    first_char, first_x, first_y = glyphs.first

    assert_equal ShareCard::InkStamp::RING_TEXT.length, glyphs.size
    assert_equal "B", first_char
    assert_in_delta 30, first_x, 1
    assert_operator first_y, :<, 116
    glyphs.each do |_, x, y, _|
      assert_in_delta 86, Math.hypot(x - 116, y - 116), 0.05
    end
  end

  test "escapes shop names" do
    svg = ShareCard::InkStamp.new(name: "Tom & Co <b>", amharic: "ቶሞካ", date: "1 JAN 2026").to_svg

    assert_includes svg, "TOM &amp; CO &lt;B&gt;"
  end
end

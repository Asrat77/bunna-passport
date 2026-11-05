require "test_helper"

class InviteCardTest < ActiveSupport::TestCase
  test "names the sender and escapes their handle" do
    svg = InviteCard.new(User.new(handle: "a<b", avatar_seed: "x")).to_svg

    assert_includes svg, "@a&lt;b"
    assert_includes svg, "invited you for coffee."
    assert Nokogiri::XML(svg) { |config| config.strict }.errors.empty?
  end
end

require "test_helper"

class Shop::GapsTest < ActiveSupport::TestCase
  setup do
    @bole = neighborhoods(:bole)
    @shop = shops(:bole)
  end

  test "lists live cafés missing a photo or a usable landmark" do
    @shop.update_columns(landmark: "Bole, Addis Ababa")

    row = Shop::Gaps.new(@bole).rows.find { |candidate| candidate.shop == @shop }

    assert row.missing_photo
    assert row.weak_landmark
    assert_match(/from|near/i, row.suggestion)
    assert_not_includes Shop::Gaps.new(@bole).shops, shops(:hidden)
  end

  test "pairs likely duplicates once" do
    twin = @shop.dup.tap { |shop| shop.assign_attributes(slug: "buna-house-2", latitude: @shop.latitude + 0.0003) }
    twin.save!

    gaps = Shop::Gaps.new(@bole)

    assert_equal [ [ @shop, twin ] ], gaps.duplicate_pairs
    assert_equal 1, gaps.summary[:duplicate_pairs]
  end

  test "counts a café with a photo, a real landmark and no twin as complete" do
    @shop.photos.create!(contributor: users(:two), image: { io: File.open(Rails.root.join("public/icon.png")), filename: "icon.png", content_type: "image/png" })

    assert_equal 1, Shop::Gaps.new(@bole).summary[:complete]
  end
end

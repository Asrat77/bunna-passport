require "test_helper"

class Api::V1::ShopReviewsTest < ActionDispatch::IntegrationTest
  TINY_PNG = Base64.decode64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")

  setup do
    @shop = shops(:bole)
  end

  test "a verified visit with a rating or a note is a review" do
    rated = visit(rating: 5)
    noted = visit(note: "Best macchiato in Bole", key: "noted")
    visit(key: "silent") # no rating, no note

    get api_v1_shop_reviews_url(@shop)

    assert_response :success
    ids = response_json["data"].map { |review| review["id"] }
    assert_includes ids, rated.id
    assert_includes ids, noted.id
    assert_equal 2, ids.size, "a visit with nothing said is not a review"
  end

  test "a rejected visit never becomes a review" do
    # Too far from the shop, so the check-in is rejected outright.
    rejected = visit(rating: 1, latitude: 9.0042, longitude: 38.7877, key: "far")
    assert rejected.rejected?

    get api_v1_shop_reviews_url(@shop)

    assert_empty response_json["data"]
  end

  test "the summary averages only rated visits" do
    visit(rating: 4)
    visit(rating: 2, key: "second")
    visit(note: "no stars from me", key: "third")

    get api_v1_shop_reviews_url(@shop)

    meta = response_json["meta"]
    assert_in_delta 3.0, meta["rating_average"]
    assert_equal 2, meta["rating_count"]
    assert_equal 3, meta["total"]
  end

  test "each person counts once in the score, by their latest rating" do
    regular = create_user(created_at: 5.days.ago)
    visit(rating: 1, user: regular, key: "first")
    travel 5.hours do
      visit(rating: 5, user: regular, key: "second")
    end
    visit(rating: 3, key: "stranger")

    get api_v1_shop_reviews_url(@shop)

    meta = response_json["meta"]
    assert_equal 2, meta["rating_count"]
    assert_in_delta 4.0, meta["rating_average"]
    assert_equal({ "1" => 0, "2" => 0, "3" => 1, "4" => 0, "5" => 1 }, meta["distribution"])
    assert_equal 3, meta["total"], "every visit is still listed"
  end

  test "the catalog counts each shop's review tags and drops hidden ones" do
    visit(rating: 5, tags: %w[ quiet good_for_work ])
    hidden = visit(rating: 4, tags: %w[ quiet ], key: "second")

    get api_v1_shops_url
    shop = response_json.dig("data", "shops").find { |s| s["id"] == @shop.id }
    assert_equal({ "quiet" => 2, "good_for_work" => 1 }, shop["review_tags"])

    Report.create!(user: create_user, reportable: hidden, reason: "spam").uphold!(by: create_user(trust_level: :moderator))
    assert_equal({ "quiet" => 1, "good_for_work" => 1 }, @shop.reload.review_tags)

    hidden.reload.update!(tags: [])
    assert_equal({ "quiet" => 1, "good_for_work" => 1 }, @shop.reload.review_tags)
  end

  test "a merge moves review tags to the surviving shop" do
    visit(rating: 5, tags: %w[ cozy ])
    winner = shops(:bole).dup.tap { |s| s.assign_attributes(slug: "bole-two", name: "Bole Two", name_am: "ቦሌ ሁለት") }
    winner.save!(validate: false)
    winner.update_columns(status: "live")

    @shop.merge_into!(winner, by: create_user(trust_level: :moderator))

    assert_equal({ "cozy" => 1 }, winner.reload.review_tags)
    assert_equal({}, @shop.reload.review_tags)
  end

  test "a review carries who wrote it, their tags, price and photo" do
    check_in = visit(rating: 4, tags: %w[ cozy ], drink: "macchiato", price_birr: 40)
    check_in.photo.attach(io: StringIO.new(TINY_PNG), filename: "cup.png", content_type: "image/png")
    visit(rating: 5, tags: %w[ cozy quiet ], drink: "macchiato", price_birr: 50, key: "second")

    get api_v1_shop_reviews_url(@shop)

    review = response_json["data"].find { |r| r["id"] == check_in.id }
    assert_equal %w[ cozy ], review["tags"]
    assert_equal 40, review["price_birr"]
    assert review["user"].key?("avatar_traits")
    assert review.dig("photo", "thumb")

    meta = response_json["meta"]
    assert_equal({ "tag" => "cozy", "count" => 2 }, meta["top_tags"].first)
    assert_equal [ { "drink" => "macchiato", "median_birr" => 45, "count" => 2 } ], meta["typical_prices"]
  end

  test "a tag alone is a review" do
    tagged = visit(tags: %w[ quick_service ])

    get api_v1_shop_reviews_url(@shop)

    assert_equal [ tagged.id ], response_json["data"].map { |review| review["id"] }
  end

  test "pages with a cursor and filters to reviews with words" do
    reviews = 22.times.map { |n| visit(rating: 4, note: n.even? ? "note #{n}" : nil, key: "r#{n}") }

    get api_v1_shop_reviews_url(@shop)
    first_page = response_json
    assert_equal 20, first_page["data"].size
    assert first_page.dig("meta", "next_cursor")

    get api_v1_shop_reviews_url(@shop, cursor: first_page.dig("meta", "next_cursor"))
    assert_equal reviews.first(2).map(&:id).reverse, response_json["data"].map { |review| review["id"] }
    assert_nil response_json.dig("meta", "next_cursor")

    get api_v1_shop_reviews_url(@shop, filter: "notes")
    assert_equal 11, response_json["data"].size
    assert(response_json["data"].all? { |review| review["note"].present? })
    assert_equal 11, response_json.dig("meta", "total")
  end

  test "a review hidden after a report disappears from the page and the score" do
    hidden = visit(rating: 1, note: "spam spam")
    visit(rating: 5, key: "kept")
    report = Report.create!(user: create_user, reportable: hidden, reason: "spam")
    report.uphold!(by: create_user(trust_level: :moderator))

    get api_v1_shop_reviews_url(@shop)

    assert_not_includes response_json["data"].map { |review| review["id"] }, hidden.id
    assert_in_delta 5.0, response_json.dig("meta", "rating_average")
    assert hidden.reload.verified?, "the visit itself still counts"

    report.reverse!(by: create_user(trust_level: :moderator))
    assert_nil hidden.reload.review_hidden_at
  end

  test "a shop nobody has reviewed reports no average" do
    get api_v1_shop_reviews_url(@shop)

    assert_empty response_json["data"]
    assert_nil response_json["meta"]["rating_average"]
  end

  private
    def visit(rating: nil, note: nil, key: "review", latitude: nil, longitude: nil, user: nil, tags: nil, drink: nil, price_birr: nil)
      CheckIn.record!(
        user: user || create_user(created_at: 2.days.ago),
        shop: @shop,
        idempotency_key: key,
        latitude: latitude || @shop.latitude,
        longitude: longitude || @shop.longitude,
        accuracy_meters: 10,
        mock_location: false,
        rating: rating,
        note: note,
        tags: tags,
        drink: drink,
        price_birr: price_birr
      )
    end
end

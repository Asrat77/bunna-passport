require "test_helper"

class Api::V1::CommunityTest < ActionDispatch::IntegrationTest
  test "regular user shop edits auto apply" do
    regular = create_user(trust_level: :regular)

    post api_v1_shop_edits_path(shops(:bole)),
      params: { shop_edit: { proposed_changes: { landmark: "Across from the stadium" } } },
      headers: bearer_headers(regular),
      as: :json

    assert_response :created
    assert_equal "auto_approved", response_json.dig("data", "status")
    assert_equal "Across from the stadium", shops(:bole).reload.landmark
  end

  test "curator photo submissions publish approved variants" do
    curator = create_user(trust_level: :curator)
    image = Rack::Test::UploadedFile.new(Rails.root.join("public/icon.png"), "image/png")

    assert_difference -> { Shop::Photo.count }, 1 do
      post api_v1_shop_photos_path(shops(:bole)),
        params: { shop_photo: { caption: "Front entrance", image: image } },
        headers: bearer_headers(curator)
    end

    assert_response :created
    assert_equal "auto_approved", response_json.dig("data", "status")

    get api_v1_shop_path(shops(:bole)), as: :json
    urls = response_json.dig("data", "photos", 0, "urls")
    assert urls.values_at("thumb", "medium", "full").all?(&:present?)
  end

  test "only curators can see the pending community queue" do
    contribution = Contribution.record!(
      user: users(:one),
      contributable: Shop::Submission.new(
        name: "Queue Coffee",
        name_am: "የወረፋ ቡና",
        neighborhood: neighborhoods(:bole),
        landmark: "Near the queue",
        latitude: 8.999,
        longitude: 38.79
      )
    )

    get api_v1_pending_contributions_path, headers: bearer_headers(users(:one)), as: :json
    assert_response :forbidden

    get api_v1_pending_contributions_path, headers: bearer_headers(users(:two)), as: :json
    assert_response :success
    assert_includes response_json["data"].pluck("id"), contribution.id
  end

  test "two API confirmations publish a shop for incremental sync" do
    contributor = create_user
    first_curator = create_user(trust_level: :curator)
    second_curator = create_user(trust_level: :curator)
    contribution = Contribution.record!(
      user: contributor,
      contributable: Shop::Submission.new(
        name: "Confirmed Coffee",
        name_am: "የተረጋገጠ ቡና",
        neighborhood: neighborhoods(:bole),
        landmark: "Beside the confirmation",
        latitude: 8.998,
        longitude: 38.792
      )
    )
    cutoff = Time.current.iso8601(6)

    post api_v1_contribution_confirmations_path(contribution), headers: bearer_headers(first_curator), as: :json
    assert_response :created
    assert_equal "pending", response_json.dig("data", "status")

    post api_v1_contribution_confirmations_path(contribution), headers: bearer_headers(second_curator), as: :json
    assert_response :created
    assert_equal "approved", response_json.dig("data", "status")

    get api_v1_shops_path, params: { updated_since: cutoff }, as: :json
    assert_includes response_json.dig("data", "shops").pluck("name"), "Confirmed Coffee"
  end

  test "users can report supported targets" do
    assert_difference -> { Report.count }, 1 do
      post api_v1_reports_path,
        params: {
          report: {
            reportable_type: "shop",
            reportable_id: shops(:bole).id,
            reason: "inaccurate_details",
            note: "The landmark has changed."
          }
        },
        headers: bearer_headers(users(:one)),
        as: :json
    end

    assert_response :created
    assert_equal "pending", response_json.dig("data", "status")
  end

  test "own contribution history is cursor paginated" do
    contribution = Contribution.record!(
      user: users(:one),
      contributable: Shop::Submission.new(
        name: "History Coffee",
        name_am: "የታሪክ ቡና",
        neighborhood: neighborhoods(:bole),
        landmark: "Near history",
        latitude: 8.998,
        longitude: 38.791
      )
    )

    get api_v1_contributions_path, headers: bearer_headers(users(:one)), as: :json

    assert_response :success
    assert_equal contribution.id, response_json.dig("data", 0, "id")
    assert_equal contribution.id, response_json.dig("meta", "next_cursor")
  end
end

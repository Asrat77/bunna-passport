require "test_helper"

class Console::DataGapsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as users(:two)
    @shop = shops(:bole)
    @shop.update_columns(landmark: "Bole, Addis Ababa")
  end

  test "shows Bole's gaps with a suggested landmark ready to save" do
    get console_data_gaps_path

    assert_response :success
    assert_select "h1", text: /Bole/
    assert_select "##{ActionView::RecordIdentifier.dom_id(@shop)} input[name=landmark]" do |inputs|
      assert_match(/from|near/i, inputs.first["value"])
    end
  end

  test "filters to one kind of gap" do
    @shop.update_columns(landmark: "Behind the test mall")

    get console_data_gaps_path(filter: "landmark")
    assert_select ".gaps-table", count: 0

    get console_data_gaps_path(filter: "photo")
    assert_select ".gaps-table tbody tr", count: 1
  end

  test "saves a landmark" do
    patch console_shop_landmark_path(@shop), params: { landmark: "  Behind Edna Mall " }

    assert_redirected_to console_data_gaps_path(neighborhood_id: @shop.neighborhood_id)
    assert_equal "Behind Edna Mall", @shop.reload.landmark
  end

  test "refuses a blank landmark" do
    patch console_shop_landmark_path(@shop), params: { landmark: " " }

    assert_equal "Bole, Addis Ababa", @shop.reload.landmark
    assert_match(/Landmark/, flash[:alert])
  end

  test "adds a photo" do
    image = Rack::Test::UploadedFile.new(Rails.root.join("public/icon.png"), "image/png")

    assert_difference -> { @shop.photos.count } do
      post console_shop_photos_path(@shop), params: { image: image }
    end
    assert_equal users(:two), @shop.photos.last.contributor
  end

  test "opens the merge form with the twin chosen" do
    twin = @shop.dup.tap { |shop| shop.assign_attributes(slug: "buna-house-2", latitude: @shop.latitude + 0.0003) }
    twin.save!

    get console_data_gaps_path(filter: "duplicate")
    assert_select "a[href=?]", new_console_shop_merge_path(@shop, winner_id: twin.id)

    get new_console_shop_merge_path(@shop, winner_id: twin.id)
    assert_select "option[selected][value=?]", twin.id.to_s
  end

  test "is for moderators only" do
    sign_in_as users(:one)

    get console_data_gaps_path
    assert_response :forbidden

    patch console_shop_landmark_path(@shop), params: { landmark: "Anywhere" }
    assert_response :forbidden
  end
end

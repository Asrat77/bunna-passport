require "test_helper"

class Shop::PriceBandTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup { @shop = shops(:bole) } # catalog says standard

  test "fewer than three people leave the catalog's band alone" do
    report(price: 400)
    report(price: 400)

    @shop.refresh_price_band_from_reports!

    assert_equal "standard", @shop.reload.price_band
    assert_not @shop.price_band_from_reports?
  end

  test "three people's prices set the band from the median" do
    report(price: 120)
    report(price: 150)
    report(price: 30)

    @shop.refresh_price_band_from_reports!

    assert_equal "premium", @shop.reload.price_band
    assert_equal 3, @shop.price_band_reports_count
  end

  test "each drink is judged against its own prices" do
    report(drink: "buna", price: 35)
    report(drink: "latte", price: 75)
    report(drink: "macchiato", price: 45)

    @shop.refresh_price_band_from_reports!

    assert_equal "budget", @shop.reload.price_band
  end

  test "one person counts once, by their latest price" do
    regular = create_user
    report(user: regular, price: 400, at: 3.days.ago)
    report(user: regular, price: 40, at: 1.day.ago)
    report(price: 40)
    report(price: 400)

    @shop.refresh_price_band_from_reports!

    assert_equal "budget", @shop.reload.price_band
    assert_equal 3, @shop.price_band_reports_count
  end

  test "hidden reviews, flagged visits, free-text drinks and old prices don't count" do
    report(price: 400)
    report(price: 400)
    report(price: 400, hidden: true)
    report(price: 400, status: :flagged)
    report(price: 400, drink: "tea")
    report(price: 400, at: (CheckIn::PRICE_WINDOW + 1.day).ago)

    @shop.refresh_price_band_from_reports!

    assert_equal "standard", @shop.reload.price_band
  end

  test "when reports age out the band stays but stops claiming them" do
    3.times { report(price: 400, at: 10.days.ago) }
    @shop.refresh_price_band_from_reports!
    assert_equal "splurge", @shop.reload.price_band

    @shop.refresh_price_band_from_reports!(now: CheckIn::PRICE_WINDOW.from_now)

    assert_equal "splurge", @shop.reload.price_band
    assert_equal 0, @shop.price_band_reports_count
  end

  test "saying a price queues a refresh of that shop, other edits don't" do
    check_in = report(price: nil)

    assert_enqueued_with(job: RefreshPriceBandsJob, args: [ @shop ]) { check_in.update!(price_birr: 60) }
    assert_no_enqueued_jobs(only: RefreshPriceBandsJob) { check_in.update!(rating: 4) }
    assert_enqueued_with(job: RefreshPriceBandsJob, args: [ @shop ]) { check_in.update!(review_hidden_at: Time.current) }
  end

  test "the nightly run refreshes every shop with reports" do
    3.times { report(price: 400) }

    RefreshPriceBandsJob.perform_now

    assert_equal "splurge", @shop.reload.price_band
  end

  test "the nightly run carries on past a shop that fails today's validations" do
    3.times { report(price: 400) }
    @shop.update_column(:landmark, "")

    RefreshPriceBandsJob.perform_now

    assert_equal "splurge", @shop.reload.price_band
  end

  test "a merge moves the loser's reported prices to the winner" do
    3.times { report(price: 400) }
    @shop.refresh_price_band_from_reports!
    winner = shops(:piassa) # catalog says budget

    @shop.merge_into!(winner, by: users(:two))

    assert_equal "splurge", winner.reload.price_band
    assert_equal 3, winner.price_band_reports_count
    assert_equal 0, @shop.reload.price_band_reports_count
  end

  private
    def report(price:, drink: "macchiato", user: create_user, at: 1.hour.ago, hidden: false, status: :verified)
      CheckIn.create!(
        user: user, shop: @shop, idempotency_key: SecureRandom.uuid, occurred_at: at,
        latitude: @shop.latitude, longitude: @shop.longitude, accuracy_meters: 10, distance_meters: 0,
        status: status, drink: drink, price_birr: price, review_hidden_at: (Time.current if hidden)
      )
    end
end

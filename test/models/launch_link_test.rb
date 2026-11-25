require "test_helper"

class LaunchLinkTest < ActiveSupport::TestCase
  test "builds a Telegram start parameter from its parts" do
    assert_equal "shop_12__src_qr-12", LaunchLink.start_param(shop: 12, source: "qr-12")
    assert_equal "invite_AbC123xyz9__src_card", LaunchLink.start_param(invite: "AbC123xyz9", source: "card")
    assert_nil LaunchLink.start_param
  end

  test "reads back what it builds, and the old invite-only format" do
    assert_equal LaunchLink::Params.new(invite: nil, shop: 12, source: "qr-12"), LaunchLink.parse("shop_12__src_qr-12")
    assert_equal LaunchLink::Params.new(invite: "AbC123xyz9", shop: nil, source: nil), LaunchLink.parse("invite_AbC123xyz9")
    assert_equal LaunchLink::Params.new(invite: nil, shop: nil, source: nil), LaunchLink.parse(nil)
  end

  test "drops what doesn't fit" do
    params = LaunchLink.parse("invite_x__shop_-3__src_!!!__Not-A-Slug!")
    assert_equal [ nil, nil, nil, nil ], [ params.invite, params.shop, params.source, params.slug ]
  end

  test "reads a bare slug as a café's QR stand" do
    params = LaunchLink.parse("buna-house")
    assert_equal "buna-house", params.slug
    assert_equal shops(:bole), params.shop_record
    assert_equal "qr-#{shops(:bole).id}", params.signup_source(params.shop_record)
    assert_equal "buna-house", LaunchLink.start_param(slug: "buna-house")
  end

  test "finds no café for an unknown or hidden slug, and follows a merge" do
    assert_nil LaunchLink.parse("nowhere-cafe").shop_record
    assert_nil LaunchLink.parse("nowhere-cafe").signup_source(nil)

    shops(:piassa).update_columns(status: "hidden")
    assert_nil LaunchLink.parse("city-coffee").shop_record

    shops(:piassa).update_columns(status: "merged", merged_into_id: shops(:bole).id)
    assert_equal shops(:bole), LaunchLink.parse("city-coffee").shop_record
  end

  test "a QR stand links by slug inside Telegram, and by id on the website" do
    with_env("TELEGRAM_BOT_USERNAME" => "bunnapassbot", "TELEGRAM_MINI_APP_NAME" => "app") do
      assert_equal "https://t.me/bunnapassbot/app?startapp=buna-house", LaunchLink.stand_url(shops(:bole), base_url: "https://x")
    end
    with_env("TELEGRAM_BOT_USERNAME" => nil, "PUBLIC_BASE_URL" => nil) do
      assert_equal "https://x/app?shop=#{shops(:bole).id}&src=qr-#{shops(:bole).id}", LaunchLink.stand_url(shops(:bole), base_url: "https://x")
    end
  end

  test "records the tag, or what kind of link it was" do
    assert_equal "qr-12", LaunchLink.parse("shop_12__src_qr-12").signup_source
    assert_equal "invite", LaunchLink.parse("invite_AbC123xyz9").signup_source
    assert_equal "shop", LaunchLink.parse("shop_12").signup_source
    assert_nil LaunchLink.parse("").signup_source
  end

  test "tidies a typed tag" do
    assert_equal "ig-addis-coffee", LaunchLink.clean_source(" IG Addis_Coffee! ")
    assert_nil LaunchLink.clean_source("---")
    assert_equal 40, LaunchLink.clean_source("a" * 60).length
  end

  test "points at the bot's Mini App when there is one, else at /app" do
    with_env("TELEGRAM_BOT_USERNAME" => "@bunnapassbot", "TELEGRAM_MINI_APP_NAME" => "app") do
      assert_equal "https://t.me/bunnapassbot/app?startapp=shop_12__src_qr-12", LaunchLink.url(base_url: "https://x", shop: 12, source: "qr-12")
    end
    with_env("TELEGRAM_BOT_USERNAME" => nil, "PUBLIC_BASE_URL" => nil) do
      assert_equal "https://bunna.example/app?shop=12&src=qr-12", LaunchLink.url(base_url: "https://bunna.example/", shop: 12, source: "qr-12")
    end
  end

  test "names the café behind a sticker's tag" do
    assert_equal 12, LaunchLink.sticker_shop_id("qr-12")
    assert_nil LaunchLink.sticker_shop_id("ig-qr-12")
    assert_nil LaunchLink.sticker_shop_id(nil)
  end

  private
    def with_env(values)
      previous = values.keys.index_with { |key| ENV[key] }
      values.each { |key, value| ENV[key] = value }
      yield
    ensure
      previous.each { |key, value| ENV[key] = value }
    end
end

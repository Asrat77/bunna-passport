require "test_helper"

class Telegram::WebhooksControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  test "queues a signed update" do
    with_fake_bot(env: { "TELEGRAM_WEBHOOK_SECRET" => "s3cret" }) do
      assert_enqueued_with(job: TelegramUpdateJob) do
        post telegram_webhook_path, params: update, as: :json, headers: { "X-Telegram-Bot-Api-Secret-Token" => "s3cret" }
      end
    end

    assert_response :ok
    assert_equal update, ActiveJob::Arguments.deserialize(enqueued_jobs.last[:args]).first
  end

  test "turns away a request without the secret" do
    with_fake_bot(env: { "TELEGRAM_WEBHOOK_SECRET" => "s3cret" }) do
      assert_no_enqueued_jobs do
        post telegram_webhook_path, params: update, as: :json, headers: { "X-Telegram-Bot-Api-Secret-Token" => "wrong" }
      end
    end

    assert_response :not_found
  end

  test "is closed until a secret is configured" do
    with_fake_bot(env: { "TELEGRAM_WEBHOOK_SECRET" => nil }) do
      post telegram_webhook_path, params: update, as: :json, headers: { "X-Telegram-Bot-Api-Secret-Token" => "" }
    end

    assert_response :not_found
  end

  private
    def update
      { "update_id" => 1, "message" => { "text" => "/start", "from" => { "id" => 5 }, "chat" => { "id" => 5, "type" => "private" } } }
    end
end

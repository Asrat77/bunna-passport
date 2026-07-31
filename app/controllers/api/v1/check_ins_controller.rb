class Api::V1::CheckInsController < Api::V1::BaseController
  rate_limit to: 20, within: 1.hour, only: :create

  def index
    check_ins = cursor_scope(Current.user.check_ins.reverse_chronologically.includes(:shop, :stamp))
    render_data(
      check_ins.map { |check_in| check_in_json(check_in) },
      meta: { next_cursor: check_ins.last&.id }
    )
  end

  def create
    input = check_in_params
    shop = Shop.live.find(input.delete(:shop_id))
    check_in = CheckIn.record!(user: Current.user, shop: shop, **input.to_h.symbolize_keys)

    if check_in.rejected?
      render_error(:unprocessable_entity, check_in.flag_reason, rejection_message(check_in.flag_reason))
    else
      render_data(check_in_json(check_in), status: :created)
    end
  end

  private
    def check_in_params
      params.expect(check_in: %i[
        shop_id idempotency_key latitude longitude accuracy_meters mock_location
        drink rating note photo
      ])
    end

    def rejection_message(code)
      {
        "weak_gps" => "Weak GPS signal. Try again outside.",
        "too_far" => "You are too far from this shop.",
        "cooldown" => "You already checked in here recently.",
        "daily_limit" => "Daily check-in limit reached."
      }.fetch(code, "Check-in rejected.")
    end
end

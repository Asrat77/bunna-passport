class Api::V1::CheckInsController < Api::V1::BaseController
  # How long after a visit its own rating and note can still be filled in. This
  # finishes a check-in; it is not an editable review.
  SAYING_WINDOW = 24.hours

  # Both limits need a name. Rails keys the counter on scope, name and client,
  # so two unnamed limits in one controller share a key and spend each other's
  # allowance.
  rate_limit to: 20, within: 1.hour, name: "create", only: :create
  rate_limit to: 30, within: 1.day, name: "update", only: :update

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

  # Says something about a visit already recorded. The ceremony asks right
  # after the stamp lands, which is the only moment anyone wants to answer.
  def update
    check_in = Current.user.check_ins.find(params[:id])

    if check_in.rejected?
      return render_error(
        :unprocessable_entity,
        "check_in_rejected",
        "A rejected check-in cannot carry a rating."
      )
    end

    if check_in.occurred_at < SAYING_WINDOW.ago
      return render_error(
        :unprocessable_entity,
        "saying_window_closed",
        "This check-in is too old to add to."
      )
    end

    check_in.update!(saying_params)
    render_data(check_in_json(check_in))
  end

  private
    def check_in_params
      params.expect(check_in: %i[
        shop_id idempotency_key latitude longitude accuracy_meters mock_location
        drink rating note photo
      ])
    end

    # Deliberately narrower than check_in_params: where someone was and when is
    # settled by the visit, and nothing said afterwards may revise it.
    def saying_params
      params.expect(check_in: %i[ drink rating note ])
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

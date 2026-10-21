# The signed launch payload Telegram hands a Mini App, verified as described
# in https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
#
# Only the signature makes it trustworthy: anything the client reads from
# initDataUnsafe is just as easy to forge, so identity comes from here alone.
class Telegram::InitData
  class Invalid < StandardError; end

  # Long enough for someone to keep the app open over a coffee, short enough
  # that a leaked payload stops working.
  MAX_AGE = 1.day

  attr_reader :user, :auth_date

  def self.verify!(raw, bot_token: ENV["TELEGRAM_BOT_TOKEN"], now: Time.current)
    new(raw, bot_token: bot_token, now: now)
  end

  def initialize(raw, bot_token:, now:)
    raise Invalid, "Telegram sign-in is not configured" if bot_token.blank?

    fields = Rack::Utils.parse_query(raw.to_s)
    hash = fields.delete("hash")
    raise Invalid, "initData is not signed" if hash.blank?

    check_string = fields.sort.map { |key, value| "#{key}=#{value}" }.join("\n")
    secret = OpenSSL::HMAC.digest("SHA256", "WebAppData", bot_token)
    expected = OpenSSL::HMAC.hexdigest("SHA256", secret, check_string)
    raise Invalid, "initData signature does not match" unless ActiveSupport::SecurityUtils.secure_compare(expected, hash)

    @auth_date = Time.at(Integer(fields.fetch("auth_date"))).utc
    raise Invalid, "initData has expired" if @auth_date < now - MAX_AGE

    @user = JSON.parse(fields.fetch("user"))
    raise Invalid, "initData has no user" unless @user.is_a?(Hash) && @user["id"].present?
  rescue KeyError, ArgumentError, TypeError, JSON::ParserError
    raise Invalid, "initData is malformed"
  end
end

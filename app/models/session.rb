class Session < ApplicationRecord
  LIFETIME = 90.days

  belongs_to :user

  scope :active, -> { where(expires_at: Time.current..) }

  def self.start_for(user, ip_address:, user_agent:)
    raw_token = SecureRandom.urlsafe_base64(32)
    session = user.sessions.create!(
      token_digest: digest(raw_token),
      ip_address: ip_address,
      user_agent: user_agent,
      last_seen_at: Time.current,
      expires_at: LIFETIME.from_now
    )

    [ session, raw_token ]
  end

  def self.authenticate(raw_token)
    return if raw_token.blank?

    active.find_by(token_digest: digest(raw_token))&.tap(&:seen)
  end

  def self.digest(raw_token)
    Digest::SHA256.hexdigest(raw_token)
  end

  def seen
    touch(:last_seen_at) if last_seen_at < 1.hour.ago
  end
end

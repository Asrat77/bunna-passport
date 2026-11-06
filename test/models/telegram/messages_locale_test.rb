require "test_helper"

# Both bot languages carry the same messages, so nobody gets a missing
# translation or an English line in the middle of Amharic.
class Telegram::MessagesLocaleTest < ActiveSupport::TestCase
  test "every bot string exists in English and Amharic with the same placeholders" do
    english = flatten(I18n.t("bot", locale: :en))
    amharic = flatten(I18n.t("bot", locale: :am))

    assert_equal english.keys.sort, amharic.keys.sort
    english.each do |key, text|
      assert_equal placeholders(text), placeholders(amharic.fetch(key)), "placeholders differ for bot.#{key}"
    end
  end

  test "every badge has a name in both languages" do
    Badge::DEFAULTS.each do |badge|
      %i[en am].each { |locale| assert I18n.exists?("bot.badges.#{badge[:slug]}.name", locale), "#{badge[:slug]} (#{locale})" }
    end
  end

  test "the command menu comes in both languages" do
    assert_equal "Open your passport", Telegram::Messages.commands(:en).first[:description]
    assert_equal "ፓስፖርትዎን ይክፈቱ", Telegram::Messages.commands(:am).first[:description]
    assert_equal Telegram::Messages.commands(:en).map { |c| c[:command] }, Telegram::Messages.commands(:am).map { |c| c[:command] }
  end

  test "a person with no known language gets English" do
    assert_equal :en, User.new.bot_locale
    assert_equal :am, User.new(language: "am").bot_locale
  end

  private
    def flatten(hash, prefix = nil)
      hash.each_with_object({}) do |(key, value), flat|
        path = [ prefix, key ].compact.join(".")
        value.is_a?(Hash) ? flat.merge!(flatten(value, path)) : flat[path] = value
      end
    end

    def placeholders(text)
      text.to_s.scan(/%\{(\w+)\}/).flatten.sort
    end
end

require "test_helper"
require "rake"

Rails.application.load_tasks unless Rake::Task.task_defined?("bunna:data_gaps")

class DataGapsTasksTest < ActiveSupport::TestCase
  setup do
    @shop = shops(:bole)
    @shop.update_columns(landmark: "Bole, Addis Ababa")
    %w[ bunna:data_gaps bunna:fill_landmarks ].each { |name| Rake::Task[name].reenable }
  end

  test "reports a neighbourhood's gaps" do
    output, _ = capture_io { Rake::Task["bunna:data_gaps"].invoke }

    assert_match(/Bole: 0\/1 complete · no photo 1 · weak landmark 1 \(1 suggested\) · duplicate pairs 0/, output)
    assert_match(/landmark   ##{@shop.id} Buna House: "Bole, Addis Ababa" -> /, output)
  end

  test "previews landmark fixes until told to apply them" do
    output, _ = capture_io { Rake::Task["bunna:fill_landmarks"].invoke }

    assert_match(/Would update 1 landmarks/, output)
    assert_equal "Bole, Addis Ababa", @shop.reload.landmark

    Rake::Task["bunna:fill_landmarks"].reenable
    with_env("APPLY" => "1") { capture_io { Rake::Task["bunna:fill_landmarks"].invoke } }

    assert_match(/from|near/i, @shop.reload.landmark)
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

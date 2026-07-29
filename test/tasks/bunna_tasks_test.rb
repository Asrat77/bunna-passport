require "test_helper"
require "rake"
require "csv"
require "fileutils"

Rails.application.load_tasks unless Rake::Task.task_defined?("bunna:bootstrap_reference_data")

class BunnaTasksTest < ActiveSupport::TestCase
  setup do
    reference_task.reenable
    founder_task.reenable
    local_import_task.reenable
  end

  teardown do
    reference_task.reenable
    founder_task.reenable
    local_import_task.reenable
  end

  test "production database preparation does not load seeds" do
    configuration = ActiveRecord::Base.configurations.configs_for(env_name: "production", name: "primary")

    refute configuration.seeds?
  end

  test "seed file aborts before writing outside development and test" do
    counts = [ Neighborhood.count, Badge.count, User.count, Shop.count ]
    error = nil

    _stdout, stderr = capture_io do
      error = assert_raises(SystemExit) do
        with_rails_environment("production") { load Rails.root.join("db/seeds.rb") }
      end
    end

    assert_equal 1, error.status
    assert_includes stderr, "db:seed is available only in development and test"
    assert_equal counts, [ Neighborhood.count, Badge.count, User.count, Shop.count ]
  end

  test "reference bootstrap is idempotent and creates no users or shops" do
    users_count = User.count
    shops_count = Shop.count

    capture_io { reference_task.invoke }
    neighborhood_ids = Neighborhood.where(name: Neighborhood::DEFAULTS.pluck(:name)).order(:name).ids
    badge_ids = Badge.where(slug: Badge::DEFAULTS.pluck(:slug)).order(:slug).ids

    reference_task.reenable
    capture_io { reference_task.invoke }

    assert_equal Neighborhood::DEFAULTS.size, neighborhood_ids.size
    assert_equal Badge::DEFAULTS.size, badge_ids.size
    assert_equal neighborhood_ids, Neighborhood.where(name: Neighborhood::DEFAULTS.pluck(:name)).order(:name).ids
    assert_equal badge_ids, Badge.where(slug: Badge::DEFAULTS.pluck(:slug)).order(:slug).ids
    assert_equal users_count, User.count
    assert_equal shops_count, Shop.count
  end

  test "founder bootstrap remains separate and idempotent" do
    with_environment(
      "BUNNA_FOUNDER_EMAIL" => "founder-bootstrap@example.com",
      "BUNNA_FOUNDER_HANDLE" => "founder_bootstrap",
      "BUNNA_FOUNDER_PASSWORD" => "development-password"
    ) do
      capture_io { founder_task.invoke }
      founder = User.find_by!(email_address: "founder-bootstrap@example.com")

      founder_task.reenable
      capture_io { founder_task.invoke }

      assert_predicate founder.reload, :moderator?
      assert_equal 1, User.where(email_address: "founder-bootstrap@example.com").count
    end
  end

  test "local shop import task refuses test and production environments" do
    %w[ test production ].each do |environment|
      local_import_task.reenable
      error = nil

      _stdout, stderr = capture_io do
        error = assert_raises(SystemExit) do
          with_rails_environment(environment) { local_import_task.invoke }
        end
      end

      assert_equal 1, error.status
      assert_includes stderr, "Local shop imports are available only in development"
    end
  end

  test "local shop import task wires the ignored catalog to the importer" do
    FileUtils.mkdir_p(Shop::LocalCatalog::DATA_ROOT)
    directory = Pathname(Dir.mktmpdir("task-catalog-", Shop::LocalCatalog::DATA_ROOT))
    catalog_path = directory.join("shops.csv")
    FileUtils.cp(Rails.root.join("public/icon.png"), directory.join("front.png"))
    CSV.open(catalog_path, "w", write_headers: true, headers: Shop::LocalCatalog::REQUIRED_HEADERS) do |csv|
      csv << [
        "task-imported-shop",
        "Task Imported Shop",
        "በትዕዛዝ የገባ ቡና ቤት",
        "Bole",
        "Local task landmark",
        "8.9944",
        "38.7879",
        "front.png"
      ]
    end

    with_environment(
      "BUNNA_LOCAL_IMPORTER_EMAIL" => users(:two).email_address,
      "BUNNA_LOCAL_SHOPS_FILE" => catalog_path.to_s
    ) do
      with_rails_environment("development") do
        stdout, _stderr = capture_io { local_import_task.invoke }

        assert_includes stdout, "Local catalog ready: 1 shops, 1 new photos"
      end
    end

    assert Shop.exists?(slug: "task-imported-shop")
  ensure
    FileUtils.remove_entry(directory) if directory&.exist?
  end

  private
    def reference_task
      Rake::Task["bunna:bootstrap_reference_data"]
    end

    def founder_task
      Rake::Task["bunna:bootstrap_founder"]
    end

    def local_import_task
      Rake::Task["bunna:import_local_shops"]
    end

    def with_environment(values)
      previous_values = values.to_h { |key, _value| [ key, ENV[key] ] }
      values.each { |key, value| ENV[key] = value }
      yield
    ensure
      previous_values.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    end

    def with_rails_environment(name)
      original_environment = Rails.method(:env)
      environment = ActiveSupport::EnvironmentInquirer.new(name)
      Rails.define_singleton_method(:env) { environment }
      yield
    ensure
      Rails.define_singleton_method(:env, original_environment)
    end
end

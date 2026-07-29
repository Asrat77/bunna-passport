require "test_helper"
require "csv"
require "fileutils"

class Shop::LocalCatalogTest < ActiveSupport::TestCase
  setup do
    FileUtils.mkdir_p(Shop::LocalCatalog::DATA_ROOT)
    @directory = Pathname(Dir.mktmpdir("catalog-", Shop::LocalCatalog::DATA_ROOT))
    @catalog_path = @directory.join("shops.csv")
    @photo_path = @directory.join("front.png")
    FileUtils.cp(Rails.root.join("public/icon.png"), @photo_path)
  end

  teardown do
    FileUtils.remove_entry(@directory) if @directory&.exist?
  end

  test "imports shops and photos from the ignored local data directory" do
    write_catalog

    assert_difference -> { Shop.count } => 1, -> { Shop::Photo.count } => 1 do
      result = catalog.import!

      assert_equal 1, result.shops_count
      assert_equal 1, result.photos_count
    end

    shop = Shop.find_by!(slug: "local-bole-coffee")
    assert_equal "Local Bole Coffee", shop.name
    assert_equal neighborhoods(:bole), shop.neighborhood
    assert_equal users(:two), shop.submitted_by
    assert_predicate shop, :live?
    assert_equal({ "wifi" => true, "jebena_service" => true }, shop.amenities)
    assert_predicate shop.photos.first.image, :attached?
  end

  test "rerunning updates the stable slug without duplicating its photo" do
    write_catalog
    catalog.import!
    write_catalog(landmark: "Updated local landmark")

    assert_no_difference [ "Shop.count", "Shop::Photo.count" ] do
      result = catalog.import!

      assert_equal 1, result.shops_count
      assert_equal 0, result.photos_count
    end

    assert_equal "Updated local landmark", Shop.find_by!(slug: "local-bole-coffee").landmark
  end

  test "requires all launch-quality fields" do
    CSV.open(@catalog_path, "w", write_headers: true, headers: %w[ slug name ]) do |csv|
      csv << [ "incomplete", "Incomplete" ]
    end

    error = assert_raises(ArgumentError) { catalog.import! }

    assert_includes error.message, "Missing CSV headers"
    assert_includes error.message, "photo_paths"
  end

  test "rejects catalogs outside the ignored local directory" do
    outside_catalog = Rails.root.join("tmp/outside-local-catalog.csv")
    FileUtils.cp(@catalog_path.tap { write_catalog }, outside_catalog)

    error = assert_raises(ArgumentError) do
      Shop::LocalCatalog.new(path: outside_catalog, contributor: users(:two)).import!
    end

    assert_includes error.message, "must stay under"
  ensure
    FileUtils.rm_f(outside_catalog)
  end

  test "rejects photos outside the ignored local directory" do
    outside_photo = Rails.root.join("tmp/outside-local-photo.png")
    FileUtils.cp(@photo_path, outside_photo)
    write_catalog(photo_paths: "../../../tmp/outside-local-photo.png")

    error = assert_raises(ArgumentError) { catalog.import! }

    assert_includes error.message, "must stay under"
  ensure
    FileUtils.rm_f(outside_photo)
  end

  test "rejects direct imports in production" do
    write_catalog
    error = nil

    with_rails_environment("production") do
      error = assert_raises(RuntimeError) { catalog.import! }
    end

    assert_includes error.message, "available only in development"
    refute Shop.exists?(slug: "local-bole-coffee")
  end

  private
    def catalog
      Shop::LocalCatalog.new(path: @catalog_path, contributor: users(:two))
    end

    def write_catalog(landmark: "Across from the local test landmark", photo_paths: "front.png")
      headers = %w[
        slug name name_am neighborhood landmark latitude longitude photo_paths
        city price_band amenities status
      ]

      CSV.open(@catalog_path, "w", write_headers: true, headers: headers) do |csv|
        csv << {
          "slug" => "local-bole-coffee",
          "name" => "Local Bole Coffee",
          "name_am" => "የአካባቢ ቦሌ ቡና",
          "neighborhood" => "Bole",
          "landmark" => landmark,
          "latitude" => "8.9943",
          "longitude" => "38.7878",
          "photo_paths" => photo_paths,
          "city" => "Addis Ababa",
          "price_band" => "standard",
          "amenities" => "wifi|jebena_service",
          "status" => "live"
        }
      end
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

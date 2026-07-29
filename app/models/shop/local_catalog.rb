require "csv"

class Shop::LocalCatalog
  DATA_ROOT = Rails.root.join("storage/local_seed_data")
  REQUIRED_HEADERS = %w[
    slug name name_am neighborhood landmark latitude longitude photo_paths
  ].freeze
  Result = Data.define(:shops_count, :photos_count)

  def initialize(path:, contributor:)
    @path = Pathname(path)
    @contributor = contributor
  end

  def import!
    unless Rails.env.development? || Rails.env.test?
      raise "Local shop imports are available only in development"
    end

    table = CSV.read(catalog_path, headers: true)
    validate_headers!(table.headers)
    rows = table.reject { |row| row.fields.all?(&:blank?) }
    photos_count = 0

    rows.each.with_index(2) do |row, line_number|
      photos_count += import_row!(row, line_number)
    end

    Result.new(shops_count: rows.size, photos_count: photos_count)
  end

  private
    attr_reader :path, :contributor

    def import_row!(row, line_number)
      shop = Shop.find_or_initialize_by(slug: required_value(row, "slug"))
      shop.assign_attributes(
        name: required_value(row, "name"),
        name_am: required_value(row, "name_am"),
        neighborhood: neighborhood_for(row),
        landmark: required_value(row, "landmark"),
        latitude: required_value(row, "latitude"),
        longitude: required_value(row, "longitude"),
        price_band: row["price_band"].presence,
        amenities: amenities_for(row),
        status: row["status"].presence || "live"
      )
      shop.submitted_by ||= contributor
      shop.save!

      photo_paths_for(row).count { |photo_path| attach_photo!(shop, photo_path) }
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotFound, ArgumentError => error
      raise ArgumentError, "Row #{line_number}: #{error.message}"
    end

    def neighborhood_for(row)
      Neighborhood.find_by!(
        city: row["city"].presence || "Addis Ababa",
        name: required_value(row, "neighborhood")
      )
    end

    def amenities_for(row)
      row["amenities"].to_s.split("|").filter_map do |amenity|
        amenity.strip.presence
      end.index_with(true)
    end

    def photo_paths_for(row)
      paths = required_value(row, "photo_paths").split("|").filter_map do |photo_path|
        photo_path.strip.presence
      end
      raise ArgumentError, "photo_paths must contain at least one relative path" if paths.empty?

      paths
    end

    def attach_photo!(shop, relative_path)
      photo_path = local_photo_path(relative_path)
      filename = photo_path.basename.to_s
      return false if shop.photos.joins(image_attachment: :blob).exists?(active_storage_blobs: { filename: filename })

      photo_path.open("rb") do |file|
        shop.photos.create!(
          contributor: contributor,
          image: {
            io: file,
            filename: filename,
            content_type: Marcel::MimeType.for(photo_path, name: filename)
          }
        )
      end

      true
    end

    def validate_headers!(headers)
      missing_headers = REQUIRED_HEADERS - Array(headers)
      raise ArgumentError, "Missing CSV headers: #{missing_headers.to_sentence}" if missing_headers.any?
    end

    def required_value(row, header)
      row[header].presence || raise(ArgumentError, "#{header} cannot be blank")
    end

    def catalog_path
      @catalog_path ||= begin
        candidate = path.absolute? ? path : Rails.root.join(path)
        resolved_path = candidate.realpath
        ensure_local_path!(resolved_path)
        raise ArgumentError, "Catalog is not a file: #{candidate}" unless resolved_path.file?

        resolved_path
      rescue Errno::ENOENT
        raise ArgumentError, "Catalog does not exist: #{candidate}"
      end
    end

    def local_photo_path(relative_path)
      candidate = Pathname(relative_path)
      raise ArgumentError, "Photo paths must be relative: #{relative_path}" if candidate.absolute?

      resolved_path = catalog_path.dirname.join(candidate).realpath
      ensure_local_path!(resolved_path)
      raise ArgumentError, "Photo is not a file: #{relative_path}" unless resolved_path.file?

      resolved_path
    rescue Errno::ENOENT
      raise ArgumentError, "Photo does not exist: #{relative_path}"
    end

    def ensure_local_path!(resolved_path)
      root = DATA_ROOT.realpath
      within_root = resolved_path == root ||
        resolved_path.to_s.start_with?("#{root}#{File::SEPARATOR}")
      raise ArgumentError, "Local catalog files must stay under #{DATA_ROOT}" unless within_root
    rescue Errno::ENOENT
      raise ArgumentError, "Local data directory does not exist: #{DATA_ROOT}"
    end
end

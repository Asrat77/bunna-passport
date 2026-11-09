# Turns a contribution into something a moderator can judge at a glance:
# readable labels, hours as times, amenities as words, and pins as map links.
module Console::ContributionsHelper
  KIND_LABELS = {
    "Shop::Submission" => "New café",
    "Shop::Edit" => "Café edit",
    "Shop::PhotoSubmission" => "Photo"
  }.freeze

  FIELD_LABELS = {
    "name" => "Name",
    "name_am" => "Amharic name",
    "neighborhood_id" => "Neighborhood",
    "landmark" => "Landmark",
    "price_band" => "Price",
    "amenities" => "Amenities",
    "hours" => "Hours"
  }.freeze

  DAY_ABBREVIATIONS = Shop::Hours::DAYS.index_with { |day| day.first(3).capitalize }.freeze

  # Reasons a moderator can pick instead of typing one out, by kind. The
  # person who sent the contribution sees the reason in Telegram.
  REJECTION_REASONS = {
    duplicate: "It's already on Bunna (duplicate).",
    not_a_cafe: "This isn't a café that serves coffee.",
    location: "The location looks wrong.",
    details: "Some details look wrong or incomplete.",
    photo: "The photo isn't clearly of this café."
  }.freeze

  REJECTION_REASONS_BY_KIND = {
    "Shop::Submission" => %i[ duplicate not_a_cafe location details photo ],
    "Shop::Edit" => %i[ location details ],
    "Shop::PhotoSubmission" => %i[ photo ]
  }.freeze

  def rejection_reasons_for(contribution)
    keys = REJECTION_REASONS_BY_KIND.fetch(contribution.contributable_type, REJECTION_REASONS.keys)
    keys -= [ :photo ] if contribution.shop_submission? && !contribution.contributable.photo.attached?
    REJECTION_REASONS.values_at(*keys)
  end

  def contribution_kind(contribution)
    KIND_LABELS.fetch(contribution.contributable_type, contribution.contributable_type.demodulize.titleize)
  end

  def contribution_title(contribution)
    "#{contribution_kind(contribution)}: #{contribution.shop_name}"
  end

  # One line on what the contribution would do, for the queue table.
  def contribution_summary(contribution)
    item = contribution.contributable
    case item
    when Shop::Submission
      [ item.neighborhood&.name, item.landmark ].compact_blank.join(" · ")
    when Shop::Edit
      changes = item.proposed_changes.to_h.stringify_keys
      parts = changes.except("latitude", "longitude").map do |field, value|
        field.in?(%w[ name name_am landmark price_band ]) ? "#{contribution_field_label(field)}: #{field == "price_band" ? value.to_s.humanize : value}" : "New #{contribution_field_label(field).downcase}"
      end
      parts.unshift("Pin moved") if changes.key?("latitude") || changes.key?("longitude")
      parts.join(" · ")
    when Shop::PhotoSubmission
      item.caption.presence || "No caption"
    end
  end

  def contribution_field_label(field)
    FIELD_LABELS.fetch(field.to_s, field.to_s.humanize)
  end

  # A field's value as words, whichever field it is.
  def contribution_value(field, value)
    case field.to_s
    when "neighborhood_id" then Neighborhood.find_by(id: value)&.name
    when "price_band" then value.to_s.humanize.presence
    when "amenities" then amenity_words(value)
    when "hours" then hours_lines(value)
    else value.presence
    end
  end

  def amenity_words(amenities)
    names = amenities.to_h.select { |_name, present| ActiveModel::Type::Boolean.new.cast(present) }.keys
    names.map(&:humanize).to_sentence.presence
  end

  # Days with the same hours grouped together: "Mon, Tue, Wed 07:00–20:00".
  def hours_lines(schedule)
    return if schedule.blank?

    days = schedule.to_h.stringify_keys.slice(*Shop::Hours::DAYS)
    by_hours = days.group_by do |_day, intervals|
      Array(intervals).map { |interval| interval.to_h.stringify_keys.values_at("opens", "closes").join("–") }.join(", ")
    end
    lines = by_hours.map do |times, entries|
      "#{entries.map { |day, _| DAY_ABBREVIATIONS.fetch(day) }.join(", ")} #{times.presence || 'closed'}"
    end
    safe_join(lines, tag.br)
  end

  def map_link(latitude, longitude, label = nil)
    return if latitude.blank? || longitude.blank?

    url = "https://www.openstreetmap.org/?mlat=#{latitude}&mlon=#{longitude}#map=18/#{latitude}/#{longitude}"
    link_to(label || "#{latitude.to_f.round(5)}, #{longitude.to_f.round(5)}", url, target: "_blank", rel: "noopener")
  end

  # The rows of an edit's before/after table. Before is the café as it is
  # now while the edit waits, and as it was before the edit once applied.
  def edit_rows(edit, contribution)
    changes = edit.proposed_changes.to_h.stringify_keys
    applied = contribution.accepted? && edit.previous_values.present?
    before_values = applied ? edit.previous_values.to_h.stringify_keys : current_values(edit.shop, changes.keys)

    rows = []
    if changes.key?("latitude") || changes.key?("longitude")
      old_lat = before_values.fetch("latitude", edit.shop.latitude)
      old_lng = before_values.fetch("longitude", edit.shop.longitude)
      new_lat = changes.fetch("latitude", old_lat)
      new_lng = changes.fetch("longitude", old_lng)
      moved = Shop.new(latitude: old_lat, longitude: old_lng).distance_from(latitude: new_lat, longitude: new_lng).round
      rows << { label: "Pin", before: map_link(old_lat, old_lng),
        after: safe_join([ map_link(new_lat, new_lng), " ", tag.small("moved #{moved} m", class: "muted") ]) }
    end

    changes.except("latitude", "longitude").each do |field, value|
      rows << { label: contribution_field_label(field), before: contribution_value(field, before_values[field]), after: contribution_value(field, value) }
    end
    rows
  end

  private
    def current_values(shop, fields)
      fields.index_with { |field| field == "hours" ? shop.hours&.schedule : shop[field] }
    end
end

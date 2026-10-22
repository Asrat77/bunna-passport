# The drink on a check-in is whatever label the visitor's language gave it,
# so "Macchiato" and "macchiato " count as one; the most common spelling wins.
module Stats::Drinks
  module_function

  def top(check_ins, limit:)
    check_ins.where.not(drink: [ nil, "" ]).pluck(:drink)
      .map(&:strip).reject(&:empty?)
      .group_by(&:downcase).values
      .map { |spellings| { name: spellings.tally.max_by { |name, count| [ count, name ] }.first, cups: spellings.size } }
      .sort_by { |drink| [ -drink[:cups], drink[:name] ] }
      .first(limit)
  end
end

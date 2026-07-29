class Shop::Name
  def self.normalize(value)
    value.to_s
      .unicode_normalize(:nfkc)
      .downcase
      .gsub(/\b(coffee|cafe|café)\b/, "")
      .gsub("ቡና", "")
      .gsub(/[^[:alnum:]]/, "")
  end

  def self.similarity(left, right)
    left = normalize(left)
    right = normalize(right)
    return 1.0 if left == right
    return 0.0 if left.empty? || right.empty?

    distance = levenshtein(left, right)
    1.0 - distance.fdiv([ left.length, right.length ].max)
  end

  def self.levenshtein(left, right)
    previous = (0..right.length).to_a

    left.each_char.with_index(1) do |left_character, row|
      current = [ row ]
      right.each_char.with_index(1) do |right_character, column|
        current[column] = [
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (left_character == right_character ? 0 : 1)
        ].min
      end
      previous = current
    end

    previous.last
  end

  private_class_method :levenshtein
end

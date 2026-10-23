# The Mini App's seeded randomness (web/src/design/hash.ts), so a card drawn
# here matches the stamp and doodle the user saw on their phone. Everything is
# kept in unsigned 32 bits, which is what JavaScript's `>>> 0` gives.
module ShareCard::Seed
  MASK = 0xFFFFFFFF

  module_function

  # FNV-1a over UTF-16 code units, as the design canvas hashes every seed.
  def fnv1a(value)
    value.to_s.encode("UTF-16LE").unpack("v*").reduce(2166136261) do |hash, unit|
      ((hash ^ unit) * 16777619) & MASK
    end
  end

  # mulberry32: returns a lambda that yields floats in [0, 1).
  def mulberry32(seed)
    state = seed & MASK
    lambda do
      state = (state + 0x6D2B79F5) & MASK
      t = state
      t = ((t ^ (t >> 15)) * (t | 1)) & MASK
      t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & MASK)) & MASK
      (t ^ (t >> 14)).fdiv(4294967296)
    end
  end
end

/**
 * Client-side mirror of `Shop::Name.normalize` (app/models/shop/name.rb).
 *
 * Offline search has to collapse the same variants the server does, or
 * "Tomoca", "To.Mo.Ca" and "ቶሞካ" stop matching the moment the user loses
 * signal. If the Ruby implementation changes, this must change with it.
 */

const GENERIC_WORDS = /\b(coffee|cafe|café)\b/g;
const AMHARIC_BUNNA = /ቡና/g;
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]/gu;

export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(GENERIC_WORDS, "")
    .replace(AMHARIC_BUNNA, "")
    .replace(NON_ALPHANUMERIC, "");
}

/**
 * A shop's stored search key holds both scripts so one LIKE covers either.
 * The separator is a character `normalizeName` strips, so it can never be
 * produced by a query and cannot create a false match across the boundary.
 */
export function buildSearchKey(name: string, nameAm: string): string {
  return `${normalizeName(name)} ${normalizeName(nameAm)}`;
}

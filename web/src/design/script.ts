/** Ethiopic script range (U+1200–U+137F) plus the supplement blocks. */
const ETHIOPIC = /[ሀ-᎟ⶀ-⷟꬀-꬯]/;

export function isEthiopic(text: string): boolean {
  return ETHIOPIC.test(text);
}

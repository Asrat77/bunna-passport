import { isEthiopic } from "../script";

/**
 * Derives up to two display characters. Ethiopic syllables carry a whole
 * consonant-vowel pair each, so one fidel reads as much as two Latin letters:
 * take one per word for Amharic, two letters for a one-word Latin name.
 */
export function initialsFor(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  if (isEthiopic(label)) {
    return words.length > 1
      ? `${[...words[0]][0]}${[...words[1]][0]}`
      : [...words[0]].slice(0, 2).join("");
  }

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

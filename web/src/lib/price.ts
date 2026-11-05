import type { PriceBand } from "@/api/types";

/**
 * The i18n key for each price band. Bands used to render as repeated birr
 * signs ("ብርብርብር"), which read as "birr birr birr" rather than as a price
 * level, so each band now gets a word of its own in both languages.
 */
export const PRICE_LABEL_KEYS = {
  budget: "price.budget",
  standard: "price.standard",
  premium: "price.premium",
  splurge: "price.splurge",
} as const satisfies Record<PriceBand, string>;

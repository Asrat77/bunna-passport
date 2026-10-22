import type { PriceBand } from "@/api/types";

/** Price bands as birr signs, one to four, the way people say it. */
export const PRICE_GLYPHS: Record<PriceBand, string> = {
  budget: "ብር",
  standard: "ብርብር",
  premium: "ብርብርብር",
  splurge: "ብርብርብርብር",
};

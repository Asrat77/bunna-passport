import { describe, expect, it } from "vitest";
import { appendFields } from "./client";

describe("appendFields", () => {
  it("flattens a café submission into the fields Rails reads back", () => {
    const form = new FormData();
    appendFields(form, "shop", {
      name: "Corner Buna",
      latitude: 9.03,
      duplicate_override: false,
      price_band: undefined,
      hours: { monday: [{ opens: "07:00", closes: "20:00" }] },
    });

    expect([...form.entries()]).toEqual([
      ["shop[name]", "Corner Buna"],
      ["shop[latitude]", "9.03"],
      ["shop[duplicate_override]", "false"],
      ["shop[hours][monday][][opens]", "07:00"],
      ["shop[hours][monday][][closes]", "20:00"],
    ]);
  });
});

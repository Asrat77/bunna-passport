import { describe, expect, it } from "vitest";
import type { Shop } from "@/api/types";
import { editFormFor, hoursFromSchedule, hoursValid, nearestNeighborhood, proposedChanges, scheduleFromHours, submissionFor } from "./form";

const bole = { id: 1, name: "Bole", name_am: "ቦሌ" };
const piassa = { id: 2, name: "Piassa", name_am: "ፒያሳ" };

function shop(overrides: Partial<Shop> = {}): Shop {
  return {
    id: 10,
    name: "Tomoca",
    name_am: "ቶሞካ",
    slug: "tomoca",
    neighborhood: bole,
    landmark: "Across from Edna Mall",
    latitude: 9.0,
    longitude: 38.78,
    status: "live",
    price_band: "standard",
    attributes: {},
    hours: {
      schedule: { monday: [{ opens: "07:00", closes: "20:00" }], tuesday: [{ opens: "07:00", closes: "20:00" }] },
      freshness: "fresh",
      confirmed_at: null,
    },
    updated_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

describe("hours", () => {
  it("reads a uniform schedule back into the form", () => {
    const form = hoursFromSchedule(shop().hours!.schedule);
    expect(form).toMatchObject({ known: true, days: ["monday", "tuesday"], opens: "07:00", closes: "20:00", varied: false });
  });

  it("flags a schedule that changes by day", () => {
    const form = hoursFromSchedule({ monday: [{ opens: "07:00", closes: "20:00" }], sunday: [{ opens: "09:00", closes: "18:00" }] });
    expect(form.varied).toBe(true);
  });

  it("treats an empty schedule as not known yet", () => {
    expect(hoursFromSchedule({}).known).toBe(false);
  });

  it("writes only the picked days", () => {
    const schedule = scheduleFromHours({ known: true, days: ["friday"], opens: "08:00", closes: "02:00", varied: false });
    expect(schedule).toEqual({ friday: [{ opens: "08:00", closes: "02:00" }] });
  });

  it("refuses no days or the same open and close time", () => {
    expect(hoursValid({ known: true, days: [], opens: "08:00", closes: "20:00", varied: false })).toBe(false);
    expect(hoursValid({ known: true, days: ["monday"], opens: "08:00", closes: "08:00", varied: false })).toBe(false);
  });
});

describe("proposedChanges", () => {
  it("is empty for an untouched form", () => {
    expect(proposedChanges(shop(), editFormFor(shop()))).toEqual({});
  });

  it("sends only the fields that changed", () => {
    const form = { ...editFormFor(shop()), landmark: "  Behind Bole Medhanialem ", neighborhoodId: piassa.id };
    expect(proposedChanges(shop(), form)).toEqual({ landmark: "Behind Bole Medhanialem", neighborhood_id: 2 });
  });

  it("ignores a blanked-out name", () => {
    expect(proposedChanges(shop(), { ...editFormFor(shop()), name: "  " })).toEqual({});
  });

  it("sends new hours, and nothing when they match", () => {
    const form = editFormFor(shop());
    expect(proposedChanges(shop(), { ...form, hours: { ...form.hours, closes: "21:00" } })).toEqual({
      hours: { monday: [{ opens: "07:00", closes: "21:00" }], tuesday: [{ opens: "07:00", closes: "21:00" }] },
    });
  });

  it("moves the pin only when it's really somewhere else", () => {
    const form = editFormFor(shop());
    expect(proposedChanges(shop(), { ...form, pin: { latitude: 9.00005, longitude: 38.78 } })).toEqual({});
    expect(proposedChanges(shop(), { ...form, pin: { latitude: 9.001, longitude: 38.78 } })).toEqual({ latitude: 9.001, longitude: 38.78 });
  });
});

describe("new café", () => {
  it("guesses the area from the nearest café", () => {
    const shops = [shop(), shop({ id: 11, neighborhood: piassa, latitude: 9.03, longitude: 38.75 })];
    expect(nearestNeighborhood(shops, { latitude: 9.029, longitude: 38.751 })).toBe(2);
  });

  it("leaves unknown hours and price out of the submission", () => {
    const body = submissionFor(
      {
        name: " Abol ",
        nameAm: "አቦል",
        landmark: "Next to the bank",
        neighborhoodId: 1,
        priceBand: null,
        hours: { known: false, days: [], opens: "07:00", closes: "20:00", varied: false },
        pin: { latitude: 9.0123456789, longitude: 38.7 },
      },
      false,
    );
    expect(body).toEqual({
      name: "Abol",
      name_am: "አቦል",
      landmark: "Next to the bank",
      neighborhood_id: 1,
      latitude: 9.012346,
      longitude: 38.7,
      duplicate_override: false,
    });
  });
});

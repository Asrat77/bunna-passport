import { distanceMeters } from "@/lib/distance";
/** Monday first, the way people read a week of opening hours. */
export const WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
/** Mirrors the shops.price_band check constraint. */
export const PRICE_BANDS = ["budget", "standard", "premium", "splurge"];
/**
 * A pin closer than this to where the café already is isn't a correction,
 * just GPS wobble, so it isn't sent.
 */
export const PIN_MOVE_METERS = 25;
/** A fix vaguer than this can't place a café. */
export const MAX_PIN_ACCURACY_METERS = 150;
export const DEFAULT_HOURS = {
    known: false,
    days: [...WEEK],
    opens: "07:00",
    closes: "20:00",
    varied: false,
};
export function hoursFromSchedule(schedule) {
    const days = WEEK.filter((day) => (schedule?.[day]?.length ?? 0) > 0);
    if (!schedule || days.length === 0)
        return { ...DEFAULT_HOURS, days: [...WEEK] };
    const first = schedule[days[0]][0];
    const varied = days.some((day) => {
        const intervals = schedule[day];
        return intervals.length !== 1 || intervals[0].opens !== first.opens || intervals[0].closes !== first.closes;
    });
    return { known: true, days, opens: first.opens, closes: first.closes, varied };
}
export function hoursValid(hours) {
    if (!hours.known)
        return true;
    const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    return hours.days.length > 0 && clock.test(hours.opens) && clock.test(hours.closes) && hours.opens !== hours.closes;
}
/** The server's shape: a day left out is a day the café is closed. */
export function scheduleFromHours(hours) {
    if (!hours.known)
        return {};
    const schedule = {};
    for (const day of WEEK) {
        if (hours.days.includes(day))
            schedule[day] = [{ opens: hours.opens, closes: hours.closes }];
    }
    return schedule;
}
function sameSchedule(a, b) {
    return WEEK.every((day) => {
        const left = a?.[day] ?? [];
        const right = b[day] ?? [];
        return (left.length === right.length &&
            left.every((interval, index) => interval.opens === right[index].opens && interval.closes === right[index].closes));
    });
}
/** Six decimals is about 10 cm, far finer than any phone's fix. */
const round = (value) => Math.round(value * 1e6) / 1e6;
export function editFormFor(shop) {
    return {
        name: shop.name,
        nameAm: shop.name_am,
        landmark: shop.landmark,
        neighborhoodId: shop.neighborhood.id,
        priceBand: shop.price_band,
        hours: hoursFromSchedule(shop.hours?.schedule),
        pin: null,
    };
}
/**
 * Only what actually differs, so a moderator reviews one field, not seven.
 * Blank text is ignored rather than sent: emptying a name isn't a correction.
 */
export function proposedChanges(shop, form) {
    const changes = {};
    const name = form.name.trim();
    const nameAm = form.nameAm.trim();
    const landmark = form.landmark.trim();
    if (name && name !== shop.name)
        changes.name = name;
    if (nameAm && nameAm !== shop.name_am)
        changes.name_am = nameAm;
    if (landmark && landmark !== shop.landmark)
        changes.landmark = landmark;
    if (form.neighborhoodId !== shop.neighborhood.id)
        changes.neighborhood_id = form.neighborhoodId;
    if (form.priceBand !== shop.price_band)
        changes.price_band = form.priceBand;
    if (form.hours.known && hoursValid(form.hours)) {
        const schedule = scheduleFromHours(form.hours);
        if (!sameSchedule(shop.hours?.schedule, schedule))
            changes.hours = schedule;
    }
    if (form.pin && distanceMeters(form.pin, shop) >= PIN_MOVE_METERS) {
        changes.latitude = round(form.pin.latitude);
        changes.longitude = round(form.pin.longitude);
    }
    return changes;
}
/** Every area the catalog knows, A to Z in the reader's script. */
export function neighborhoodsOf(shops, language) {
    const byId = new Map();
    for (const shop of shops)
        byId.set(shop.neighborhood.id, shop.neighborhood);
    const label = (area) => (language === "am" && area.name_am ? area.name_am : area.name);
    return [...byId.values()].sort((a, b) => label(a).localeCompare(label(b), language));
}
/** The area of the café nearest to a point: a good first guess for a new one. */
export function nearestNeighborhood(shops, at) {
    let best = null;
    for (const shop of shops) {
        const meters = distanceMeters(at, shop);
        if (!best || meters < best.meters)
            best = { id: shop.neighborhood.id, meters };
    }
    return best?.id ?? null;
}
export function submissionFor(form, duplicateOverride) {
    const shop = {
        name: form.name.trim(),
        name_am: form.nameAm.trim(),
        landmark: form.landmark.trim(),
        neighborhood_id: form.neighborhoodId,
        latitude: round(form.pin.latitude),
        longitude: round(form.pin.longitude),
        duplicate_override: duplicateOverride,
    };
    if (form.priceBand)
        shop.price_band = form.priceBand;
    if (form.hours.known && hoursValid(form.hours))
        shop.hours = scheduleFromHours(form.hours);
    return shop;
}

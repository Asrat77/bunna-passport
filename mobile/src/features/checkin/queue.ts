import { api } from "@/api/client";
import { ApiRequestError, isRetryable, NetworkError } from "@/api/errors";
import type { CheckIn, CheckInInput } from "@/api/types";
import { openDatabase } from "@/db/index";
import { recordStamp } from "@/db/shops";

/**
 * Offline check-in queue.
 *
 * Every check-in carries a client-generated idempotency key, so replaying a
 * queued attempt can never produce a second stamp (docs/SPEC.md §8). That is
 * what makes retrying safe enough to do automatically.
 */
export async function enqueue(input: CheckInInput): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO pending_check_ins
       (idempotency_key, shop_id, latitude, longitude, accuracy_meters,
        mock_location, drink, rating, note, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    input.idempotency_key,
    input.shop_id,
    input.latitude,
    input.longitude,
    input.accuracy_meters,
    input.mock_location ? 1 : 0,
    input.drink ?? null,
    input.rating ?? null,
    input.note ?? null,
    new Date().toISOString(),
  );
}

export async function pendingCount(): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM pending_check_ins",
  );
  return row?.total ?? 0;
}

async function remove(key: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync("DELETE FROM pending_check_ins WHERE idempotency_key = ?", key);
}

type QueueRow = {
  idempotency_key: string;
  shop_id: number;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  mock_location: number;
  drink: string | null;
  rating: number | null;
  note: string | null;
  attempts: number;
};

export type FlushResult = {
  sent: number;
  stamps: CheckIn[];
  remaining: number;
};

/**
 * Drains the queue. Called on reconnect and on app foreground.
 *
 * A server rejection (too far, cooldown, daily cap) is final — the attempt is
 * dropped rather than retried forever. Only transport failures stay queued.
 */
export async function flushQueue(): Promise<FlushResult> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<QueueRow>(
    "SELECT * FROM pending_check_ins ORDER BY created_at ASC",
  );

  const stamps: CheckIn[] = [];
  let sent = 0;

  for (const row of rows) {
    try {
      const { data } = await api.checkIn({
        shop_id: row.shop_id,
        idempotency_key: row.idempotency_key,
        latitude: row.latitude,
        longitude: row.longitude,
        accuracy_meters: row.accuracy_meters,
        mock_location: row.mock_location === 1,
        drink: row.drink ?? undefined,
        rating: row.rating ?? undefined,
        note: row.note ?? undefined,
      });

      await remove(row.idempotency_key);
      sent += 1;
      if (data.stamp_earned) {
        await recordStamp(row.shop_id, data.occurred_at, data.stamp_level ?? "bronze");
        stamps.push(data);
      }
    } catch (error) {
      if (error instanceof NetworkError) break; // Still offline; stop early.

      if (error instanceof ApiRequestError && !isRetryable(error)) {
        await remove(row.idempotency_key);
        continue;
      }

      await db.runAsync(
        "UPDATE pending_check_ins SET attempts = attempts + 1, last_error = ? WHERE idempotency_key = ?",
        error instanceof Error ? error.message : "unknown",
        row.idempotency_key,
      );
    }
  }

  return { sent, stamps, remaining: await pendingCount() };
}

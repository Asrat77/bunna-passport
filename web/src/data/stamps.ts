import { useMemo } from "react";
import type { OpaqueId, PassportStamp } from "@/api/types";
import { usePassport } from "./queries";

/** The viewer's stamps keyed by shop, for marking lists stamped or not. */
export function useStampsByShop(): Map<OpaqueId, PassportStamp> {
  const { data } = usePassport();
  return useMemo(() => new Map((data?.stamps ?? []).map((stamp) => [stamp.shop.id, stamp])), [data]);
}

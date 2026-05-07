import { getSupabaseClient } from "../supabase/client";
import type { PinDetail, PinListItem, PinStatus, PinType } from "../domain/types";

export interface FetchPinsParams {
  bbox: string;
  eventId?: string;
  type?: PinType;
  status?: PinStatus[];
  signal?: AbortSignal;
}

/**
 * Calls `pins_in_bbox` RPC (specs/05-api-contracts.md GET /pins?bbox=).
 * Falls back to empty array when Supabase is not configured.
 */
export async function fetchPinsByBbox(params: FetchPinsParams): Promise<PinListItem[]> {
  if (params.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const client = getSupabaseClient();
  if (!client) return [];

  const rpcParams: Record<string, unknown> = { bbox: params.bbox };
  if (params.type) rpcParams.pin_type = params.type;
  if (params.status?.length) rpcParams.pin_status = params.status;
  if (params.eventId) rpcParams.event_id = params.eventId;

  const promise = client.rpc("pins_in_bbox", rpcParams);

  const onAbort = () => {
    // supabase-js v2 doesn't support request abort natively;
    // we reject on our side so callers see AbortError.
  };
  params.signal?.addEventListener("abort", onAbort, { once: true });

  const { data, error } = await promise;
  params.signal?.removeEventListener("abort", onAbort);

  if (params.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  if (error) {
    throw new Error(error.message ?? "Failed to fetch pins");
  }

  return (data ?? []) as PinListItem[];
}

/**
 * Calls `pin_detail` RPC (specs/05-api-contracts.md GET /pins/:id).
 * Returns null if the pin was not found or Supabase is not configured.
 */
export async function fetchPinDetail(pinId: string): Promise<PinDetail | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.rpc("pin_detail", { pin_id: pinId });

  if (error) {
    throw new Error(error.message ?? "Failed to fetch pin detail");
  }

  const rows = data as PinDetail[] | null;
  return rows?.[0] ?? null;
}

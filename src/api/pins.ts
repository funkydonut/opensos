import { getSupabaseClient } from "../supabase/client";
import type { PinDetail, PinItem, PinListItem, PinStatus, PinType } from "../domain/types";

export interface OfferPin {
  id: string;
  title: string;
  items: PinItem[];
}

/**
 * Fetch available offer pins (status open/assigned) for the create-match form.
 * Optionally filtered by event_id. Limited to 50 results.
 */
export async function fetchAvailableOffers(eventId?: string | null): Promise<OfferPin[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  let query = client
    .from("pins")
    .select("id, title, pin_items(id, name, quantity, unit, priority)")
    .eq("type", "offer")
    .in("status", ["open", "assigned"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventId) {
    query = query.or(`event_id.eq.${eventId},event_id.is.null`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as Array<{ id: string; title: string; pin_items: PinItem[] }>).map((row) => ({
    id: row.id,
    title: row.title,
    items: row.pin_items ?? [],
  }));
}

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

  // #region agent log
  console.log("[opensos:debug] pins_in_bbox start", { bbox: params.bbox.slice(0, 60), statuses: params.status });
  // #endregion

  const promise = client.rpc("pins_in_bbox", rpcParams);

  const onAbort = () => {
    // supabase-js v2 doesn't support request abort natively;
    // we reject on our side so callers see AbortError.
  };
  params.signal?.addEventListener("abort", onAbort, { once: true });

  let data: unknown, error: { message?: string; code?: string; details?: string; hint?: string } | null;
  try {
    const res = await promise;
    data = res.data;
    error = res.error;
  } catch (e) {
    // #region agent log
    console.error("[opensos:debug] pins_in_bbox THREW", e);
    // #endregion
    throw e;
  }
  params.signal?.removeEventListener("abort", onAbort);

  // #region agent log
  console.log("[opensos:debug] pins_in_bbox done", {
    rowCount: Array.isArray(data) ? (data as unknown[]).length : 0,
    error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
  });
  // #endregion

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

import type { PinListItem } from "../domain/types";

/**
 * Stub: returns no pins until Phase 2 wires Supabase/HTTP per specs/05-api-contracts.md.
 */
export async function fetchPinsByBbox(_params: {
  bbox: string;
  eventId?: string;
  type?: "need" | "offer";
  status?: string[];
}): Promise<PinListItem[]> {
  return [];
}

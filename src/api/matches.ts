import { getSupabaseClient } from "../supabase/client";
import type { MatchStatus } from "../domain/types";

export interface MatchItemInput {
  need_pin_item_id: string;
  offer_pin_item_id?: string | null;
  quantity: number;
  unit: string;
}

export interface CreateMatchInput {
  need_pin_id: string;
  offer_pin_id: string;
  status?: MatchStatus;
  items: MatchItemInput[];
  note?: string;
}

export interface MatchRow {
  id: string;
  need_pin_id: string;
  offer_pin_id: string;
  status: MatchStatus;
  created_by_user_id: string;
  note: string | null;
  created_at: string;
}

export interface MatchItemRow {
  id: string;
  pin_match_id: string;
  need_pin_item_id: string;
  offer_pin_item_id: string | null;
  quantity: number;
  unit: string;
}

export interface MatchWithItems extends MatchRow {
  items: MatchItemRow[];
  offer_pin_title?: string;
}

/**
 * Fetch committed quantities for each offer item across active matches.
 * Returns a map of offer_pin_item_id → total committed quantity.
 */
export async function fetchCommittedForOffer(
  offerPinId: string,
): Promise<Map<string, number>> {
  const client = getSupabaseClient();
  const result = new Map<string, number>();
  if (!client) return result;

  const { data: matches } = await client
    .from("pin_matches")
    .select("id")
    .eq("offer_pin_id", offerPinId)
    .in("status", ["confirmed", "in_transit", "delivered"]);

  if (!matches || matches.length === 0) return result;

  const matchIds = (matches as Array<{ id: string }>).map((m) => m.id);

  const { data: items } = await client
    .from("pin_match_items")
    .select("offer_pin_item_id, quantity")
    .in("pin_match_id", matchIds)
    .not("offer_pin_item_id", "is", null);

  for (const row of (items ?? []) as Array<{ offer_pin_item_id: string; quantity: number }>) {
    const prev = result.get(row.offer_pin_item_id) ?? 0;
    result.set(row.offer_pin_item_id, prev + Number(row.quantity));
  }

  return result;
}

/** Fetch non-cancelled matches for a pin (GET /pins/:id/matches). */
export async function fetchMatchesForPin(pinId: string): Promise<MatchWithItems[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: matches, error } = await client
    .from("pin_matches")
    .select("*")
    .or(`need_pin_id.eq.${pinId},offer_pin_id.eq.${pinId}`)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error || !matches) return [];

  const matchIds = matches.map((m: MatchRow) => m.id);
  if (matchIds.length === 0) return [];

  const { data: allItems } = await client
    .from("pin_match_items")
    .select("*")
    .in("pin_match_id", matchIds);

  const itemsByMatch = new Map<string, MatchItemRow[]>();
  for (const item of (allItems ?? []) as MatchItemRow[]) {
    const list = itemsByMatch.get(item.pin_match_id) ?? [];
    list.push(item);
    itemsByMatch.set(item.pin_match_id, list);
  }

  const offerPinIds = [...new Set((matches as MatchRow[]).map((m) => m.offer_pin_id))];
  const titleMap = new Map<string, string>();
  if (offerPinIds.length > 0) {
    const { data: pins } = await client
      .from("pins")
      .select("id, title")
      .in("id", offerPinIds);
    for (const p of (pins ?? []) as Array<{ id: string; title: string }>) {
      titleMap.set(p.id, p.title);
    }
  }

  return (matches as MatchRow[]).map((m) => ({
    ...m,
    items: itemsByMatch.get(m.id) ?? [],
    offer_pin_title: titleMap.get(m.offer_pin_id),
  }));
}

/** Create a match + match items (POST /matches). */
export async function createMatch(
  input: CreateMatchInput
): Promise<{ id: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { id: null, error: "Supabase not configured" };

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return { id: null, error: "Not authenticated" };

  const { data: match, error: matchErr } = await client
    .from("pin_matches")
    .insert({
      need_pin_id: input.need_pin_id,
      offer_pin_id: input.offer_pin_id,
      status: input.status ?? "proposed",
      created_by_user_id: userData.user.id,
      note: input.note ?? null,
    })
    .select("id")
    .single();

  if (matchErr || !match) {
    return { id: null, error: matchErr?.message ?? "Failed to create match" };
  }

  if (input.items.length > 0) {
    const rows = input.items.map((it) => ({
      pin_match_id: match.id,
      need_pin_item_id: it.need_pin_item_id,
      offer_pin_item_id: it.offer_pin_item_id ?? null,
      quantity: it.quantity,
      unit: it.unit,
    }));
    const { error: itemsErr } = await client.from("pin_match_items").insert(rows);
    if (itemsErr) {
      return { id: match.id as string, error: `Match created but items failed: ${itemsErr.message}` };
    }
  }

  return { id: match.id as string, error: null };
}

/** Update match status (PATCH /matches/:id). */
export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: "Supabase not configured" };

  const { error } = await client
    .from("pin_matches")
    .update({ status })
    .eq("id", matchId);

  return { error: error?.message ?? null };
}

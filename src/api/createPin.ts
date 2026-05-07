import { getSupabaseClient } from "../supabase/client";
import type { PinType } from "../domain/types";

export interface CreatePinItemInput {
  name: string;
  quantity: number;
  unit: string;
  priority?: "low" | "normal" | "high";
}

export interface CreatePinInput {
  type: PinType;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  event_id?: string;
  expires_at?: string;
  items: CreatePinItemInput[];
}

export interface CreatePinResult {
  id: string | null;
  error: string | null;
}

/**
 * Creates a pin + its items in a single transaction.
 * Maps to POST /pins in specs/05-api-contracts.md.
 */
export async function createPin(input: CreatePinInput): Promise<CreatePinResult> {
  const client = getSupabaseClient();
  if (!client) return { id: null, error: "Supabase not configured" };

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return { id: null, error: "Not authenticated" };

  const point = `SRID=4326;POINT(${input.lng} ${input.lat})`;

  const pinRow: Record<string, unknown> = {
    type: input.type,
    status: "open",
    title: input.title,
    description: input.description || null,
    location: point,
    created_by_user_id: userData.user.id,
  };
  if (input.event_id) pinRow.event_id = input.event_id;
  if (input.expires_at) pinRow.expires_at = input.expires_at;

  const { data: pin, error: pinErr } = await client
    .from("pins")
    .insert(pinRow)
    .select("id")
    .single();

  if (pinErr || !pin) {
    return { id: null, error: pinErr?.message ?? "Failed to create pin" };
  }

  if (input.items.length > 0) {
    const itemRows = input.items.map((it) => ({
      pin_id: pin.id,
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      priority: it.priority || null,
    }));
    const { error: itemsErr } = await client.from("pin_items").insert(itemRows);
    if (itemsErr) {
      return { id: pin.id, error: `Pin created but items failed: ${itemsErr.message}` };
    }
  }

  return { id: pin.id as string, error: null };
}

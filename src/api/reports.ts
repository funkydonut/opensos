import { getSupabaseClient } from "../supabase/client";

export interface CreateReportInput {
  pin_id: string;
  reason: string;
  details?: string;
}

/** Create a report on a pin (POST /reports). */
export async function createReport(
  input: CreateReportInput,
): Promise<{ id: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { id: null, error: "Supabase not configured" };

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return { id: null, error: "Not authenticated" };

  const { data, error } = await client
    .from("reports")
    .insert({
      pin_id: input.pin_id,
      reason: input.reason,
      details: input.details ?? null,
      created_by_user_id: userData.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { id: null, error: error?.message ?? "Failed to create report" };
  }

  return { id: data.id as string, error: null };
}

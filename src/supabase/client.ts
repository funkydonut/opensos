import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Returns a Supabase client when URL and anon key are set; otherwise null.
 * Never use the service role key in the browser.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) {
    return cached;
  }
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey) {
    cached = null;
    return null;
  }
  cached = createClient(url, anonKey);
  return cached;
}

// #region agent log — temporary diagnostic, remove after debugging
export function _debugEnvInfo(): string {
  const url = import.meta.env.VITE_SUPABASE_URL ?? "(undefined)";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "(undefined)";
  const token = import.meta.env.VITE_MAPBOX_TOKEN ?? "(undefined)";
  return `URL len=${url.length} prefix="${url.substring(0, 20)}" | KEY len=${key.length} prefix="${key.substring(0, 10)}" | MAPBOX len=${token.length}`;
}
// #endregion

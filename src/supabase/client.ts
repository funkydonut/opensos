import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Simple in-process lock that serializes operations by name.
 * Avoids navigator.locks which can deadlock in certain browsers
 * due to auth token refresh steal cascades in supabase-js.
 */
const _locks: Record<string, Promise<unknown>> = {};
let _lockSeq = 0;
function processLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const id = ++_lockSeq;
  // #region agent log
  console.log("[opensos:debug] lock REQUEST", { id, name, hasPrev: !!_locks[name] });
  // #endregion
  const prev = _locks[name] ?? Promise.resolve();
  const current = prev.catch(() => {}).then(async () => {
    // #region agent log
    console.log("[opensos:debug] lock ACQUIRED", { id, name });
    // #endregion
    try {
      const r = await fn();
      // #region agent log
      console.log("[opensos:debug] lock fn DONE", { id, name });
      // #endregion
      return r;
    } catch (e) {
      // #region agent log
      console.error("[opensos:debug] lock fn THREW", { id, name, err: e });
      // #endregion
      throw e;
    }
  });
  _locks[name] = current;
  return current;
}

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
    // #region agent log
    console.log("[opensos:debug] supabase client NULL", { hasUrl: !!url, hasKey: !!anonKey });
    // #endregion
    return null;
  }
  cached = createClient(url, anonKey, {
    auth: { lock: processLock },
  });
  // #region agent log
  console.log("[opensos:debug] supabase client created", { urlPrefix: url.slice(0, 30), keyLen: anonKey.length, lockSet: true });
  // #endregion
  return cached;
}
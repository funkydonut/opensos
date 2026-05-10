import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../supabase/client";

export type AppRole = "citizen" | "volunteer" | "org" | "admin";

export interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
}

type AuthListener = (state: AuthState) => void;

let current: AuthState = { session: null, user: null, role: null, loading: true };
const listeners = new Set<AuthListener>();

function notify(): void {
  for (const fn of listeners) fn(current);
}

function set(patch: Partial<AuthState>): void {
  current = { ...current, ...patch };
  notify();
}

async function fetchRole(userId: string): Promise<AppRole | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as AppRole) ?? null;
}

export function getAuthState(): AuthState {
  return current;
}

export function onAuthStateChange(fn: AuthListener): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function initAuth(): void {
  const client = getSupabaseClient();
  if (!client) {
    set({ loading: false });
    return;
  }

  // #region agent log
  console.log("[opensos:debug] initAuth: calling getSession");
  // #endregion
  client.auth.getSession().then(async ({ data: { session } }) => {
    // #region agent log
    console.log("[opensos:debug] initAuth: getSession resolved", { hasSession: !!session });
    // #endregion
    if (session?.user) {
      const role = await fetchRole(session.user.id);
      set({ session, user: session.user, role, loading: false });
    } else {
      set({ session: null, user: null, role: null, loading: false });
    }
  }).catch((err) => {
    // #region agent log
    console.error("[opensos:debug] initAuth: getSession REJECTED", err);
    // #endregion
  });

  client.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const role = await fetchRole(session.user.id);
      set({ session, user: session.user, role, loading: false });
    } else {
      set({ session: null, user: null, role: null, loading: false });
    }
  });
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: "Supabase not configured" };
  const { error } = await client.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: "Supabase not configured" };
  const { error } = await client.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

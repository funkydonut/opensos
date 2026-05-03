import { getSupabaseClient } from "../supabase/client";
import { navigate } from "../utils/router";

export function renderAuthScreen(root: HTMLElement): void {
  const hasSupabase = getSupabaseClient() !== null;
  root.className = "flex min-h-screen flex-col gap-4 bg-slate-50 p-4";
  root.innerHTML = `
    <div class="mx-auto w-full max-w-lg rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h1 class="text-lg font-semibold text-slate-900">Sign in</h1>
      <p class="mt-2 text-sm text-slate-600">
        Supabase Auth UI will be implemented in Phase 3.
        ${hasSupabase ? "<span class='text-green-700'> Client configured.</span>" : "<span class='text-amber-700'> Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.</span>"}
      </p>
      <button type="button" data-nav="/" class="mt-4 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Back to map</button>
    </div>
  `;
  root.querySelector("button[data-nav]")?.addEventListener("click", () => navigate("/"));
}

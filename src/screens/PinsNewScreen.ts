import { getAuthState } from "../auth/state";
import { navigate } from "../utils/router";

export function renderPinsNewScreen(root: HTMLElement): void {
  const auth = getAuthState();
  if (!auth.user) {
    navigate("/auth");
    return;
  }

  root.className = "flex min-h-screen flex-col gap-4 bg-slate-50 p-4";
  root.innerHTML = `
    <div class="mx-auto w-full max-w-lg rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h1 class="text-lg font-semibold text-slate-900">Create pin</h1>
      <p class="mt-2 text-sm text-slate-600">Form + map picker will be implemented in Phase 4 (see specs/12-frontend-routes-and-screens.md).</p>
      <button type="button" data-nav="/" class="mt-4 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Back to map</button>
    </div>
  `;
  root.querySelector("button[data-nav]")?.addEventListener("click", () => navigate("/"));
}

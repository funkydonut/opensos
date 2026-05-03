import { navigate } from "../utils/router";

export function renderPinDetailScreen(root: HTMLElement, pinId: string): void {
  root.className = "flex min-h-screen flex-col gap-4 bg-slate-50 p-4";
  root.innerHTML = `
    <div class="mx-auto w-full max-w-lg rounded border border-slate-200 bg-white p-4 shadow-sm">
      <h1 class="text-lg font-semibold text-slate-900">Pin detail</h1>
      <p class="mt-2 font-mono text-sm text-slate-700">id: ${escapeHtml(pinId)}</p>
      <p class="mt-2 text-sm text-slate-600">Loads GET /pins/:id and GET /pins/:id/matches in later phases.</p>
      <button type="button" data-nav="/" class="mt-4 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Back to map</button>
    </div>
  `;
  root.querySelector("button[data-nav]")?.addEventListener("click", () => navigate("/"));
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

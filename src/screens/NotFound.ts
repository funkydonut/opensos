import { navigate } from "../utils/router";

export function renderNotFound(root: HTMLElement, path: string): void {
  root.className = "flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4";
  root.innerHTML = `
    <div class="text-center">
      <h1 class="text-xl font-semibold text-slate-900">Not found</h1>
      <p class="mt-2 font-mono text-sm text-slate-600">${escapeHtml(path)}</p>
      <button type="button" data-nav="/" class="mt-6 rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">Home</button>
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

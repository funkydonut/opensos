import { mountMapPlaceholder } from "../map/mapPlaceholder";
import { navigate } from "../utils/router";

export function renderHomeScreen(root: HTMLElement): () => void {
  root.className = "flex h-screen w-screen flex-col";

  const top = document.createElement("header");
  top.className =
    "flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 text-sm";
  top.innerHTML = `
    <span class="font-semibold text-slate-800">OpenSOS</span>
    <nav class="flex flex-wrap items-center gap-2">
      <button type="button" data-nav="/pins/new" class="rounded bg-slate-900 px-2 py-1 text-white hover:bg-slate-800">New pin</button>
      <button type="button" data-nav="/auth" class="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Sign in</button>
    </nav>
  `;
  top.querySelectorAll<HTMLButtonElement>("button[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const path = btn.getAttribute("data-nav");
      if (path) {
        navigate(path);
      }
    });
  });

  const mapHost = document.createElement("div");
  mapHost.className = "min-h-0 flex-1";

  root.append(top, mapHost);

  return mountMapPlaceholder(mapHost);
}

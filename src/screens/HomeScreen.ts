import {
  DEFAULT_FILTERS,
  type MapFiltersState,
  mountMapFilters,
} from "../components/MapFilters";
import { mountHomeMap, type HomeMapStatus } from "../map/homeMap";
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
      if (path) navigate(path);
    });
  });

  const filtersBar = document.createElement("div");

  const mapWrap = document.createElement("div");
  mapWrap.className = "relative min-h-0 flex-1";

  const mapHost = document.createElement("div");
  mapHost.className = "h-full w-full";
  mapWrap.appendChild(mapHost);

  const statusOverlay = document.createElement("div");
  statusOverlay.className =
    "pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 shadow ring-1 ring-slate-200";
  statusOverlay.setAttribute("role", "status");
  statusOverlay.setAttribute("aria-live", "polite");
  statusOverlay.hidden = true;
  mapWrap.appendChild(statusOverlay);

  const errorOverlay = document.createElement("div");
  errorOverlay.className =
    "absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs text-red-700 shadow ring-1 ring-red-200";
  errorOverlay.innerHTML = `
    <span>Could not load pins.</span>
    <button type="button" data-retry class="rounded bg-red-600 px-2 py-0.5 text-white hover:bg-red-700">Retry</button>
  `;
  mapWrap.appendChild(errorOverlay);

  root.append(top, filtersBar, mapWrap);

  let currentFilters: MapFiltersState = { ...DEFAULT_FILTERS };

  const handle = mountHomeMap(mapHost, {
    initialFilters: currentFilters,
    onStatusChange: (status) => {
      applyStatus(status, statusOverlay, errorOverlay);
    },
  });

  errorOverlay.querySelector<HTMLButtonElement>("button[data-retry]")?.addEventListener(
    "click",
    () => handle.retry()
  );

  const teardownFilters = mountMapFilters(filtersBar, {
    initial: currentFilters,
    onChange: (next) => {
      currentFilters = next;
      handle.setFilters(next);
    },
  });

  return () => {
    teardownFilters();
    handle.destroy();
  };
}

function applyStatus(
  status: HomeMapStatus,
  loadingEl: HTMLElement,
  errorEl: HTMLElement
): void {
  switch (status.state) {
    case "loading":
      loadingEl.hidden = false;
      loadingEl.textContent = "Loading pins…";
      errorEl.classList.add("hidden");
      errorEl.classList.remove("flex");
      break;
    case "empty":
      loadingEl.hidden = false;
      loadingEl.textContent = "No pins in this area";
      errorEl.classList.add("hidden");
      errorEl.classList.remove("flex");
      break;
    case "error":
      loadingEl.hidden = true;
      errorEl.classList.remove("hidden");
      errorEl.classList.add("flex");
      break;
    case "idle":
    default:
      loadingEl.hidden = true;
      errorEl.classList.add("hidden");
      errorEl.classList.remove("flex");
      break;
  }
}

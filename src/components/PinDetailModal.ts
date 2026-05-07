import type { PinDetail, PinItem } from "../domain/types";
import { fetchPinDetail } from "../api/pins";

export interface PinDetailModalHandle {
  open: (pinId: string) => void;
  close: () => void;
  destroy: () => void;
}

/**
 * Mounts a slide-over modal for pin detail on the home screen.
 * Calls `pin_detail` RPC on open; renders items, status, and match summary.
 */
export function mountPinDetailModal(container: HTMLElement): PinDetailModalHandle {
  const backdrop = document.createElement("div");
  backdrop.className =
    "fixed inset-0 z-50 hidden bg-black/40 transition-opacity";
  backdrop.setAttribute("aria-hidden", "true");

  const panel = document.createElement("div");
  panel.className =
    "fixed right-0 top-0 z-50 hidden h-full w-full max-w-md translate-x-full overflow-y-auto bg-white shadow-xl transition-transform sm:max-w-lg";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Pin detail");

  container.append(backdrop, panel);

  let currentPinId: string | null = null;

  const close = () => {
    currentPinId = null;
    backdrop.classList.add("hidden");
    panel.classList.add("hidden", "translate-x-full");
    panel.innerHTML = "";
    window.history.pushState(null, "", "/");
  };

  backdrop.addEventListener("click", close);

  const open = (pinId: string) => {
    currentPinId = pinId;
    window.history.pushState(null, "", `/pins/${pinId}`);

    backdrop.classList.remove("hidden");
    panel.classList.remove("hidden");
    requestAnimationFrame(() =>
      panel.classList.remove("translate-x-full")
    );

    panel.innerHTML = renderLoading();
    void loadPin(pinId);
  };

  const loadPin = async (pinId: string) => {
    try {
      const pin = await fetchPinDetail(pinId);
      if (currentPinId !== pinId) return;
      if (!pin) {
        panel.innerHTML = renderError("Pin not found.");
        return;
      }
      panel.innerHTML = renderDetail(pin);
      panel
        .querySelector<HTMLButtonElement>("[data-close]")
        ?.addEventListener("click", close);
    } catch {
      if (currentPinId !== pinId) return;
      panel.innerHTML = renderError("Failed to load pin.");
    }
  };

  const destroy = () => {
    backdrop.remove();
    panel.remove();
  };

  return { open, close, destroy };
}

function renderLoading(): string {
  return `
    <div class="flex h-full items-center justify-center">
      <p class="text-sm text-slate-500">Loading pin…</p>
    </div>`;
}

function renderError(message: string): string {
  return `
    <div class="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <p class="text-sm text-red-600">${esc(message)}</p>
      <button data-close type="button"
        class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Close</button>
    </div>`;
}

function renderDetail(pin: PinDetail): string {
  const typeBadge =
    pin.type === "need"
      ? `<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Need</span>`
      : `<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Offer</span>`;

  const statusBadge = `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">${esc(pin.status)}</span>`;

  const matchInfo = pin.match_summary
    ? `<div class="flex items-center gap-2 text-xs text-slate-500">
         <span>${pin.match_summary.active_match_count} active match${pin.match_summary.active_match_count !== 1 ? "es" : ""}</span>
         ${pin.match_summary.is_being_handled ? '<span class="text-green-600 font-medium">Being handled</span>' : ""}
       </div>`
    : "";

  const itemsHtml =
    pin.items.length > 0
      ? `<div class="mt-4">
           <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</h3>
           <ul class="mt-2 divide-y divide-slate-100">
             ${pin.items.map((it) => renderItem(it)).join("")}
           </ul>
         </div>`
      : "";

  const expiresHtml = pin.expires_at
    ? `<p class="text-xs text-slate-400">Expires: ${new Date(pin.expires_at).toLocaleString()}</p>`
    : "";

  return `
    <div class="flex h-full flex-col">
      <header class="flex items-start justify-between border-b border-slate-200 p-4">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-slate-900">${esc(pin.title)}</h2>
          <div class="flex items-center gap-2">${typeBadge} ${statusBadge}</div>
        </div>
        <button data-close type="button"
          class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </header>
      <div class="flex-1 space-y-3 p-4">
        ${matchInfo}
        ${pin.description ? `<p class="text-sm text-slate-700">${esc(pin.description)}</p>` : ""}
        ${expiresHtml}
        <p class="text-xs text-slate-400">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</p>
        ${itemsHtml}
      </div>
    </div>`;
}

function renderItem(item: PinItem): string {
  const priorityColor =
    item.priority === "high"
      ? "text-red-600"
      : item.priority === "low"
        ? "text-slate-400"
        : "text-slate-600";
  return `
    <li class="flex items-center justify-between py-2 text-sm">
      <span class="text-slate-800">${esc(item.name)}</span>
      <span class="flex items-center gap-2 text-slate-500">
        <span>${item.quantity} ${esc(item.unit)}</span>
        ${item.priority ? `<span class="${priorityColor} text-xs">${esc(item.priority)}</span>` : ""}
      </span>
    </li>`;
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

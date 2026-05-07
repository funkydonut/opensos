import type { PinDetail, PinItem, MatchStatus } from "../domain/types";
import { fetchPinDetail } from "../api/pins";
import {
  fetchMatchesForPin,
  updateMatchStatus,
  type MatchWithItems,
} from "../api/matches";
import { getAuthState } from "../auth/state";

export interface PinDetailModalHandle {
  open: (pinId: string) => void;
  close: () => void;
  destroy: () => void;
}

/**
 * Slide-over modal for pin detail on the home screen.
 * Shows pin info, items with coverage, matches list, and match status actions.
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
      const [pin, matches] = await Promise.all([
        fetchPinDetail(pinId),
        fetchMatchesForPin(pinId),
      ]);
      if (currentPinId !== pinId) return;
      if (!pin) {
        panel.innerHTML = renderError("Pin not found.");
        wireClose(panel, close);
        return;
      }
      panel.innerHTML = renderDetail(pin, matches);
      wireClose(panel, close);
      wireMatchActions(panel, pinId);
    } catch {
      if (currentPinId !== pinId) return;
      panel.innerHTML = renderError("Failed to load pin.");
      wireClose(panel, close);
    }
  };

  const wireMatchActions = (
    el: HTMLElement,
    pinId: string,
  ) => {
    el.querySelectorAll<HTMLButtonElement>("button[data-match-action]").forEach(
      (btn) => {
        btn.addEventListener("click", async () => {
          const matchId = btn.getAttribute("data-match-id")!;
          const newStatus = btn.getAttribute("data-match-action") as MatchStatus;
          btn.disabled = true;
          btn.textContent = "Updating…";
          const { error } = await updateMatchStatus(matchId, newStatus);
          if (error) {
            alert(`Failed: ${error}`);
            btn.disabled = false;
            return;
          }
          // Reload
          void loadPin(pinId);
        });
      }
    );
  };

  const destroy = () => {
    backdrop.remove();
    panel.remove();
  };

  return { open, close, destroy };
}

function wireClose(el: HTMLElement, close: () => void) {
  el.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((btn) =>
    btn.addEventListener("click", close)
  );
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

function renderDetail(pin: PinDetail, matches: MatchWithItems[]): string {
  const auth = getAuthState();
  const isLoggedIn = !!auth.user;

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

  // Coverage calculation for need items
  const coverageMap = new Map<string, number>();
  if (pin.type === "need") {
    for (const m of matches) {
      if (!["confirmed", "in_transit", "delivered"].includes(m.status)) continue;
      for (const mi of m.items) {
        const prev = coverageMap.get(mi.need_pin_item_id) ?? 0;
        coverageMap.set(mi.need_pin_item_id, prev + mi.quantity);
      }
    }
  }

  const itemsHtml =
    pin.items.length > 0
      ? `<div class="mt-4">
           <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</h3>
           <ul class="mt-2 divide-y divide-slate-100">
             ${pin.items.map((it) => renderItem(it, pin.type === "need" ? coverageMap.get(it.id) : undefined)).join("")}
           </ul>
         </div>`
      : "";

  const matchesHtml = renderMatches(matches, isLoggedIn);

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
      <div class="flex-1 space-y-3 overflow-y-auto p-4">
        ${matchInfo}
        ${pin.description ? `<p class="text-sm text-slate-700">${esc(pin.description)}</p>` : ""}
        ${expiresHtml}
        <p class="text-xs text-slate-400">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</p>
        ${itemsHtml}
        ${matchesHtml}
      </div>
    </div>`;
}

function renderItem(item: PinItem, coveredQty?: number): string {
  const priorityColor =
    item.priority === "high"
      ? "text-red-600"
      : item.priority === "low"
        ? "text-slate-400"
        : "text-slate-600";

  let coverageHtml = "";
  if (coveredQty !== undefined) {
    const ratio = Math.min(coveredQty / item.quantity, 1);
    const pct = Math.round(ratio * 100);
    const barColor = ratio >= 1 ? "bg-green-500" : ratio > 0 ? "bg-amber-400" : "bg-slate-200";
    coverageHtml = `
      <div class="mt-1 flex items-center gap-2">
        <div class="h-1.5 flex-1 rounded-full bg-slate-100">
          <div class="${barColor} h-1.5 rounded-full" style="width: ${pct}%"></div>
        </div>
        <span class="text-[10px] text-slate-500">${coveredQty}/${item.quantity} ${esc(item.unit)} (${pct}%)</span>
      </div>`;
  }

  return `
    <li class="py-2 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-slate-800">${esc(item.name)}</span>
        <span class="flex items-center gap-2 text-slate-500">
          <span>${item.quantity} ${esc(item.unit)}</span>
          ${item.priority ? `<span class="${priorityColor} text-xs">${esc(item.priority)}</span>` : ""}
        </span>
      </div>
      ${coverageHtml}
    </li>`;
}

function renderMatches(matches: MatchWithItems[], isLoggedIn: boolean): string {
  if (matches.length === 0) {
    return `<p class="mt-4 text-xs text-slate-400">No matches yet.</p>`;
  }

  const statusActions: Record<MatchStatus, MatchStatus[]> = {
    proposed: ["confirmed", "cancelled"],
    confirmed: ["in_transit", "cancelled"],
    in_transit: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  const rows = matches
    .map((m) => {
      const nextStatuses = statusActions[m.status] ?? [];
      const actionsHtml =
        isLoggedIn && nextStatuses.length > 0
          ? `<div class="mt-1 flex gap-1">
              ${nextStatuses
                .map(
                  (s) =>
                    `<button type="button" data-match-action="${s}" data-match-id="${m.id}"
                       class="rounded border border-slate-200 px-2 py-0.5 text-[10px] hover:bg-slate-50">${s}</button>`
                )
                .join("")}
             </div>`
          : "";

      const itemsSummary =
        m.items.length > 0
          ? `<span class="text-[10px] text-slate-400">${m.items.length} item${m.items.length !== 1 ? "s" : ""}</span>`
          : "";

      const statusColor = m.status === "delivered" ? "text-green-600" : m.status === "cancelled" ? "text-red-500" : "text-slate-600";

      return `
        <div class="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <div class="flex items-center justify-between">
            <span class="${statusColor} font-medium">${esc(m.status)}</span>
            ${itemsSummary}
          </div>
          ${m.note ? `<p class="mt-1 text-slate-500">${esc(m.note)}</p>` : ""}
          ${actionsHtml}
        </div>`;
    })
    .join("");

  return `
    <div class="mt-4">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Matches</h3>
      <div class="mt-2 space-y-2">${rows}</div>
    </div>`;
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

import type { PinDetail, PinItem, MatchStatus } from "../domain/types";
import type { MatchWithItems } from "../api/matches";
import { createMatch, updateMatchStatus } from "../api/matches";
import { fetchAvailableOffers } from "../api/pins";
import { createReport } from "../api/reports";

export function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderLoading(): string {
  return `
    <div class="flex h-full items-center justify-center">
      <p class="text-sm text-slate-500">Loading pin…</p>
    </div>`;
}

export function renderError(message: string, closeLabel = "Close"): string {
  return `
    <div class="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <p class="text-sm text-red-600">${esc(message)}</p>
      <button data-close type="button"
        class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">${esc(closeLabel)}</button>
    </div>`;
}

export function renderDetailHtml(
  pin: PinDetail,
  matches: MatchWithItems[],
  isLoggedIn: boolean,
  options?: { showCloseButton?: boolean },
): string {
  const showClose = options?.showCloseButton ?? true;

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

  const coverageMap = computeCoverage(pin, matches);

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

  const createMatchHtml = (isLoggedIn && pin.type === "need")
    ? `<div class="mt-4 border-t border-slate-100 pt-4">
         <button type="button" data-create-match-toggle
           class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Create match</button>
         <div data-create-match-form class="mt-3 hidden space-y-3 rounded border border-slate-200 bg-slate-50 p-3">
           <div>
             <label class="block text-xs font-medium text-slate-600">Offer pin</label>
             <select data-offer-select
               class="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
               <option value="">Loading offers…</option>
             </select>
           </div>
           <div>
             <label class="block text-xs font-medium text-slate-600">Items to cover</label>
             <div data-match-items class="mt-1 space-y-2">
               ${pin.items.map((it) => `
                 <div class="flex items-center gap-2">
                   <span class="flex-1 text-xs text-slate-700">${esc(it.name)} (${it.quantity} ${esc(it.unit)})</span>
                   <input type="number" min="0" max="${it.quantity}" value="0" step="1"
                     data-match-item-id="${it.id}" data-match-item-unit="${esc(it.unit)}"
                     class="w-20 rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                 </div>`).join("")}
             </div>
           </div>
           <div>
             <label class="block text-xs font-medium text-slate-600">Note <span class="text-slate-400">(optional)</span></label>
             <textarea data-match-note rows="2"
               class="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
           </div>
           <div class="flex items-center gap-2">
             <button type="button" data-create-match-submit
               class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">Submit match</button>
             <button type="button" data-create-match-cancel
               class="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50">Cancel</button>
           </div>
           <p data-create-match-msg class="hidden text-xs"></p>
         </div>
       </div>`
    : "";

  const reportHtml = isLoggedIn
    ? `<div class="mt-4 border-t border-slate-100 pt-4">
         <button type="button" data-report-toggle
           class="text-xs text-slate-400 hover:text-red-600">Report this pin</button>
         <div data-report-form class="mt-2 hidden space-y-2">
           <select data-report-reason
             class="block w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
             <option value="spam">Spam</option>
             <option value="inaccurate">Inaccurate</option>
             <option value="duplicate">Duplicate</option>
             <option value="offensive">Offensive</option>
             <option value="other">Other</option>
           </select>
           <textarea data-report-details rows="2" placeholder="Details (optional)"
             class="block w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
           <div class="flex items-center gap-2">
             <button type="button" data-report-submit
               class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Submit report</button>
             <button type="button" data-report-cancel
               class="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50">Cancel</button>
           </div>
           <p data-report-msg class="hidden text-xs"></p>
         </div>
       </div>`
    : "";

  const closeBtn = showClose
    ? `<button data-close type="button"
        class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>`
    : "";

  return `
    <div class="flex h-full flex-col">
      <header class="flex items-start justify-between border-b border-slate-200 p-4">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-slate-900">${esc(pin.title)}</h2>
          <div class="flex items-center gap-2">${typeBadge} ${statusBadge}</div>
        </div>
        ${closeBtn}
      </header>
      <div class="flex-1 space-y-3 overflow-y-auto p-4">
        ${matchInfo}
        ${pin.description ? `<p class="text-sm text-slate-700">${esc(pin.description)}</p>` : ""}
        ${expiresHtml}
        <p class="text-xs text-slate-400">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</p>
        ${itemsHtml}
        ${matchesHtml}
        ${createMatchHtml}
        ${reportHtml}
      </div>
    </div>`;
}

function computeCoverage(pin: PinDetail, matches: MatchWithItems[]): Map<string, number> {
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
  return coverageMap;
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

/**
 * Wire match status action buttons inside a container.
 * `reloadFn` is called after a successful status change.
 */
export function wireMatchActions(
  el: HTMLElement,
  reloadFn: () => void,
): void {
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
        reloadFn();
      });
    }
  );
}

/**
 * Wire the "Create match" toggle, offer fetch, and form submission.
 */
export function wireCreateMatchAction(
  el: HTMLElement,
  pin: PinDetail,
  reloadFn: () => void,
): void {
  const toggleBtn = el.querySelector<HTMLButtonElement>("[data-create-match-toggle]");
  const formEl = el.querySelector<HTMLElement>("[data-create-match-form]");
  if (!toggleBtn || !formEl) return;

  let offersLoaded = false;

  toggleBtn.addEventListener("click", async () => {
    formEl.classList.toggle("hidden");
    if (!formEl.classList.contains("hidden") && !offersLoaded) {
      offersLoaded = true;
      const offers = await fetchAvailableOffers(pin.event_id);
      const select = formEl.querySelector<HTMLSelectElement>("[data-offer-select]")!;
      if (offers.length === 0) {
        select.innerHTML = `<option value="">No offers available</option>`;
      } else {
        select.innerHTML = offers
          .map((o) => `<option value="${o.id}">${esc(o.title)}</option>`)
          .join("");
      }
    }
  });

  el.querySelector<HTMLButtonElement>("[data-create-match-cancel]")?.addEventListener("click", () => {
    formEl.classList.add("hidden");
  });

  el.querySelector<HTMLButtonElement>("[data-create-match-submit]")?.addEventListener("click", async () => {
    const offerSelect = formEl.querySelector<HTMLSelectElement>("[data-offer-select]")!;
    const offerId = offerSelect.value;
    const msgEl = formEl.querySelector<HTMLElement>("[data-create-match-msg]")!;
    const submitBtn = formEl.querySelector<HTMLButtonElement>("[data-create-match-submit]")!;

    msgEl.classList.add("hidden");

    if (!offerId) {
      msgEl.textContent = "Please select an offer.";
      msgEl.className = "text-xs text-red-600";
      msgEl.classList.remove("hidden");
      return;
    }

    const itemInputs = formEl.querySelectorAll<HTMLInputElement>("input[data-match-item-id]");
    const items: Array<{ need_pin_item_id: string; quantity: number; unit: string }> = [];
    itemInputs.forEach((input) => {
      const qty = Number(input.value);
      if (qty > 0) {
        items.push({
          need_pin_item_id: input.getAttribute("data-match-item-id")!,
          quantity: qty,
          unit: input.getAttribute("data-match-item-unit")!,
        });
      }
    });

    if (items.length === 0) {
      msgEl.textContent = "Set quantity > 0 for at least one item.";
      msgEl.className = "text-xs text-red-600";
      msgEl.classList.remove("hidden");
      return;
    }

    const note = formEl.querySelector<HTMLTextAreaElement>("[data-match-note]")?.value.trim() || undefined;

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";

    const { error } = await createMatch({
      need_pin_id: pin.id,
      offer_pin_id: offerId,
      status: "proposed",
      items,
      note,
    });

    if (error) {
      msgEl.textContent = error;
      msgEl.className = "text-xs text-red-600";
      msgEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit match";
      return;
    }

    formEl.classList.add("hidden");
    reloadFn();
  });
}

/**
 * Wire the "Report pin" toggle / form / submit inside a container.
 */
export function wireReportAction(el: HTMLElement, pinId: string): void {
  const toggleBtn = el.querySelector<HTMLButtonElement>("[data-report-toggle]");
  const formEl = el.querySelector<HTMLElement>("[data-report-form]");
  if (!toggleBtn || !formEl) return;

  toggleBtn.addEventListener("click", () => {
    formEl.classList.toggle("hidden");
  });

  el.querySelector<HTMLButtonElement>("[data-report-cancel]")?.addEventListener("click", () => {
    formEl.classList.add("hidden");
  });

  el.querySelector<HTMLButtonElement>("[data-report-submit]")?.addEventListener("click", async () => {
    const reason = el.querySelector<HTMLSelectElement>("[data-report-reason]")?.value ?? "other";
    const details = el.querySelector<HTMLTextAreaElement>("[data-report-details]")?.value.trim() || undefined;
    const submitBtn = el.querySelector<HTMLButtonElement>("[data-report-submit]")!;
    const msgEl = el.querySelector<HTMLElement>("[data-report-msg]")!;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    msgEl.classList.add("hidden");

    const { error } = await createReport({ pin_id: pinId, reason, details });

    if (error) {
      msgEl.textContent = error;
      msgEl.className = "text-xs text-red-600";
      msgEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit report";
      return;
    }

    msgEl.textContent = "Report submitted. Thank you.";
    msgEl.className = "text-xs text-green-600";
    msgEl.classList.remove("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitted";
  });
}

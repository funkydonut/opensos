import type { PinType } from "../domain/types";

export interface MapFiltersState {
  type: PinType | "all";
  showOpenIsh: boolean;
  includeResolved: boolean;
  includeExpiredFlagged: boolean;
  /** Optional emergency event filter. UI selector lands when GET /events is wired. */
  eventId?: string;
}

export const DEFAULT_FILTERS: MapFiltersState = {
  type: "all",
  showOpenIsh: true,
  includeResolved: false,
  includeExpiredFlagged: false,
};

export interface MountMapFiltersOptions {
  initial: MapFiltersState;
  onChange: (next: MapFiltersState) => void;
}

/**
 * Renders the v1 filters bar from specs/03-map-spec.md:
 * - type: need | offer | all
 * - show open-ish toggle (default on)
 * - include resolved toggle (default off)
 * - include expired/flagged toggle (default off)
 */
export function mountMapFilters(
  container: HTMLElement,
  { initial, onChange }: MountMapFiltersOptions
): () => void {
  const state: MapFiltersState = { ...initial };

  container.className =
    "flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 text-xs text-slate-700";
  container.innerHTML = `
    <fieldset class="flex items-center gap-2" aria-label="Pin type filter">
      <legend class="sr-only">Type</legend>
      <span class="text-slate-500">Type</span>
      <label class="flex items-center gap-1">
        <input type="radio" name="type" value="all" /> All
      </label>
      <label class="flex items-center gap-1">
        <input type="radio" name="type" value="need" /> Needs
      </label>
      <label class="flex items-center gap-1">
        <input type="radio" name="type" value="offer" /> Offers
      </label>
    </fieldset>
    <span class="hidden h-4 w-px bg-slate-200 sm:block"></span>
    <label class="flex items-center gap-1">
      <input type="checkbox" data-toggle="openIsh" /> Open / assigned / in transit
    </label>
    <label class="flex items-center gap-1">
      <input type="checkbox" data-toggle="resolved" /> Resolved
    </label>
    <label class="flex items-center gap-1">
      <input type="checkbox" data-toggle="expiredFlagged" /> Expired / flagged
    </label>
  `;

  const typeRadios = container.querySelectorAll<HTMLInputElement>('input[name="type"]');
  typeRadios.forEach((input) => {
    input.checked = input.value === state.type;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const next = input.value as MapFiltersState["type"];
      state.type = next;
      onChange({ ...state });
    });
  });

  const toggles: Array<{ key: keyof MapFiltersState; selector: string }> = [
    { key: "showOpenIsh", selector: 'input[data-toggle="openIsh"]' },
    { key: "includeResolved", selector: 'input[data-toggle="resolved"]' },
    { key: "includeExpiredFlagged", selector: 'input[data-toggle="expiredFlagged"]' },
  ];
  for (const { key, selector } of toggles) {
    const input = container.querySelector<HTMLInputElement>(selector);
    if (!input) continue;
    input.checked = Boolean(state[key]);
    input.addEventListener("change", () => {
      (state[key] as boolean) = input.checked;
      onChange({ ...state });
    });
  }

  return () => {
    container.innerHTML = "";
  };
}

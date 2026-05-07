import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { getAuthState } from "../auth/state";
import { createPin, type CreatePinItemInput } from "../api/createPin";
import { navigate } from "../utils/router";

export function renderPinsNewScreen(root: HTMLElement): (() => void) | void {
  const auth = getAuthState();
  if (!auth.user) {
    navigate("/auth");
    return;
  }

  root.className = "flex h-screen w-screen flex-col bg-slate-50";

  const header = document.createElement("header");
  header.className =
    "flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2 text-sm";
  header.innerHTML = `
    <span class="font-semibold text-slate-800">New pin</span>
    <button type="button" data-back class="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Cancel</button>
  `;
  header.querySelector<HTMLButtonElement>("[data-back]")!.addEventListener("click", () => navigate("/"));

  const body = document.createElement("div");
  body.className = "flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row";

  const formCol = document.createElement("div");
  formCol.className = "flex-1 overflow-y-auto p-4";

  const mapCol = document.createElement("div");
  mapCol.className = "relative h-64 shrink-0 sm:h-auto sm:w-1/2";

  body.append(formCol, mapCol);
  root.append(header, body);

  // Items state
  const items: CreatePinItemInput[] = [];

  formCol.innerHTML = `
    <form class="mx-auto max-w-lg space-y-4" autocomplete="off">
      <fieldset class="space-y-1">
        <legend class="text-sm font-medium text-slate-700">Type</legend>
        <div class="flex gap-3">
          <label class="flex items-center gap-1 text-sm">
            <input type="radio" name="type" value="need" checked /> Need
          </label>
          <label class="flex items-center gap-1 text-sm">
            <input type="radio" name="type" value="offer" /> Offer
          </label>
        </div>
      </fieldset>

      <div>
        <label for="pin-title" class="block text-sm font-medium text-slate-700">Title</label>
        <input id="pin-title" name="title" type="text" required maxlength="140"
          class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div>
        <label for="pin-desc" class="block text-sm font-medium text-slate-700">Description <span class="text-slate-400">(optional)</span></label>
        <textarea id="pin-desc" name="description" rows="2" maxlength="2000"
          class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">Location <span class="text-slate-400">(click on the map)</span></label>
        <p data-latlng class="mt-1 text-xs text-slate-500">No location selected</p>
      </div>

      <fieldset>
        <legend class="text-sm font-medium text-slate-700">Items</legend>
        <div data-items-list class="mt-2 space-y-2"></div>
        <button type="button" data-add-item
          class="mt-2 rounded border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-800">
          + Add item
        </button>
      </fieldset>

      <div data-form-error class="hidden rounded bg-red-50 px-3 py-2 text-xs text-red-700"></div>

      <button type="submit" data-submit
        class="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
        Create pin
      </button>
    </form>
  `;

  const form = formCol.querySelector("form")!;
  const latlngEl = form.querySelector<HTMLElement>("[data-latlng]")!;
  const itemsList = form.querySelector<HTMLElement>("[data-items-list]")!;
  const errorEl = form.querySelector<HTMLElement>("[data-form-error]")!;
  const submitBtn = form.querySelector<HTMLButtonElement>("[data-submit]")!;

  let selectedLat: number | null = null;
  let selectedLng: number | null = null;
  let marker: mapboxgl.Marker | null = null;

  // Map for location picker
  const token = import.meta.env.VITE_MAPBOX_TOKEN?.trim() ?? "";
  let map: mapboxgl.Map | null = null;

  if (token) {
    mapboxgl.accessToken = token;
    map = new mapboxgl.Map({
      container: mapCol,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-3.7038, 40.4168],
      zoom: 12,
    });

    map.on("click", (e) => {
      selectedLat = e.lngLat.lat;
      selectedLng = e.lngLat.lng;
      latlngEl.textContent = `${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;

      if (marker) {
        marker.setLngLat(e.lngLat);
      } else {
        marker = new mapboxgl.Marker({ color: "#1e293b" })
          .setLngLat(e.lngLat)
          .addTo(map!);
      }
    });
  } else {
    mapCol.innerHTML = `
      <div class="flex h-full items-center justify-center bg-slate-100 text-center text-sm text-slate-500 p-4">
        Set <code class="rounded bg-slate-200 px-1">VITE_MAPBOX_TOKEN</code> in <code class="rounded bg-slate-200 px-1">.env</code> to pick a location.
      </div>`;
  }

  // Add item
  const renderItems = () => {
    itemsList.innerHTML = items
      .map(
        (it, i) => `
        <div class="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs">
          <span class="flex-1 text-slate-800">${esc(it.name)} — ${it.quantity} ${esc(it.unit)}</span>
          ${it.priority ? `<span class="text-slate-500">${esc(it.priority)}</span>` : ""}
          <button type="button" data-remove-item="${i}" class="text-red-500 hover:text-red-700">&times;</button>
        </div>`
      )
      .join("");
    itemsList.querySelectorAll<HTMLButtonElement>("button[data-remove-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-item"));
        items.splice(idx, 1);
        renderItems();
      });
    });
  };

  form.querySelector<HTMLButtonElement>("[data-add-item]")!.addEventListener("click", () => {
    const name = prompt("Item name (e.g. water, blankets):");
    if (!name?.trim()) return;
    const qtyStr = prompt("Quantity:");
    const qty = Number(qtyStr);
    if (!qtyStr || isNaN(qty) || qty <= 0) return;
    const unit = prompt("Unit (e.g. liters, kg, units):") ?? "units";
    items.push({ name: name.trim(), quantity: qty, unit: unit.trim() || "units" });
    renderItems();
  });

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");

    if (selectedLat == null || selectedLng == null) {
      errorEl.textContent = "Click on the map to select a location.";
      errorEl.classList.remove("hidden");
      return;
    }

    const type = (form.querySelector<HTMLInputElement>('input[name="type"]:checked')?.value ?? "need") as "need" | "offer";
    const title = (form.querySelector<HTMLInputElement>("#pin-title")!).value.trim();

    if (!title) {
      errorEl.textContent = "Title is required.";
      errorEl.classList.remove("hidden");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";

    const result = await createPin({
      type,
      title,
      description: (form.querySelector<HTMLTextAreaElement>("#pin-desc")!).value.trim() || undefined,
      lat: selectedLat,
      lng: selectedLng,
      items,
    });

    if (result.error && !result.id) {
      errorEl.textContent = result.error;
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create pin";
      return;
    }

    navigate(`/pins/${result.id}`);
  });

  return () => {
    marker?.remove();
    map?.remove();
  };
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

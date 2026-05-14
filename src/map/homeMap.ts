import mapboxgl, { type LngLatLike, type MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { fetchPinsByBbox } from "../api/pins";
import type { MapFiltersState } from "../components/MapFilters";
import type { PinListItem, PinStatus } from "../domain/types";
import { debounce } from "../utils/debounce";
import { navigate } from "../utils/router";
import {
  STATUS_EXPIRED_FLAGGED,
  STATUS_OPEN_ISH,
  STATUS_RESOLVED,
} from "./mapEncoding";
import {
  CLUSTERS_LAYER_ID,
  PINS_SOURCE_ID,
  UNCLUSTERED_LAYER_ID,
  addPinsLayers,
  setPinsData,
} from "./pinsLayer";
import { registerPinImages } from "./pinIcon";

const MADRID_FALLBACK: LngLatLike = [-3.7038, 40.4168];
const DEFAULT_ZOOM = 12;
const MOVEEND_DEBOUNCE_MS = 400;
const GEOLOCATION_TIMEOUT_MS = 3000;

export type LoadingState = "idle" | "loading" | "empty" | "error";

export interface HomeMapStatus {
  state: LoadingState;
  count: number;
}

export interface HomeMapHandle {
  setFilters: (next: MapFiltersState) => void;
  retry: () => void;
  destroy: () => void;
}

export interface MountHomeMapOptions {
  initialFilters: MapFiltersState;
  onStatusChange: (status: HomeMapStatus) => void;
  onPinOpen?: (pinId: string) => void;
}

/**
 * Mounts the operational map on `/` per specs/03-map-spec.md:
 * - Mapbox `streets-v12`, default zoom 12, geolocation -> Madrid fallback.
 * - Clustered GeoJSON source (radius 50, clusterMaxZoom 14).
 * - Bbox loading on initial load + on debounced (400ms) `moveend`.
 * - Cancels in-flight fetches when a newer one starts.
 * - Pin click -> popup with quick info + "Open detail" navigation.
 * - Cluster click -> easeTo cluster expansion zoom.
 *
 * If `VITE_MAPBOX_TOKEN` is missing, mounts a friendly placeholder instead.
 */
export function mountHomeMap(
  container: HTMLElement,
  { initialFilters, onStatusChange, onPinOpen }: MountHomeMapOptions
): HomeMapHandle {
  const token = import.meta.env.VITE_MAPBOX_TOKEN?.trim() ?? "";
  if (!token) {
    container.innerHTML = `
      <div class="flex h-full w-full items-center justify-center bg-slate-100 p-4 text-center text-sm text-slate-600">
        <div>
          <p class="font-medium text-slate-800">Map preview</p>
          <p class="mt-2">Set <code class="rounded bg-slate-200 px-1">VITE_MAPBOX_TOKEN</code> in <code class="rounded bg-slate-200 px-1">.env</code> to load Mapbox.</p>
        </div>
      </div>
    `;
    onStatusChange({ state: "idle", count: 0 });
    return {
      setFilters: () => {},
      retry: () => {},
      destroy: () => {
        container.innerHTML = "";
      },
    };
  }

  mapboxgl.accessToken = token;
  const map = new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/streets-v12",
    center: MADRID_FALLBACK,
    zoom: DEFAULT_ZOOM,
  });

  let filters: MapFiltersState = { ...initialFilters };
  let lastSuccessfulPins: PinListItem[] = [];
  let inFlight: AbortController | null = null;
  let destroyed = false;
  let activePopup: mapboxgl.Popup | null = null;

  const tryGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (destroyed) return;
        map.easeTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: DEFAULT_ZOOM,
          duration: 600,
        });
      },
      () => {
        // Permission denied / unavailable: keep Madrid fallback.
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 60_000 }
    );
  };

  const computeStatusList = (state: MapFiltersState): PinStatus[] => {
    const set: PinStatus[] = [];
    if (state.showOpenIsh) set.push(...STATUS_OPEN_ISH);
    if (state.includeResolved) set.push(...STATUS_RESOLVED);
    if (state.includeExpiredFlagged) set.push(...STATUS_EXPIRED_FLAGGED);
    return set;
  };

  const currentBbox = (): string => {
    const b = map.getBounds();
    if (!b) return "";
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    return `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
  };

  const renderPins = (pins: PinListItem[]) => {
    lastSuccessfulPins = pins;
    setPinsData(map, pins);
    onStatusChange({
      state: pins.length === 0 ? "empty" : "idle",
      count: pins.length,
    });
  };

  const fetchForCurrentView = async () => {
    const bbox = currentBbox();
    if (!bbox) return;

    const statuses = computeStatusList(filters);
    if (statuses.length === 0) {
      // No statuses selected -> nothing to show. Skip request.
      if (inFlight) {
        inFlight.abort();
        inFlight = null;
      }
      renderPins([]);
      return;
    }

    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;

    onStatusChange({ state: "loading", count: lastSuccessfulPins.length });

    try {
      const pins = await fetchPinsByBbox({
        bbox,
        type: filters.type === "all" ? undefined : filters.type,
        status: statuses,
        eventId: filters.eventId,
        signal: controller.signal,
      });
      if (controller.signal.aborted || destroyed) return;
      inFlight = null;
      renderPins(pins);
    } catch (err) {
      if ((err as { name?: string } | null)?.name === "AbortError") return;
      if (destroyed) return;
      inFlight = null;
      // Keep last successful pins rendered; surface error for retry UI.
      onStatusChange({ state: "error", count: lastSuccessfulPins.length });
    }
  };

  const debouncedFetch = debounce(fetchForCurrentView, MOVEEND_DEBOUNCE_MS);

  const handleClusterClick = (e: MapMouseEvent) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [CLUSTERS_LAYER_ID],
    });
    const feature = features[0];
    if (!feature) return;
    const clusterId = feature.properties?.["cluster_id"];
    if (typeof clusterId !== "number") return;
    const source = map.getSource(PINS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || destroyed || zoom == null) return;
      const geom = feature.geometry;
      if (geom.type !== "Point") return;
      const coords = geom.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      if (typeof lng !== "number" || typeof lat !== "number") return;
      map.easeTo({ center: [lng, lat], zoom });
    });
  };

  const handlePinClick = (e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;
    const props = feature.properties ?? {};
    const pinId = String(props["id"] ?? "");
    const title = String(props["title"] ?? "");
    const type = String(props["type"] ?? "");
    const status = String(props["status"] ?? "");
    const coords = feature.geometry.coordinates;
    const lng = coords[0];
    const lat = coords[1];
    if (typeof lng !== "number" || typeof lat !== "number") return;

    activePopup?.remove();
    const popup = new mapboxgl.Popup({ closeButton: true, offset: 10 })
      .setLngLat([lng, lat])
      .setHTML(
        `<div class="space-y-1 text-xs text-slate-700">
           <div class="text-sm font-semibold text-slate-900">${escapeHtml(title)}</div>
           <div class="text-slate-500">${escapeHtml(type)} · ${escapeHtml(status)}</div>
           <button type="button" data-pin-id="${escapeHtml(pinId)}" class="mt-1 inline-flex rounded bg-slate-900 px-2 py-1 text-white hover:bg-slate-800">Open detail</button>
         </div>`
      )
      .addTo(map);
    activePopup = popup;

    const popupEl = popup.getElement();
    const btn = popupEl?.querySelector<HTMLButtonElement>("button[data-pin-id]");
    btn?.addEventListener("click", () => {
      if (!pinId) return;
      popup.remove();
      if (onPinOpen) {
        onPinOpen(pinId);
      } else {
        navigate(`/pins/${pinId}`);
      }
    });
  };

  const setUnclusteredCursor = (cursor: "" | "pointer") => {
    map.getCanvas().style.cursor = cursor;
  };

  map.on("load", () => {
    if (destroyed) return;
    registerPinImages(map);
    addPinsLayers(map);

    map.on("click", CLUSTERS_LAYER_ID, handleClusterClick);
    map.on("click", UNCLUSTERED_LAYER_ID, handlePinClick);
    map.on("mouseenter", CLUSTERS_LAYER_ID, () => setUnclusteredCursor("pointer"));
    map.on("mouseleave", CLUSTERS_LAYER_ID, () => setUnclusteredCursor(""));
    map.on("mouseenter", UNCLUSTERED_LAYER_ID, () => setUnclusteredCursor("pointer"));
    map.on("mouseleave", UNCLUSTERED_LAYER_ID, () => setUnclusteredCursor(""));
    map.on("moveend", debouncedFetch);

    tryGeolocate();
    void fetchForCurrentView();
  });

  return {
    setFilters(next) {
      filters = { ...next };
      void fetchForCurrentView();
    },
    retry() {
      void fetchForCurrentView();
    },
    destroy() {
      destroyed = true;
      debouncedFetch.cancel();
      inFlight?.abort();
      inFlight = null;
      activePopup?.remove();
      activePopup = null;
      map.remove();
      container.innerHTML = "";
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

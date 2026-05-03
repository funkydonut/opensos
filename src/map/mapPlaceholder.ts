import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Mounts a Mapbox map when VITE_MAPBOX_TOKEN is set; otherwise shows a friendly placeholder.
 */
export function mountMapPlaceholder(container: HTMLElement): () => void {
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
    return () => {
      container.innerHTML = "";
    };
  }

  mapboxgl.accessToken = token;
  const map = new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-3.7038, 40.4168],
    zoom: 12,
  });

  return () => {
    map.remove();
    container.innerHTML = "";
  };
}

import type {
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MapboxMap,
} from "mapbox-gl";
import type { Feature, FeatureCollection, Point } from "geojson";

import type { PinListItem, PinStatus, PinType } from "../domain/types";

export const PINS_SOURCE_ID = "pins";
export const CLUSTERS_LAYER_ID = "pins-clusters";
export const CLUSTER_COUNT_LAYER_ID = "pins-cluster-count";
export const UNCLUSTERED_LAYER_ID = "pins-unclustered";

export interface PinFeatureProps {
  id: string;
  type: PinType;
  status: PinStatus;
  title: string;
}

export type PinFeatureCollection = FeatureCollection<Point, PinFeatureProps>;

const EMPTY_COLLECTION: PinFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function pinsToGeoJSON(pins: PinListItem[]): PinFeatureCollection {
  const features: Feature<Point, PinFeatureProps>[] = pins.map((pin) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
    properties: {
      id: pin.id,
      type: pin.type,
      status: pin.status,
      title: pin.title,
    },
  }));
  return { type: "FeatureCollection", features };
}

/**
 * Adds the clustered pins source + 3 layers (clusters, cluster count,
 * unclustered points). Clustering parameters come from specs/03-map-spec.md
 * (radius 50, clusterMaxZoom 14).
 */
export function addPinsLayers(map: MapboxMap): void {
  if (map.getSource(PINS_SOURCE_ID)) {
    return;
  }

  const sourceSpec: GeoJSONSourceSpecification = {
    type: "geojson",
    data: EMPTY_COLLECTION,
    cluster: true,
    clusterRadius: 50,
    clusterMaxZoom: 14,
  };
  map.addSource(PINS_SOURCE_ID, sourceSpec);

  map.addLayer({
    id: CLUSTERS_LAYER_ID,
    type: "circle",
    source: PINS_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#1e293b", // slate-800 (neutral cluster bubble)
      "circle-radius": [
        "step",
        ["get", "point_count"],
        16,
        10,
        20,
        50,
        26,
      ],
      "circle-opacity": 0.85,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: PINS_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  const dimStatuses = ["delivered", "resolved", "expired", "flagged"];

  map.addLayer({
    id: UNCLUSTERED_LAYER_ID,
    type: "symbol",
    source: PINS_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": [
        "match",
        ["get", "type"],
        "need",
        ["match", ["get", "status"], dimStatuses, "pin-need-dim", "pin-need"],
        "offer",
        ["match", ["get", "status"], dimStatuses, "pin-offer-dim", "pin-offer"],
        "pin-need",
      ],
      "icon-size": 0.52,
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
}

export function setPinsData(map: MapboxMap, pins: PinListItem[]): void {
  const source = map.getSource(PINS_SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) {
    return;
  }
  source.setData(pinsToGeoJSON(pins));
}

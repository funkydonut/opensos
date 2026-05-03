import type { ExpressionSpecification } from "mapbox-gl";
import type { PinStatus } from "../domain/types";

/** Visual encoding from specs/03-map-spec.md (Pins → Visual encoding v1). */

export const PIN_COLOR_NEED = "#ef4444"; // red
export const PIN_COLOR_OFFER = "#22c55e"; // green
export const PIN_COLOR_FALLBACK = "#64748b"; // slate-500

export const STATUS_OPEN_ISH: PinStatus[] = ["open", "assigned", "in_transit"];
export const STATUS_RESOLVED: PinStatus[] = ["delivered", "resolved"];
export const STATUS_EXPIRED_FLAGGED: PinStatus[] = ["expired", "flagged"];

/** Color by `type` property on each pin feature. */
export const pinColorExpression: ExpressionSpecification = [
  "match",
  ["get", "type"],
  "need",
  PIN_COLOR_NEED,
  "offer",
  PIN_COLOR_OFFER,
  PIN_COLOR_FALLBACK,
];

/** Opacity by `status` property on each pin feature. */
export const pinOpacityExpression: ExpressionSpecification = [
  "match",
  ["get", "status"],
  "open",
  1.0,
  "assigned",
  1.0,
  "in_transit",
  1.0,
  "delivered",
  0.6,
  "resolved",
  0.6,
  "expired",
  0.35,
  "flagged",
  0.35,
  1.0,
];

/** Outline stroke for flagged pins (spec: "add an outline stroke if easy"). */
export const pinStrokeWidthExpression: ExpressionSpecification = [
  "match",
  ["get", "status"],
  "flagged",
  1.5,
  0,
];

/** Domain types aligned with specs/02-data-model.md + specs/05-api-contracts.md. */

export type PinType = "need" | "offer";

export type PinStatus =
  | "open"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "resolved"
  | "expired"
  | "flagged";

export type MatchStatus =
  | "proposed"
  | "confirmed"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface PinItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  priority?: "low" | "normal" | "high" | null;
  notes?: string | null;
}

export interface MatchSummary {
  active_match_count: number;
  is_being_handled: boolean;
}

/** Shape returned by `pins_in_bbox` RPC (map list view). */
export interface PinListItem {
  id: string;
  type: PinType;
  status: PinStatus;
  title: string;
  lat: number;
  lng: number;
  items?: PinItem[];
  match_summary?: MatchSummary;
}

/** Shape returned by `pin_detail` RPC (detail view). */
export interface PinDetail {
  id: string;
  event_id: string | null;
  type: PinType;
  status: PinStatus;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  expires_at: string | null;
  organization_id: string | null;
  items: PinItem[];
  match_summary: MatchSummary;
}

export interface EmergencyEvent {
  id: string;
  name: string;
  region: string | null;
  is_active: boolean;
}

export interface Match {
  id: string;
  need_pin_id: string;
  offer_pin_id: string;
  status: MatchStatus;
  created_by_user_id: string;
  note: string | null;
  created_at: string;
}

export interface MatchItem {
  id: string;
  pin_match_id: string;
  need_pin_item_id: string;
  offer_pin_item_id: string | null;
  quantity: number;
  unit: string;
}

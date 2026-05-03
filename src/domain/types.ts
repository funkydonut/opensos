/** Minimal domain shapes aligned with specs/05-api-contracts.md (extend in Phase 2). */

export type PinType = "need" | "offer";

export type PinStatus =
  | "open"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "resolved"
  | "expired"
  | "flagged";

export interface PinItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  priority?: string;
}

export interface MatchSummary {
  active_match_count: number;
  is_being_handled: boolean;
}

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

export interface EmergencyEvent {
  id: string;
  name: string;
  region: string;
  is_active: boolean;
}

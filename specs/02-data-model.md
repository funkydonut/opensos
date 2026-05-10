# Data Model

Entities (MVP):

## users
- id (uuid)
- name 
- surname
- email
- role
- created_at
- updated_at

## organizations
- id
- name
- verified (boolean)
- created_at
- updated_at

## emergency_events
- id
- name
- region
- is_active
- created_by_user_id (fk → users.id)
- created_by_organization_id (fk → organizations.id, nullable)
- created_at
- updated_at

## pins
- id
- type (need | offer)
- status (open | assigned | in_transit | delivered | resolved | expired | flagged)
- title
- description
- location (PostGIS geography)  // source of truth for geo queries + indexing
- lat  // optional denormalized cache (derived from location)
- lng  // optional denormalized cache (derived from location)
- created_by_user_id (fk → users.id)
- organization_id (fk → organizations.id, nullable)
- event_id (fk → emergency_events.id, nullable)
- created_at
- updated_at
- expires_at

## pin_items
- id (uuid)
- pin_id (fk → pins.id)
- name (string)  // item name or category label
- quantity (number)
- unit (string)  // e.g. "kg", "liters", "units"
- priority (low | normal | high, optional)
- notes (optional)

## pin_matches
- id (uuid)
- need_pin_id (fk → pins.id)  // pins.type must be "need"
- offer_pin_id (fk → pins.id) // pins.type must be "offer"
- status (proposed | confirmed | in_transit | delivered | cancelled)
- created_by_user_id (fk → users.id)
- created_at
- note (optional)

## pin_match_items
- id (uuid)
- pin_match_id (fk → pin_matches.id)
- need_pin_item_id (fk → pin_items.id)
- offer_pin_item_id (fk → pin_items.id, nullable)
- quantity (number)
- unit (string)

## pin_assignments
- id (uuid)
- pin_id (fk → pins.id)
- assigned_to_user_id (fk → users.id, nullable)
- assigned_to_organization_id (fk → organizations.id, nullable)
- assigned_by_user_id (fk → users.id)
- note (optional)
- created_at

## pin_status_events
- id (uuid)
- pin_id (fk → pins.id)
- from_status (open | assigned | in_transit | delivered | resolved | expired | flagged, nullable for creation)
- to_status (open | assigned | in_transit | delivered | resolved | expired | flagged)
- changed_by_user_id (fk → users.id, nullable for system actions like auto-expire)
- changed_at
- metadata (json, optional)

## reports
- id
- pin_id (fk → pins.id)
- reason
- details (optional)
- status (open | reviewed | dismissed | actioned)
- created_by_user_id (fk → users.id)
- created_at
- reviewed_by_user_id (fk → users.id, optional)
- reviewed_at (optional)

Notes:
- A pin can have zero or many `pin_items`.
- `pins.status` reflects the current state; `pin_status_events` is the immutable audit log.
- `pin_matches` captures the connection between an offer and a need (partial or full).
- `pin_match_items` expresses partial fulfillment at the item/quantity level.
- `pin_assignments` captures operational ownership (who is handling a pin) and can exist independently of matching.
- For MVP, organizations are treated as a single entity (no per-user organization memberships/roles).
- Emergency event creation is restricted: only platform managers (e.g. `users.role = admin`) or verified organizations (`organizations.verified = true`) may create `emergency_events`.
- If created by an organization, set `created_by_organization_id`; platform-created events can leave it null.
- Consider indices: `pins(event_id, status)`, geospatial index on `pins.location`, and `pin_items(pin_id)`.

Matching + fulfillment (v1 operational semantics):
- Invariants:
  - `pin_matches.need_pin_id` must reference a pin where `pins.type = need`.
  - `pin_matches.offer_pin_id` must reference a pin where `pins.type = offer`.
  - A `need` can be matched to many offers; an `offer` can be matched to many needs.
- Match status meaning:
  - `proposed`: suggested connection, not yet committed to fulfill.
  - `confirmed`: accepted and expected to fulfill (fully or partially).
  - `in_transit`: fulfillment is underway.
  - `delivered`: fulfillment for this match is complete.
  - `cancelled`: match is no longer active and should not count toward coverage.
- Item-level coverage:
  - `pin_match_items` represents the quantity for a given need item that an offer (or a generic offer) is covering.
  - `offer_pin_item_id` should be populated when creating a match to enable per-item tracking on the offer side.
  - For simplicity in v1, `pin_match_items.unit` must match the corresponding `need` item unit.
- Derived UI signals (do not store in DB; compute):
  - `need.is_being_handled = true` if it has ≥ 1 match with `status ∈ {confirmed, in_transit, delivered}`.
  - Per-need-item coverage:
    - For each `need` item, `covered_quantity = SUM(pin_match_items.quantity)` over matches with `status ∈ {confirmed, in_transit, delivered}`.
    - `coverage_ratio = min(covered_quantity / requested_quantity, 1.0)`.
  - Per-offer-item committed quantity:
    - For each `offer` item, `committed_quantity = SUM(pin_match_items.quantity)` where `offer_pin_item_id = <item_id>` and match `status ∈ {confirmed, in_transit, delivered}`.
    - `available_quantity = pin_items.quantity - committed_quantity`. This is derived (not stored).
    - The create-match UI should display available quantities and prevent over-commitment.
  - Overall need coverage (optional UI): average of item coverage ratios, or show per-item only.

# Frontend Routes & Screens (v1)

This spec defines the minimum UI surface for a v1 production release. It is optimized for agent implementation.

## Global layout
- Full-screen map layout with a top bar (event selector + filters + auth).
- Pin details use a modal over the map.

## Routes

### `/`
**Map**
- **Primary goal**: discover needs/offers in the current area.
- **Data**:
  - `GET /events` (optional on load; needed for event selector)
  - `GET /pins?bbox=...` (debounced on move-end; see `specs/03-map-spec.md`)
- **UI**:
  - Filters: type, status toggles, include unassigned pins (if an event is selected)
  - Clustered pins; click → popup → detail modal

### `/pins/new`
**Create Pin**
- **Goal**: create a new need/offer quickly.
- **Data**:
  - `POST /pins` (auth required)
- **Fields**:
  - type, title, description, location (map click), optional event, optional expires_at
  - items: list of name/quantity/unit/priority

### `/pins/:id`
**Pin Detail (deep link)**
- **Goal**: open a pin detail from a shared link.
- **Data**:
  - `GET /pins/:id`
  - `GET /pins/:id/matches`
- **UI**:
  - Show items and match summary (being handled, active match count)
  - Show the current pin UUID as a copyable `Need ID` or `Offer ID` chip so operators can identify pins precisely.
  - If pin is a need: show coverage per item (covered vs requested)
  - Actions (auth-gated):
    - create a match (connect to an offer):
      - Selecting an offer shows its items with total, committed, and available quantities.
      - Each need item has a dropdown to manually map to a specific offer item.
      - Quantity inputs are capped at `min(need_remaining, offer_available)`.
      - Client validates that requested quantity does not exceed available before submit.
    - update match status (confirmed → in_transit → delivered or cancel)
    - report pin
  - Matches list shows the offer title, copyable `Match` ID, copyable `Offer` pin ID, and per-item breakdown (need item, offer item, quantity) for each match.

### `/auth`
**Sign in**
- **Goal**: authenticate via Supabase Auth.
- **UI**:
  - Choose a single method for MVP (email+password OR magic link)

## Non-goals (v1)
- Admin dashboard (optional later)
- Complex logistics routing
- Attachments / file uploads


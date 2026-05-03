# Seed Data & Demo Scenario (v1)

This spec provides a minimal dataset and a repeatable end-to-end scenario for agents to validate the product flow (map → pin detail → matching → partial fulfillment).

## Seed data (minimum)

### Emergency event
- `event`: "Flood - Madrid (v1 demo)"
- `region`: "Madrid"
- `is_active`: true

### Pins (2 needs, 2 offers)

#### Need A (water + blankets)
- type: `need`
- title: "Need drinking water and blankets"
- items:
  - water: 100 liters (high)
  - blankets: 40 units (normal)

#### Need B (baby formula)
- type: `need`
- title: "Need baby formula"
- items:
  - baby formula: 30 units (high)

#### Offer A (water)
- type: `offer`
- title: "Can provide bottled water"
- items:
  - water: 60 liters (high)

#### Offer B (blankets)
- type: `offer`
- title: "Blankets available"
- items:
  - blankets: 100 units (normal)

## Demo scenario (happy path)

### 0) Pre-req
- Have a valid Supabase access token for authenticated calls.
- Mapbox token configured so pins are visible on the map.

### 1) Create an emergency event (restricted)
`POST /events` (Auth required; only admin or verified org)

Expected:
- 201 with `{ "id": "<event_id>" }`

### 2) Create pins (needs and offers)
For each pin, call `POST /pins` with:
- `event_id = <event_id>` (optional, but use it for the demo)
- location: pick coordinates inside your demo bbox
- include `items` for the pin

Expected:
- 201 with `{ "id": "<pin_id>" }` for each created pin

### 3) Verify map loading
Call `GET /pins?bbox=minLng,minLat,maxLng,maxLat&event_id=<event_id>`

Expected:
- Need A and Need B appear with `items` and `match_summary.is_being_handled = false`

### 4) Create a partial match: Offer A covers part of Need A (water)
`POST /matches` (Auth required)
Body:
- `need_pin_id = <needA_id>`
- `offer_pin_id = <offerA_id>`
- `status = confirmed`
- `items`: one row that covers water partially:
  - `need_pin_item_id = <needA_water_item_id>`
  - `offer_pin_item_id = <offerA_water_item_id>`
  - `quantity = 60`
  - `unit = liters`

Expected:
- 201 with `{ "id": "<match_id>" }`
- Need A now counts as "being handled" (match is active)

### 5) Verify need handling + coverage in pin detail
Call:
- `GET /pins/<needA_id>`
- `GET /pins/<needA_id>/matches`

Expected:
- `match_summary.is_being_handled = true`
- Coverage for Need A:
  - water: covered 60 / requested 100 (60%)
  - blankets: covered 0 / requested 40 (0%)

### 6) Add a second match: Offer B covers blankets fully
`POST /matches` (Auth required)
Body:
- `need_pin_id = <needA_id>`
- `offer_pin_id = <offerB_id>`
- `status = confirmed`
- `items`: blankets coverage:
  - `need_pin_item_id = <needA_blankets_item_id>`
  - `offer_pin_item_id = <offerB_blankets_item_id>`
  - `quantity = 40`
  - `unit = units`

Expected:
- Need A coverage becomes:
  - water: 60/100
  - blankets: 40/40 (100%)

### 7) Progress the first match through delivery
`PATCH /matches/<match_id>` (Auth required)
Set:
- `status = in_transit` → then `delivered`

Expected:
- `GET /pins/<needA_id>` still shows `is_being_handled = true` while at least one match is active/delivered.

### 8) Cancel a match (optional)
`PATCH /matches/<match_id>` with `status = cancelled`

Expected:
- Cancelled matches should not count toward `active_match_count` nor coverage in v1 (see `specs/05-api-contracts.md`).

## Notes for agents
- Keep the scenario deterministic: fixed event, fixed pins, fixed item names/units.
- Validate that UI derived rules match `specs/02-data-model.md` ("Matching + fulfillment (v1 operational semantics)").


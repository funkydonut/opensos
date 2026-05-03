# API Contracts

Conventions (v1):
- Auth header (Supabase):
  - `Authorization: Bearer <access_token>`
- Public vs authenticated access:
  - Public (no auth): `GET /pins`, `GET /pins/:id`, `GET /events`, `GET /pins/:id/matches`
  - Auth required: all write endpoints (`POST`, `PATCH`)
- Errors (minimal):
  - 400: `{ "error": "bad_request" }`
  - 401: `{ "error": "unauthorized" }`
  - 403: `{ "error": "forbidden" }`
  - 404: `{ "error": "not_found" }`

GET /pins?bbox=
Query params:
- `bbox` (required): `minLng,minLat,maxLng,maxLat`
- `event_id` (optional): `"uuid"` (if omitted, return all events)
- `type` (optional): `need | offer`
- `status` (optional, repeatable): `open | assigned | in_transit | delivered | resolved | expired | flagged`

Response:
[
  {
    "id": "uuid",
    "type": "need",
    "status": "open",
    "title": "...",
    "lat": 0,
    "lng": 0,
    "items": [
      { "id": "uuid", "name": "water", "quantity": 100, "unit": "liters", "priority": "high" }
    ],
    "match_summary": {
      "active_match_count": 1,
      "is_being_handled": true
    }
  }
]
Status codes:
- 200 OK

GET /pins/:id
Response:
{
  "id": "uuid",
  "event_id": "uuid | null",
  "type": "need",
  "status": "open",
  "title": "...",
  "description": "...",
  "lat": 0,
  "lng": 0,
  "expires_at": "2026-04-30T12:00:00Z",
  "organization_id": "uuid",
  "items": [
    { "id": "uuid", "name": "water", "quantity": 100, "unit": "liters", "priority": "high" }
  ],
  "match_summary": {
    "active_match_count": 1,
    "is_being_handled": true
  }
}
Status codes:
- 200 OK
- 404 Not Found

POST /pins
Auth: required
Body:
{
  "event_id": "uuid",
  "type": "need",
  "title": "...",
  "description": "...",
  "lat": 0,
  "lng": 0,
  "expires_at": "2026-04-30T12:00:00Z",
  "organization_id": "uuid",
  "items": [
    { "name": "water", "quantity": 100, "unit": "liters", "priority": "high" }
  ]
}
Response (201):
{ "id": "uuid" }
Status codes:
- 201 Created
- 400 Bad Request
- 401 Unauthorized

Notes:
- `event_id` is optional; pins may exist without an assigned emergency event.
- `match_summary.active_match_count` counts matches with status in: `confirmed | in_transit | delivered`.

GET /events
Response:
[
  {
    "id": "uuid",
    "name": "...",
    "region": "...",
    "is_active": true
  }
]
Status codes:
- 200 OK

POST /events
Auth: required
Authorization:
- Only platform managers (e.g. admin) or verified organizations may create emergency events.
Body:
{
  "name": "...",
  "region": "...",
  "is_active": true
}
Response (201):
{ "id": "uuid" }
Status codes:
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

PATCH /pins/:id/status
Auth: required
Body:
{
  "status": "assigned",
  "note": "Optional note"
}
Status codes:
- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

POST /matches
Auth: required
Body:
{
  "need_pin_id": "uuid",
  "offer_pin_id": "uuid",
  "status": "confirmed",
  "items": [
    { "need_pin_item_id": "uuid", "offer_pin_item_id": "uuid", "quantity": 30, "unit": "liters" }
  ],
  "note": "Optional note"
}
Response (201):
{ "id": "uuid" }
Status codes:
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

PATCH /matches/:id
Auth: required
Body:
{
  "status": "proposed | confirmed | in_transit | delivered | cancelled"
}
Status codes:
- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

GET /pins/:id/matches
Response:
[
  {
    "id": "uuid",
    "need_pin_id": "uuid",
    "offer_pin_id": "uuid",
    "status": "confirmed",
    "items": [
      { "need_pin_item_id": "uuid", "offer_pin_item_id": "uuid", "quantity": 30, "unit": "liters" }
    ]
  }
]
Status codes:
- 200 OK
- 404 Not Found

Notes:
- Matches returned should include only non-cancelled matches by default (v1). If needed later, add `include_cancelled=true`.

POST /assignments
Auth: required
Body:
{
  "pin_id": "uuid",
  "assigned_to_user_id": "uuid",
  "assigned_to_organization_id": "uuid",
  "note": "Optional note"
}
Validation (v1):
- At least one of `assigned_to_user_id` or `assigned_to_organization_id` must be provided.
Response (201):
{ "id": "uuid" }
Status codes:
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

POST /reports
Auth: required
Body:
{
  "pin_id": "...",
  "reason": "spam",
  "details": "Optional free text"
}
Response (201):
{ "id": "uuid" }
Status codes:
- 201 Created
- 400 Bad Request
- 401 Unauthorized

Operational limits (v1):
- `GET /pins?bbox=` should enforce a reasonable max result count per request (e.g. 1000) to protect performance; rely on clustering + viewport to keep it manageable.

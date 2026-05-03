# Pin Lifecycle

States:
- open
- assigned
- in_transit
- delivered
- resolved
- expired
- flagged

Rules:
- open → assigned (manual)
- assigned → in_transit
- in_transit → delivered
- delivered → resolved
- any → flagged (moderation)
- open → expired (time-based)

Pins auto-expire based on expires_at.

Operational notes:
- A pin typically moves to `assigned` when there is at least one confirmed match between a need and an offer.
- Operational ownership (who is handling a pin) is tracked separately via `pin_assignments` and is optional.
- Every status change should be appended to an immutable audit log (e.g. `pin_status_events`) including who changed it (or system for auto-expire).

v1 UI semantics (derived):
- A `need` is considered "being handled" when it has ≥1 `pin_matches` with `status ∈ {confirmed, in_transit, delivered}`.
- A `need` can be partially handled: show per-item coverage using `pin_match_items` (covered vs requested quantities).
- `pins.status = assigned` should be used as a coarse indicator ("there is an active match"), but the UI should rely on match coverage for partial/complete progress.

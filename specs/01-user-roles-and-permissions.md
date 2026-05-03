# User Roles & Permissions (v1, authoritative)

## 1. Goal

Define every user role in OpenSOS and exactly what each one can / cannot do.

This spec is **authoritative** for v1. No new roles should be introduced without updating it. It also drives Supabase **RLS** policies and frontend UI gating.

## 2. Roles overview

The MVP keeps the role list intentionally small:

- `anonymous` — not logged in (implicit, not stored)
- `citizen` — registered user, baseline
- `volunteer` — registered user with a "volunteer" badge (UI hint only in v1; same permissions as `citizen`)
- `org` — single account that represents an organization (no per-user memberships in MVP, see `02-data-model.md`)
- `admin` — platform manager; also covers moderation in v1 (no separate `moderator` role yet)

Stored as `users.role` (one of `citizen | volunteer | org | admin`). `anonymous` is implicit.

## 3. Role definitions

### 3.1 anonymous

Not logged in.

Can:
- view map, pins, pin details, emergency events, matches

Cannot:
- create pins, matches, assignments, reports

### 3.2 citizen

Authenticated user, baseline.

Can:
- everything `anonymous` can
- create pins (`need` / `offer`)
- create matches between pins (e.g. "I can cover this need")
- create assignments (operational ownership: "Me encargo")
- report pins
- update their own pins (title/description/items)
- cancel their own assignments / their own matches

Cannot:
- moderate or hide content
- update other users' pins
- create emergency events (unless representing a verified `org` or being `admin`)

### 3.3 volunteer

Same permissions as `citizen` in v1. The role exists so the UI can show a "volunteer" badge and so we can grant extra capabilities later (e.g. higher trust) without a data migration.

### 3.4 org

A single account that represents an organization (e.g. NGO, local org).

Can:
- everything `citizen` can
- create pins linked to the organization (`pins.organization_id`)
- if `organizations.verified = true`, create emergency events (`POST /events`)

Cannot:
- moderate global content
- delete pins it does not own

Notes:
- In MVP, an organization == one user account with `role = org`. There are no organization memberships. "Manage organization members" is deferred to v1.5+.
- "Verified organization" is an attribute of the `organizations` row (`verified = true`), not a separate role.

### 3.5 admin

Platform manager.

Can:
- everything `org` and `citizen` can
- create / update / archive emergency events
- moderate any pin (set `status = flagged`, hide content)
- review and resolve `reports`
- override any pin or assignment
- manage users (set `users.role`, mark organizations as `verified`)
- access audit logs (`pin_status_events`)

In MVP, `admin` covers what would be a separate `moderator` role.

## 4. Permission matrix (MVP)

| Action                                | anonymous | citizen | volunteer | org   | admin |
| ------------------------------------- | --------- | ------- | --------- | ----- | ----- |
| View map / pins / events / matches    | yes       | yes     | yes       | yes   | yes   |
| Create pin                            | no        | yes     | yes       | yes   | yes   |
| Update own pin                        | no        | yes     | yes       | yes   | yes   |
| Update any pin                        | no        | no      | no        | no    | yes   |
| Create match                          | no        | yes     | yes       | yes   | yes   |
| Update match status (own)             | no        | yes     | yes       | yes   | yes   |
| Create assignment                     | no        | yes     | yes       | yes   | yes   |
| Update assignment status (own)        | no        | yes     | yes       | yes   | yes   |
| Report pin                            | no        | yes     | yes       | yes   | yes   |
| Hide / flag pin                       | no        | no      | no        | no    | yes   |
| Create emergency event                | no        | no      | no        | yes*  | yes   |
| Mark organization as verified         | no        | no      | no        | no    | yes   |
| Manage users / change roles           | no        | no      | no        | no    | yes   |

\* `org` can create events only if `organizations.verified = true` (see `02-data-model.md`).

## 5. Match & assignment rules

### Matches (`pin_matches`)
- Only `citizen | volunteer | org | admin` can create matches.
- A match links one `need` pin to one `offer` pin.
- Allowed transitions on `pin_matches.status`: see `04-pin-lifecycle-spec.md` and `02-data-model.md`.
- Update match status:
  - the user who created the match can transition through states (`proposed → confirmed → in_transit → delivered`) or `cancelled` it.
  - the creator of either pin involved can also confirm/cancel.
  - `admin` can override.

### Assignments (`pin_assignments`, ownership)
- Any authenticated user can create an assignment to take operational ownership of a pin.
- A pin can have multiple assignment records over time (history); the most recent one is the active one.
- Update / cancel:
  - the assignee or the user who created the assignment can cancel.
  - `admin` can override.

## 6. Pin ownership rules

A pin belongs to:
- a user (`created_by_user_id`)
- optionally an organization (`organization_id`)

Edit rules:
- the creator can edit fields like title / description / items / `expires_at`.
- if the pin is linked to an `org` account, that `org` can edit too.
- `admin` can override anything.

## 7. Trust hierarchy (UI hint only in v1)

From lowest to highest trust shown to other users:
1. `anonymous` (cannot post)
2. `citizen`
3. `volunteer`
4. `org` (especially if `verified = true`)
5. `admin`

The UI may show small badges. v1 does **not** change permissions based on trust beyond what the matrix says.

## 8. Reporting & moderation flow

Who can report:
- any authenticated user (`citizen | volunteer | org | admin`)

Flow:
- user creates a `report` on a pin
- `admin` reviews the report
- pin may be set to `status = flagged` or hidden (admin action)
- `reports.status` moves to `reviewed | dismissed | actioned`

Hidden pins:
- are filtered out of public map endpoints
- still exist in the database for audit

## 9. Security rules

- All write operations require authentication (`Authorization: Bearer <access_token>`, see `05-api-contracts.md`).
- Permissions MUST be enforced server-side via Supabase **RLS** (see `10-rls-policies.md`).
- Frontend gating is UX only and is **not** a security boundary.

## 10. Rules for v1

- Roles are fixed: `anonymous | citizen | volunteer | org | admin`.
- No new roles without updating this file first.
- Agents must not bypass permission checks at the API or DB layer.
- Anything beyond MVP (e.g. dedicated moderator role, organization memberships) goes to v1.5+.

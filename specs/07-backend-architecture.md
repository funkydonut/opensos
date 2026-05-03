# Backend Architecture (Supabase)

This document defines the minimum backend architecture for a v1 production release using Supabase. Deployment / hosting concerns live in `08-deployment.md`. Roles and permissions live in `01-user-roles-and-permissions.md`.

## Platform
- **Backend**: Supabase
  - Postgres (source of truth)
  - PostGIS for geospatial querying (pins by bbox)
  - Auth for user accounts and sessions
  - Realtime for live updates (optional in v1; can be incremental)
  - Storage (out of scope for v1 unless attachments are introduced)

## Data access strategy (v1)
- **Default**: client uses Supabase JS to query PostgREST for CRUD on tables.
- **Edge Functions**: only for actions that require server-side logic beyond RLS (keep these minimal).

## Auth & roles (v1)
- Authentication via Supabase Auth (email/password or magic link; choose one for MVP).
- `users.role` is the application role field — one of `citizen | volunteer | org | admin` (see `01-user-roles-and-permissions.md`). `anonymous` is implicit.
- Authorization is enforced primarily with **Row Level Security (RLS)** (see `10-rls-policies.md`).

## Authorization rules (minimum)
- **Emergency events creation**:
  - Only `admin` users (`users.role = admin`) or `org` users acting on behalf of a verified organization (`organizations.verified = true`) may create `emergency_events`.
  - Implementation options:
    - RLS + a database function (preferred), or
    - an Edge Function that performs the check and inserts.
- **Pins**:
  - Anyone authenticated (`citizen | volunteer | org | admin`) can create pins.
  - Updates:
    - status changes and match creation require authentication.
    - moderation actions (e.g. flag/hide) are restricted to `admin`.

## Geospatial querying
- Pins are stored with `pins.location` as the source of truth.
- The main map endpoint pattern is bbox querying:
  - `GET /pins?bbox=minLng,minLat,maxLng,maxLat`
- Ensure a geospatial index exists on `pins.location`.

## Realtime strategy (incremental)
- v1 can ship with:
  - **move-end refresh** (debounced) as baseline (see `specs/03-map-spec.md`)
  - optional Realtime subscription for the current event, if it does not overcomplicate scope

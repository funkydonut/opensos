# DB Schema Reference (v1)

This is a practical schema reference for agents implementing Supabase migrations. It complements `specs/02-data-model.md`.

Conventions:
- Primary keys: `uuid` with default `gen_random_uuid()`
- Timestamps: `timestamptz` (`created_at` default `now()`)
- Geo: `geography(Point, 4326)` for `pins.location` (PostGIS)

## users
- `id uuid` (pk)
- `email text` (unique, not null)
- `name text` (nullable)
- `surname text` (nullable)
- `role text` (not null)  // `citizen|volunteer|org|admin`
- `created_at timestamptz` (not null)
- `updated_at timestamptz` (not null)

## organizations
- `id uuid` (pk)
- `name text` (not null)
- `verified boolean` (not null, default false)
- `created_at timestamptz` (not null)
- `updated_at timestamptz` (not null)

## emergency_events
- `id uuid` (pk)
- `name text` (not null)
- `region text` (nullable)
- `is_active boolean` (not null, default true)
- `created_by_user_id uuid` (fk → users.id, not null)
- `created_by_organization_id uuid` (fk → organizations.id, nullable)
- `created_at timestamptz` (not null)
- `updated_at timestamptz` (not null)

## pins
- `id uuid` (pk)
- `event_id uuid` (fk → emergency_events.id, nullable)
- `type text` (not null)  // `need|offer`
- `status text` (not null)  // `open|assigned|in_transit|delivered|resolved|expired|flagged`
- `title text` (not null)
- `description text` (nullable)
- `location geography(Point, 4326)` (not null)
- `lat double precision` (nullable) // optional cache
- `lng double precision` (nullable) // optional cache
- `created_by_user_id uuid` (fk → users.id, not null)
- `organization_id uuid` (fk → organizations.id, nullable)
- `expires_at timestamptz` (nullable)
- `created_at timestamptz` (not null)
- `updated_at timestamptz` (not null)
Indexes:
- GIST index on `location`
- btree on `(event_id, status)`

## pin_items
- `id uuid` (pk)
- `pin_id uuid` (fk → pins.id, not null, on delete cascade)
- `name text` (not null)
- `quantity numeric` (not null)
- `unit text` (not null)
- `priority text` (nullable) // `low|normal|high`
- `notes text` (nullable)

## pin_matches
- `id uuid` (pk)
- `need_pin_id uuid` (fk → pins.id, not null)
- `offer_pin_id uuid` (fk → pins.id, not null)
- `status text` (not null) // `proposed|confirmed|in_transit|delivered|cancelled`
- `created_by_user_id uuid` (fk → users.id, not null)
- `note text` (nullable)
- `created_at timestamptz` (not null)
Indexes:
- btree on `need_pin_id`
- btree on `offer_pin_id`

## pin_match_items
- `id uuid` (pk)
- `pin_match_id uuid` (fk → pin_matches.id, not null, on delete cascade)
- `need_pin_item_id uuid` (fk → pin_items.id, not null)
- `offer_pin_item_id uuid` (fk → pin_items.id, nullable)
- `quantity numeric` (not null)
- `unit text` (not null)

## pin_assignments (ownership)
- `id uuid` (pk)
- `pin_id uuid` (fk → pins.id, not null)
- `assigned_to_user_id uuid` (fk → users.id, nullable)
- `assigned_to_organization_id uuid` (fk → organizations.id, nullable)
- `assigned_by_user_id uuid` (fk → users.id, not null)
- `note text` (nullable)
- `created_at timestamptz` (not null)

## pin_status_events (audit log)
- `id uuid` (pk)
- `pin_id uuid` (fk → pins.id, not null)
- `from_status text` (nullable)
- `to_status text` (not null)
- `changed_by_user_id uuid` (fk → users.id, nullable)
- `changed_at timestamptz` (not null)
- `metadata jsonb` (nullable)

## reports
- `id uuid` (pk)
- `pin_id uuid` (fk → pins.id, not null)
- `reason text` (not null)
- `details text` (nullable)
- `status text` (not null, default 'open') // `open|reviewed|dismissed|actioned`
- `created_by_user_id uuid` (fk → users.id, not null)
- `created_at timestamptz` (not null)
- `reviewed_by_user_id uuid` (fk → users.id, nullable)
- `reviewed_at timestamptz` (nullable)


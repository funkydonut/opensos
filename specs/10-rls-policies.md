# Supabase RLS Policies (human-readable, v1)

This document describes the minimum Row Level Security (RLS) intent. It is not SQL, but should map 1:1 to policies. Roles are defined in `01-user-roles-and-permissions.md` (the authoritative source).

Assumptions:
- Public read endpoints are supported by enabling SELECT for anon/auth where stated.
- Writes require authentication (`auth.uid()` exists).
- `users.role` is one of `citizen | volunteer | org | admin` (`anonymous` is implicit).
- In MVP, `admin` also performs moderation (no separate `moderator` role yet).

## users
- SELECT: authenticated users can read their own row.
- INSERT/UPDATE: only allow the user to manage their own profile fields (if applicable).

## organizations
- SELECT: public (at least `id`, `name`, `verified`) if needed for UI.
- INSERT/UPDATE: restricted (v1: only admins manage org verification).

## emergency_events
- SELECT: public (at least active events).
- INSERT: only `admin` OR authenticated users associated with a verified organization (implementation-specific).
- UPDATE: only `admin` (v1).

## pins
- SELECT: public.
- INSERT: authenticated only.
- UPDATE:
  - status changes: authenticated; moderation transitions (`flagged`, hidden) restricted to `admin`.
  - basic edits (title/description/items): only by the creator, the linked `org` (if any), or `admin`.

## pin_items
- SELECT: public (as part of pin read).
- INSERT/UPDATE/DELETE: authenticated, tied to the parent pin's write rules.

## pin_matches
- SELECT: public (or authenticated-only if you want privacy; v1 uses public reads for simplicity).
- INSERT: authenticated.
- UPDATE (status): authenticated, ideally only:
  - the match creator, OR
  - the creator of either pin involved, OR
  - `admin` (override).

## pin_match_items
- SELECT: public.
- INSERT/UPDATE/DELETE: authenticated, tied to the parent match's write rules.

## pin_assignments
- SELECT: authenticated (recommended), because it can reveal operational details.
- INSERT: authenticated.
- UPDATE/DELETE: authenticated, ideally only admin (v1) to keep rules simple.

## reports
- SELECT: `admin` only.
- INSERT: authenticated.
- UPDATE (review): `admin` only.


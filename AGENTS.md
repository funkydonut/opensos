# AGENTS.md — read this first

This file is the entry point for any coding agent working on **OpenSOS**. It tells you what the project is, where to read in what order, and what conventions to follow.

## What is OpenSOS

Real-time coordination platform for emergencies: people and organizations publish needs and offers as **pins** on a map; matches connect them. Read [`specs/00-product-brief.md`](specs/00-product-brief.md) first.

## Reading order (do this in order, top to bottom)

1. [`specs/00-product-brief.md`](specs/00-product-brief.md) — product context and concrete problems.
2. [`specs/01-user-roles-and-permissions.md`](specs/01-user-roles-and-permissions.md) — **authoritative** roles and permissions (drives RLS and UI gating).
3. [`specs/02-data-model.md`](specs/02-data-model.md) — entities, relations, MVP semantics.
4. [`specs/03-map-spec.md`](specs/03-map-spec.md) — operational map (Mapbox).
5. [`specs/04-pin-lifecycle-spec.md`](specs/04-pin-lifecycle-spec.md) — pin status state machine.
6. [`specs/05-api-contracts.md`](specs/05-api-contracts.md) — API endpoints + status codes (target contract).
7. [`specs/06-frontend-architecture.md`](specs/06-frontend-architecture.md) — frontend stack and folder layout.
8. [`specs/07-backend-architecture.md`](specs/07-backend-architecture.md) — Supabase backend approach.
9. [`specs/08-deployment.md`](specs/08-deployment.md) — Vercel + Supabase deploy checklist.
10. [`specs/10-rls-policies.md`](specs/10-rls-policies.md) — human-readable RLS intent (must reflect spec 01).
11. [`specs/11-db-schema-reference.md`](specs/11-db-schema-reference.md) — practical schema for migrations.
12. [`specs/12-frontend-routes-and-screens.md`](specs/12-frontend-routes-and-screens.md) — UI surface.
13. [`specs/13-seed-data-and-demo-scenario.md`](specs/13-seed-data-and-demo-scenario.md) — repeatable end-to-end check.

(There is no `09-` spec on purpose.)

## Roadmaps & progress tracking

- [`AGENT_ROADMAP.txt`](AGENT_ROADMAP.txt) — implementation prompts split into phases. Mark `[x]` when code is implemented and `npm run build` is green.
- [`CREATOR_ROADMAP.txt`](CREATOR_ROADMAP.txt) — manual / dashboard steps the project owner does (Supabase, Vercel, secrets). Agent only marks `[x]` on lines explicitly labeled `Agent can verify`.
- Both files have a `Progress log` section at the end — append one line per milestone.

## Conventions for agents

- **Roles** are exactly `anonymous | citizen | volunteer | org | admin` per `specs/01-user-roles-and-permissions.md`. Do not invent new roles.
- **Authorization** is enforced server-side (Supabase RLS, see `specs/10-rls-policies.md`). Frontend gating is UX only.
- **Secrets**: never commit `.env`, never use the Supabase `service_role` key in the client. The browser uses `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_TOKEN` only (see `specs/08-deployment.md`).
- **Frontend layout** (see `specs/06-frontend-architecture.md`):
  - `src/screens/` — full route-level screens (Home, PinDetail, PinsNew, Auth, NotFound).
  - `src/components/` — reusable UI bits only (buttons, modals, filters, badges).
  - `src/map/`, `src/api/`, `src/domain/`, `src/auth/`, `src/supabase/`, `src/utils/` — as documented.
- **Stay within scope**: prefer small, reviewable PR-sized changes; do not invent new entities or endpoints not in the specs without updating the spec first.
- **Do not edit** `AGENTS.md` only to record progress — use the roadmap progress logs instead.

## When something is unclear

Ask the user. Do not guess on:
- security / RLS rules
- creating new roles or new tables
- changing public/private read access of existing endpoints

If a spec contradicts another, flag it instead of silently deciding. Spec `01` wins for roles; spec `02` wins for data model.

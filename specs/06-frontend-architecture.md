# Frontend Architecture (Vercel + Supabase)

Stack:
- Vite
- TypeScript
- Tailwind
- Mapbox GL JS
- Supabase JS (Auth + Database access)

Structure:

src/
  main.ts
  app.ts
  map/
  api/
  screens/
  components/
  domain/
  utils/
  auth/
  supabase/

Responsibilities:
- map/: rendering and interactions
- api/: data fetching layer (Supabase queries + Edge Function calls)
- supabase/: Supabase client setup and helpers
- auth/: session handling, guards, hooks (NOT screens; auth screens live in screens/)
- screens/: route-level screens (Home, PinDetail, PinsNew, Auth, NotFound)
- components/: reusable UI elements only (buttons, modals, badges, filters)
- domain/: types
- utils/: helpers (router, render dispatcher)

State:
- minimal global state
- local module-based state

Backend integration (v1):
- Supabase is the backend of record (Postgres + PostGIS).
- Prefer Supabase PostgREST/JS queries for standard CRUD.
- Use Supabase Edge Functions only when:
  - enforcing server-side workflows that don't fit RLS alone (e.g. permissioned event creation), or
  - aggregations that would otherwise be chatty from the client.
- Realtime:
  - Use Supabase Realtime subscriptions for pin updates within the current viewport/event when feasible.
  - Fallback: polling/refresh on map move as specified in `specs/03-map-spec.md`.

Hosting (v1):
- Frontend deployed on Vercel.
- Environment variables are managed in Vercel project settings (Supabase URL/anon key, Mapbox token).

# OpenSOS

Real-time coordination for emergency resource needs and offers. Start here: [`AGENTS.md`](AGENTS.md) (entry point + reading order). Product specs live in [`specs/`](specs/). Roadmaps: [`AGENT_ROADMAP.txt`](AGENT_ROADMAP.txt) (implementation prompts + checkboxes), [`CREATOR_ROADMAP.txt`](CREATOR_ROADMAP.txt) (your manual / dashboard steps + checkboxes).

## Prerequisites

- **Node.js** 20+ recommended
- **npm** (ships with Node)

## Local development

```bash
npm install
cp .env.example .env
# Edit .env: set VITE_MAPBOX_TOKEN (and Supabase vars when backend is wired)
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Vite dev server + HMR    |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Serve `dist/` locally |

## Environment variables

Defined in [specs/08-deployment.md](specs/08-deployment.md):

| Variable                 | Description                    |
| ------------------------ | ------------------------------ |
| `VITE_SUPABASE_URL`      | Supabase project URL           |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key     |
| `VITE_MAPBOX_TOKEN`      | Mapbox access token for the map |

The map shows a placeholder until `VITE_MAPBOX_TOKEN` is set.

## Project layout (frontend)

Matches [specs/06-frontend-architecture.md](specs/06-frontend-architecture.md):

- `src/map/` — map rendering
- `src/api/` — data fetching (stubs until Phase 2)
- `src/screens/` — route-level screens (Home, PinDetail, PinsNew, Auth, NotFound)
- `src/components/` — reusable UI elements (buttons, modals, badges)
- `src/domain/` — types
- `src/utils/` — helpers (router, render dispatcher)
- `src/auth/` — auth session/guards/hooks (auth screens live in `src/screens/`)
- `src/supabase/` — Supabase client

## Routes (v1)

See [specs/12-frontend-routes-and-screens.md](specs/12-frontend-routes-and-screens.md):

- `/` — map home
- `/pins/new` — create pin (placeholder)
- `/pins/:id` — pin detail (placeholder)
- `/auth` — sign in (placeholder)

## Deployment

Configure the same `VITE_*` variables in Vercel per [specs/08-deployment.md](specs/08-deployment.md). Database and RLS: [specs/11-db-schema-reference.md](specs/11-db-schema-reference.md), [specs/10-rls-policies.md](specs/10-rls-policies.md).

## License

Private / TBD.

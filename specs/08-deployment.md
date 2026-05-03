# Deployment (Vercel + Supabase)

This document defines the minimum deployment setup for a v1 production release.

## Hosting
- **Frontend**: Vercel (static frontend, with serverless available if needed later).

## Environment variables (Vercel)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_TOKEN`

## Supabase production checklist (v1)
- Database:
  - Tables + indices + RLS policies created via migrations
  - PostGIS enabled and geospatial index exists on `pins.location`
- Security:
  - Service role key is never exposed to the client
  - RLS enabled on all public tables
- Networking:
  - CORS/allowed origins configured for the Vercel domains


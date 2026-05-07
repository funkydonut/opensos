-- OpenSOS v1 schema (tables, indexes, triggers)
-- Source of truth: specs/11-db-schema-reference.md + specs/02-data-model.md
--
-- Apply in Supabase SQL editor (Database > SQL editor).
-- This file is idempotent where reasonable; if applying repeatedly, drop objects first.

begin;

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- Helpers
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_pin_lat_lng()
returns trigger
language plpgsql
as $$
begin
  -- Cache lat/lng from geography point for convenience in the client.
  new.lng = st_x(new.location::geometry);
  new.lat = st_y(new.location::geometry);
  return new;
end;
$$;

-- Tables
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text null,
  surname text null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (role in ('citizen','volunteer','org','admin'))
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emergency_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text null,
  is_active boolean not null default true,
  created_by_user_id uuid not null references public.users(id),
  created_by_organization_id uuid null references public.organizations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.emergency_events(id),
  type text not null,
  status text not null,
  title text not null,
  description text null,
  location geography(Point, 4326) not null,
  lat double precision null,
  lng double precision null,
  created_by_user_id uuid not null references public.users(id),
  organization_id uuid null references public.organizations(id),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pins_type_check check (type in ('need','offer')),
  constraint pins_status_check check (status in ('open','assigned','in_transit','delivered','resolved','expired','flagged'))
);

create table if not exists public.pin_items (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id) on delete cascade,
  name text not null,
  quantity numeric not null,
  unit text not null,
  priority text null,
  notes text null,
  constraint pin_items_priority_check check (priority is null or priority in ('low','normal','high'))
);

create table if not exists public.pin_matches (
  id uuid primary key default gen_random_uuid(),
  need_pin_id uuid not null references public.pins(id),
  offer_pin_id uuid not null references public.pins(id),
  status text not null,
  created_by_user_id uuid not null references public.users(id),
  note text null,
  created_at timestamptz not null default now(),
  constraint pin_matches_status_check check (status in ('proposed','confirmed','in_transit','delivered','cancelled'))
);

create table if not exists public.pin_match_items (
  id uuid primary key default gen_random_uuid(),
  pin_match_id uuid not null references public.pin_matches(id) on delete cascade,
  need_pin_item_id uuid not null references public.pin_items(id),
  offer_pin_item_id uuid null references public.pin_items(id),
  quantity numeric not null,
  unit text not null
);

create table if not exists public.pin_assignments (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id),
  assigned_to_user_id uuid null references public.users(id),
  assigned_to_organization_id uuid null references public.organizations(id),
  assigned_by_user_id uuid not null references public.users(id),
  note text null,
  created_at timestamptz not null default now()
);

create table if not exists public.pin_status_events (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id) on delete cascade,
  from_status text null,
  to_status text not null,
  changed_by_user_id uuid null references public.users(id),
  changed_at timestamptz not null default now(),
  metadata jsonb null,
  constraint pin_status_events_to_check check (to_status in ('open','assigned','in_transit','delivered','resolved','expired','flagged')),
  constraint pin_status_events_from_check check (from_status is null or from_status in ('open','assigned','in_transit','delivered','resolved','expired','flagged'))
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id) on delete cascade,
  reason text not null,
  details text null,
  status text not null default 'open',
  created_by_user_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  reviewed_by_user_id uuid null references public.users(id),
  reviewed_at timestamptz null,
  constraint reports_status_check check (status in ('open','reviewed','dismissed','actioned'))
);

-- Indexes
create index if not exists pins_location_gist_idx on public.pins using gist (location);
create index if not exists pins_event_status_idx on public.pins (event_id, status);
create index if not exists pin_items_pin_id_idx on public.pin_items (pin_id);
create index if not exists pin_matches_need_pin_id_idx on public.pin_matches (need_pin_id);
create index if not exists pin_matches_offer_pin_id_idx on public.pin_matches (offer_pin_id);
create index if not exists pin_status_events_pin_id_idx on public.pin_status_events (pin_id);
create index if not exists reports_pin_id_idx on public.reports (pin_id);

-- Triggers
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_users_updated_at') then
    create trigger trg_users_updated_at before update on public.users
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_orgs_updated_at') then
    create trigger trg_orgs_updated_at before update on public.organizations
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_events_updated_at') then
    create trigger trg_events_updated_at before update on public.emergency_events
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_pins_updated_at') then
    create trigger trg_pins_updated_at before update on public.pins
    for each row execute function public.touch_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_pins_set_lat_lng_ins') then
    create trigger trg_pins_set_lat_lng_ins before insert on public.pins
    for each row execute function public.set_pin_lat_lng();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_pins_set_lat_lng_upd') then
    create trigger trg_pins_set_lat_lng_upd before update of location on public.pins
    for each row execute function public.set_pin_lat_lng();
  end if;
end;
$$;

-- Profile bootstrap: ensure `public.users` row exists for each auth user.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'citizen')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_on_auth_user_created') then
    create trigger trg_on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();
  end if;
end;
$$;

commit;


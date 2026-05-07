-- OpenSOS v1 RPC helpers for geo + nested reads
-- Implemented for "API A": frontend uses supabase-js (no Edge Functions).
-- These RPCs map to the read-shapes in specs/05-api-contracts.md.

begin;

-- Match summary for a pin: counts active matches, and "being handled" boolean.
create or replace function public.pin_match_summary(pin_id uuid)
returns table (
  active_match_count integer,
  is_being_handled boolean
)
language sql
stable
as $$
  with active as (
    select 1
    from public.pin_matches m
    where (m.need_pin_id = pin_id or m.offer_pin_id = pin_id)
      and m.status in ('confirmed','in_transit','delivered')
  )
  select
    (select count(*) from active)::integer as active_match_count,
    (select exists(select 1 from active)) as is_being_handled
$$;

-- Parse bbox "minLng,minLat,maxLng,maxLat" and return pins in view.
-- Optional filters: event_id, type, status list.
create or replace function public.pins_in_bbox(
  bbox text,
  event_id uuid default null,
  pin_type text default null,
  pin_status text[] default null
)
returns table (
  id uuid,
  type text,
  status text,
  title text,
  lat double precision,
  lng double precision,
  items jsonb,
  match_summary jsonb
)
language plpgsql
stable
as $$
declare
  parts text[];
  min_lng double precision;
  min_lat double precision;
  max_lng double precision;
  max_lat double precision;
begin
  parts := string_to_array(bbox, ',');
  if array_length(parts, 1) <> 4 then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  min_lng := parts[1]::double precision;
  min_lat := parts[2]::double precision;
  max_lng := parts[3]::double precision;
  max_lat := parts[4]::double precision;

  return query
  select
    p.id,
    p.type,
    p.status,
    p.title,
    p.lat,
    p.lng,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'quantity', i.quantity,
            'unit', i.unit,
            'priority', i.priority
          )
          order by i.id
        ),
        '[]'::jsonb
      )
      from public.pin_items i
      where i.pin_id = p.id
    ) as items,
    (
      select jsonb_build_object(
        'active_match_count', s.active_match_count,
        'is_being_handled', s.is_being_handled
      )
      from public.pin_match_summary(p.id) s
    ) as match_summary
  from public.pins p
  where
    -- Geo filter
    st_intersects(
      p.location::geometry,
      st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    and (pins_in_bbox.event_id is null or p.event_id = pins_in_bbox.event_id)
    and (pins_in_bbox.pin_type is null or p.type = pins_in_bbox.pin_type)
    and (pins_in_bbox.pin_status is null or p.status = any(pins_in_bbox.pin_status));
end;
$$;

-- Pin detail shape (GET /pins/:id)
create or replace function public.pin_detail(pin_id uuid)
returns table (
  id uuid,
  event_id uuid,
  type text,
  status text,
  title text,
  description text,
  lat double precision,
  lng double precision,
  expires_at timestamptz,
  organization_id uuid,
  items jsonb,
  match_summary jsonb
)
language sql
stable
as $$
  select
    p.id,
    p.event_id,
    p.type,
    p.status,
    p.title,
    p.description,
    p.lat,
    p.lng,
    p.expires_at,
    p.organization_id,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'quantity', i.quantity,
            'unit', i.unit,
            'priority', i.priority,
            'notes', i.notes
          )
          order by i.id
        ),
        '[]'::jsonb
      )
      from public.pin_items i
      where i.pin_id = p.id
    ) as items,
    (
      select jsonb_build_object(
        'active_match_count', s.active_match_count,
        'is_being_handled', s.is_being_handled
      )
      from public.pin_match_summary(p.id) s
    ) as match_summary
  from public.pins p
  where p.id = pin_id;
$$;

commit;


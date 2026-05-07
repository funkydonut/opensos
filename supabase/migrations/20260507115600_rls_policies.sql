-- OpenSOS v1 RLS (policies)
-- Source of truth: specs/10-rls-policies.md (human intent)

begin;

-- Helper functions for policies
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select u.role from public.users u where u.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'admin'
$$;

-- Enable RLS
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.emergency_events enable row level security;
alter table public.pins enable row level security;
alter table public.pin_items enable row level security;
alter table public.pin_matches enable row level security;
alter table public.pin_match_items enable row level security;
alter table public.pin_assignments enable row level security;
alter table public.pin_status_events enable row level security;
alter table public.reports enable row level security;

-- USERS
drop policy if exists users_select_own on public.users;
create policy users_select_own
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists users_insert_self on public.users;
create policy users_insert_self
on public.users
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));

-- ORGANIZATIONS
drop policy if exists orgs_select_public on public.organizations;
create policy orgs_select_public
on public.organizations
for select
to anon, authenticated
using (true);

drop policy if exists orgs_write_admin_only on public.organizations;
create policy orgs_write_admin_only
on public.organizations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- EMERGENCY EVENTS
drop policy if exists events_select_public on public.emergency_events;
create policy events_select_public
on public.emergency_events
for select
to anon, authenticated
using (true);

-- v1: keep it simple; only admin creates/updates events
drop policy if exists events_insert_admin on public.emergency_events;
create policy events_insert_admin
on public.emergency_events
for insert
to authenticated
with check (public.is_admin() and created_by_user_id = auth.uid());

drop policy if exists events_update_admin on public.emergency_events;
create policy events_update_admin
on public.emergency_events
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- PINS
drop policy if exists pins_select_public on public.pins;
create policy pins_select_public
on public.pins
for select
to anon, authenticated
using (true);

drop policy if exists pins_insert_authenticated on public.pins;
create policy pins_insert_authenticated
on public.pins
for insert
to authenticated
with check (created_by_user_id = auth.uid());

-- Updates by owner/admin, but moderation status 'flagged' is admin-only.
drop policy if exists pins_update_owner_or_admin on public.pins;
create policy pins_update_owner_or_admin
on public.pins
for update
to authenticated
using (public.is_admin() or created_by_user_id = auth.uid())
with check (
  (public.is_admin() or created_by_user_id = auth.uid())
  and (status <> 'flagged' or public.is_admin())
);

-- PIN ITEMS (tied to parent pin write)
drop policy if exists pin_items_select_public on public.pin_items;
create policy pin_items_select_public
on public.pin_items
for select
to anon, authenticated
using (true);

drop policy if exists pin_items_write_parent on public.pin_items;
create policy pin_items_write_parent
on public.pin_items
for all
to authenticated
using (
  exists (
    select 1 from public.pins p
    where p.id = pin_id
      and (public.is_admin() or p.created_by_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.pins p
    where p.id = pin_id
      and (public.is_admin() or p.created_by_user_id = auth.uid())
      and (p.status <> 'flagged' or public.is_admin())
  )
);

-- PIN MATCHES
drop policy if exists pin_matches_select_public on public.pin_matches;
create policy pin_matches_select_public
on public.pin_matches
for select
to anon, authenticated
using (true);

drop policy if exists pin_matches_insert_authenticated on public.pin_matches;
create policy pin_matches_insert_authenticated
on public.pin_matches
for insert
to authenticated
with check (created_by_user_id = auth.uid());

drop policy if exists pin_matches_update_participants on public.pin_matches;
create policy pin_matches_update_participants
on public.pin_matches
for update
to authenticated
using (
  public.is_admin()
  or created_by_user_id = auth.uid()
  or exists (select 1 from public.pins p where p.id = need_pin_id and p.created_by_user_id = auth.uid())
  or exists (select 1 from public.pins p where p.id = offer_pin_id and p.created_by_user_id = auth.uid())
)
with check (
  public.is_admin()
  or created_by_user_id = auth.uid()
  or exists (select 1 from public.pins p where p.id = need_pin_id and p.created_by_user_id = auth.uid())
  or exists (select 1 from public.pins p where p.id = offer_pin_id and p.created_by_user_id = auth.uid())
);

-- PIN MATCH ITEMS (tied to parent match write)
drop policy if exists pin_match_items_select_public on public.pin_match_items;
create policy pin_match_items_select_public
on public.pin_match_items
for select
to anon, authenticated
using (true);

drop policy if exists pin_match_items_write_parent on public.pin_match_items;
create policy pin_match_items_write_parent
on public.pin_match_items
for all
to authenticated
using (
  exists (
    select 1 from public.pin_matches m
    where m.id = pin_match_id
      and (
        public.is_admin()
        or m.created_by_user_id = auth.uid()
        or exists (select 1 from public.pins p where p.id = m.need_pin_id and p.created_by_user_id = auth.uid())
        or exists (select 1 from public.pins p where p.id = m.offer_pin_id and p.created_by_user_id = auth.uid())
      )
  )
)
with check (
  exists (
    select 1 from public.pin_matches m
    where m.id = pin_match_id
      and (
        public.is_admin()
        or m.created_by_user_id = auth.uid()
        or exists (select 1 from public.pins p where p.id = m.need_pin_id and p.created_by_user_id = auth.uid())
        or exists (select 1 from public.pins p where p.id = m.offer_pin_id and p.created_by_user_id = auth.uid())
      )
  )
);

-- PIN ASSIGNMENTS
drop policy if exists pin_assignments_select_authenticated on public.pin_assignments;
create policy pin_assignments_select_authenticated
on public.pin_assignments
for select
to authenticated
using (true);

drop policy if exists pin_assignments_insert_authenticated on public.pin_assignments;
create policy pin_assignments_insert_authenticated
on public.pin_assignments
for insert
to authenticated
with check (assigned_by_user_id = auth.uid());

drop policy if exists pin_assignments_update_admin_only on public.pin_assignments;
create policy pin_assignments_update_admin_only
on public.pin_assignments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists pin_assignments_delete_admin_only on public.pin_assignments;
create policy pin_assignments_delete_admin_only
on public.pin_assignments
for delete
to authenticated
using (public.is_admin());

-- PIN STATUS EVENTS
drop policy if exists pin_status_events_select_public on public.pin_status_events;
create policy pin_status_events_select_public
on public.pin_status_events
for select
to anon, authenticated
using (true);

drop policy if exists pin_status_events_insert_owner_or_admin on public.pin_status_events;
create policy pin_status_events_insert_owner_or_admin
on public.pin_status_events
for insert
to authenticated
with check (
  public.is_admin()
  or exists (select 1 from public.pins p where p.id = pin_id and p.created_by_user_id = auth.uid())
);

-- REPORTS
drop policy if exists reports_select_admin_only on public.reports;
create policy reports_select_admin_only
on public.reports
for select
to authenticated
using (public.is_admin());

drop policy if exists reports_insert_authenticated on public.reports;
create policy reports_insert_authenticated
on public.reports
for insert
to authenticated
with check (created_by_user_id = auth.uid());

drop policy if exists reports_update_admin_only on public.reports;
create policy reports_update_admin_only
on public.reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;


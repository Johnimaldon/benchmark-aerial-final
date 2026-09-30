-- Benchmark Aerial / Wisconsin Aerial — foundation schema
--
-- Run this once in your Supabase project's SQL editor (Dashboard → SQL Editor → New query,
-- paste, Run). It creates the tables the app needs, locks them down with Row Level
-- Security, and adds the one function that lets a client (no login, no Supabase account)
-- safely read a single project by its access code — everything else requires the
-- operator to be signed in.
--
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

create table if not exists public.sites (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  client text,
  type text,
  mode text not null default 'construction',           -- 'construction' | 'realEstate'
  icon_key text,
  lat double precision,
  lon double precision,
  geofence_radius_m double precision default 250,
  access_code text not null,
  client_access_enabled boolean not null default true,
  listing jsonb,                                        -- real-estate listing data (photos, description)
  created_at timestamptz not null default now()
);

create index if not exists sites_owner_id_idx on public.sites(owner_id);
create unique index if not exists sites_access_code_idx on public.sites(access_code);

create table if not exists public.flights (
  id text primary key,
  site_id text not null references public.sites(id) on delete cascade,
  n integer not null,
  date text,
  captured_at timestamptz,
  status text not null default 'ready',                 -- pipeline status, see app copy
  status_reason text,
  source_count integer,
  hero_data_url text,
  photos jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb,
  trades jsonb not null default '[]'::jsonb,
  note text,
  note_mode text,                                        -- 'ai' | 'manual'
  created_at timestamptz not null default now()
);

create index if not exists flights_site_id_idx on public.flights(site_id);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade,
  token text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists share_links_token_idx on public.share_links(token);
create index if not exists share_links_site_id_idx on public.share_links(site_id);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
-- Nobody but the owning operator can read or write these tables directly.
-- The only way an anonymous client ever sees project data is through the
-- SECURITY DEFINER functions below, which check an access code or share
-- token themselves before returning anything.

alter table public.sites enable row level security;
alter table public.flights enable row level security;
alter table public.share_links enable row level security;

drop policy if exists "sites_owner_all" on public.sites;
create policy "sites_owner_all" on public.sites
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "flights_owner_all" on public.flights;
create policy "flights_owner_all" on public.flights
  for all
  using (site_id in (select id from public.sites where owner_id = auth.uid()))
  with check (site_id in (select id from public.sites where owner_id = auth.uid()));

drop policy if exists "share_links_owner_all" on public.share_links;
create policy "share_links_owner_all" on public.share_links
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- No grants to anon/authenticated beyond what the policies above allow, and no
-- policy exists for the anon role, so anon has zero direct table access.
revoke all on public.sites from anon;
revoke all on public.flights from anon;
revoke all on public.share_links from anon;

-- ------------------------------------------------------------------
-- Anonymous read paths — SECURITY DEFINER functions, scoped to one project
-- ------------------------------------------------------------------

-- Used by the client-portal "enter your project access code" flow.
create or replace function public.get_site_by_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.sites%rowtype;
  v_flights jsonb;
begin
  select * into v_site from public.sites
    where lower(access_code) = lower(p_code) and client_access_enabled = true
    limit 1;

  if v_site.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(f order by f.n), '[]'::jsonb) into v_flights
    from public.flights f where f.site_id = v_site.id;

  return jsonb_build_object('site', to_jsonb(v_site), 'flights', v_flights);
end;
$$;

-- Used by unguessable share-link tokens (Section 4: optional expiry + revoke).
create or replace function public.get_shared_project(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
  v_site public.sites%rowtype;
  v_flights jsonb;
begin
  select * into v_link from public.share_links where token = p_token limit 1;

  if v_link.id is null or v_link.revoked_at is not null
     or (v_link.expires_at is not null and v_link.expires_at < now()) then
    return null;
  end if;

  select * into v_site from public.sites where id = v_link.site_id;
  if v_site.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(f order by f.n), '[]'::jsonb) into v_flights
    from public.flights f where f.site_id = v_site.id;

  return jsonb_build_object('site', to_jsonb(v_site), 'flights', v_flights);
end;
$$;

grant execute on function public.get_site_by_access_code(text) to anon, authenticated;
grant execute on function public.get_shared_project(text) to anon, authenticated;

-- ------------------------------------------------------------------
-- Storage bucket for flight media (photos/panoramas/video/ortho)
-- ------------------------------------------------------------------
-- Created here so the Receiving-engine rebuild (direct-to-storage TUS uploads)
-- has a bucket to target. Kept private; the app signs URLs as needed once that
-- section lands.

insert into storage.buckets (id, name, public)
  values ('site-media', 'site-media', false)
  on conflict (id) do nothing;

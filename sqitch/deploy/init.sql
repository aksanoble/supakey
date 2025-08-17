-- Deploy supakey:init to pg

BEGIN;

-- Initial schema for Supakey application
-- Create custom schema and deploy all objects within it
-- Tables:
-- - user_connections: user-level settings (postgres url, supabase details)
-- - applications: apps per user with app-level email/password
-- - application_migrations: migration entries per application

-- Create the supakey schema
CREATE SCHEMA IF NOT EXISTS supakey;

-- Set search path to use supakey schema
SET search_path TO supakey, public;

create table if not exists supakey.user_connections (
	user_id uuid primary key references auth.users(id) on delete cascade,
	postgres_url text,
	supabase_url text,
	supabase_service_role text,
	created_at timestamptz default now(),
	updated_at timestamptz default now()
);

create table if not exists supakey.applications (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	name text not null,
	app_schema text,
	email text,
	password text,
	created_at timestamptz default now(),
	updated_at timestamptz default now()
);

create table if not exists supakey.application_migrations (
	id uuid primary key default gen_random_uuid(),
	application_id uuid not null references supakey.applications(id) on delete cascade,
	name text not null,
	created_at timestamptz default now()
);

-- For RLS, enable and add simple policies allowing users to access their rows
alter table supakey.user_connections enable row level security;
alter table supakey.applications enable row level security;
alter table supakey.application_migrations enable row level security;

-- Policies
create policy "user can manage own connection" on supakey.user_connections
	for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own apps" on supakey.applications
	for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage app migrations" on supakey.application_migrations
	for all using (
		exists (
			select 1 from supakey.applications a
			where a.id = application_id and a.user_id = auth.uid()
		)
	) with check (
		exists (
			select 1 from supakey.applications a
			where a.id = application_id and a.user_id = auth.uid()
		)
	);

-- Helpful view: last migration per app
create or replace view supakey.application_last_migration as
select application_id, max(created_at) as last_run_at
from supakey.application_migrations
group by application_id;

grant usage on schema supakey to authenticated, service_role;

grant select, insert, update, delete on all tables in schema supakey to authenticated;

alter default privileges in schema supakey grant select, insert, update, delete on tables to authenticated;

-- Reset search path
SET search_path TO public;

COMMIT;

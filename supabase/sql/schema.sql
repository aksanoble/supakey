-- Supabase SQL schema for Supakey (supakey)
-- Tables:
-- - user_connections: user-level settings (postgres url, supabase details)
-- - applications: apps per user with app-level email/password
-- - application_migrations: migration entries per application

create table if not exists public.user_connections (
	user_id uuid primary key references auth.users(id) on delete cascade,
	postgres_url text,
	supabase_url text,
	supabase_service_role text,
	created_at timestamptz default now(),
	updated_at timestamptz default now()
);

create table if not exists public.applications (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	name text not null,
	app_schema text,
	email text,
	password text,
	created_at timestamptz default now(),
	updated_at timestamptz default now()
);

create table if not exists public.application_migrations (
	id uuid primary key default gen_random_uuid(),
	application_id uuid not null references public.applications(id) on delete cascade,
	name text not null,
	created_at timestamptz default now()
);

-- For RLS, enable and add simple policies allowing users to access their rows
alter table public.user_connections enable row level security;
alter table public.applications enable row level security;
alter table public.application_migrations enable row level security;

-- Policies
create policy if not exists "user can manage own connection" on public.user_connections
	for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "user can manage own apps" on public.applications
	for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "user can manage app migrations" on public.application_migrations
	for all using (
		exists (
			select 1 from public.applications a
			where a.id = application_id and a.user_id = auth.uid()
		)
	) with check (
		exists (
			select 1 from public.applications a
			where a.id = application_id and a.user_id = auth.uid()
		)
	);

-- Helpful view: last migration per app
create or replace view public.application_last_migration as
select application_id, max(created_at) as last_run_at
from public.application_migrations
group by application_id;

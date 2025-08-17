-- Revert initial schema for Supakey application

-- Drop view
drop view if exists supakey.application_last_migration;

-- Drop policies
drop policy if exists "user can manage app migrations" on supakey.application_migrations;
drop policy if exists "user can manage own apps" on supakey.applications;
drop policy if exists "user can manage own connection" on supakey.user_connections;

-- Drop tables (in reverse order due to foreign key constraints)
drop table if exists supakey.application_migrations;
drop table if exists supakey.applications;
drop table if exists supakey.user_connections;

-- Drop the schema
drop schema if exists supakey cascade;

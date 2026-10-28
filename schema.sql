-- !! WARNING (added 28 Oct 2026, see docs/03-security-review.md) !!
-- Once the migrations in supabase/migrations/ have been applied, do NOT re-run this file on that database:
-- it re-creates the older, wider access policies (Postgres combines policies with OR), silently undoing them.
-- For a brand-new project: run this file once, then every migration in supabase/migrations/ in order.

-- Dara in Tech Talent Hub: Supabase schema
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Admins (community team). Add yourself with the INSERT at the bottom.
-- ---------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------
-- Members: one row per person who signed in and filled in a profile
-- ---------------------------------------------------------------
create table if not exists public.members (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  email       text not null,
  city        text,
  status      text check (status in ('student','fresh_grad','career_switcher','professional')),
  headline    text,
  institution text,
  level       text check (level in ('intern','entry','junior','mid','senior')),
  skills      text[] not null default '{}',
  interests   text[] not null default '{}',
  job_types   text[] not null default '{}',
  work_modes  text[] not null default '{}',
  linkedin    text,
  bio         text check (bio is null or char_length(bio) <= 280),
  in_pool     boolean not null default true,
  cv_path     text,
  cv_name     text,
  cv_size     integer,
  cv_shared   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- If you ran an earlier version of this file, these add the CV columns.
alter table public.members add column if not exists cv_path   text;
alter table public.members add column if not exists cv_name   text;
alter table public.members add column if not exists cv_size   integer;
alter table public.members add column if not exists cv_shared boolean not null default false;

-- ---------------------------------------------------------------
-- Jobs: roles that members post to the talent pool
-- ---------------------------------------------------------------
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  posted_by     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 140),
  company       text not null check (char_length(company) between 1 and 140),
  category      text not null,
  level         text not null check (level in ('intern','entry','junior','mid','senior')),
  job_type      text not null check (job_type in ('internship','full_time','part_time','contract','freelance')),
  work_mode     text not null check (work_mode in ('remote','hybrid','onsite')),
  location      text,
  req_skills    text[] not null default '{}',
  nice_skills   text[] not null default '{}',
  description   text check (description is null or char_length(description) <= 4000),
  apply_link    text,
  contact_email text,
  deadline      date,
  is_open       boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Posts: the Mading (community board). Jobs with match scores live in
-- the jobs table; everything else (events, certifications, programs,
-- tips) lives here.
-- ---------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  posted_by   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('event','cert','program','tip')),
  title       text not null check (char_length(title) between 1 and 140),
  organizer   text,
  description text not null check (char_length(description) between 1 and 2000),
  link        text,
  event_date  date,
  location    text,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);

create index if not exists jobs_created_idx on public.jobs (created_at desc);
create index if not exists members_pool_idx on public.members (in_pool);

-- ---------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------
alter table public.admins  enable row level security;
alter table public.members enable row level security;
alter table public.jobs    enable row level security;
alter table public.posts   enable row level security;

drop policy if exists "admins: read own row" on public.admins;
create policy "admins: read own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- A member sees their own row, everyone who opted into the pool, and admins see all.
drop policy if exists "members: read" on public.members;
create policy "members: read" on public.members
  for select to authenticated
  using (id = auth.uid() or in_pool = true or public.is_admin());

drop policy if exists "members: insert own" on public.members;
create policy "members: insert own" on public.members
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "members: update own" on public.members;
create policy "members: update own" on public.members
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members: delete own or admin" on public.members;
create policy "members: delete own or admin" on public.members
  for delete to authenticated using (id = auth.uid() or public.is_admin());

-- Any signed-in member can read roles. Only the poster (or an admin) changes them.
drop policy if exists "jobs: read" on public.jobs;
create policy "jobs: read" on public.jobs
  for select to authenticated using (true);

drop policy if exists "jobs: insert own" on public.jobs;
create policy "jobs: insert own" on public.jobs
  for insert to authenticated with check (posted_by = auth.uid());

drop policy if exists "jobs: update own or admin" on public.jobs;
create policy "jobs: update own or admin" on public.jobs
  for update to authenticated
  using (posted_by = auth.uid() or public.is_admin())
  with check (posted_by = auth.uid() or public.is_admin());

drop policy if exists "jobs: delete own or admin" on public.jobs;
create policy "jobs: delete own or admin" on public.jobs
  for delete to authenticated using (posted_by = auth.uid() or public.is_admin());

-- Mading posts: any signed-in member reads and posts. Only the author
-- (or an admin) edits or deletes. Only admins can pin (enforced by trigger).
drop policy if exists "posts: read" on public.posts;
create policy "posts: read" on public.posts
  for select to authenticated using (true);

drop policy if exists "posts: insert own" on public.posts;
create policy "posts: insert own" on public.posts
  for insert to authenticated with check (posted_by = auth.uid());

drop policy if exists "posts: update own or admin" on public.posts;
create policy "posts: update own or admin" on public.posts
  for update to authenticated
  using (posted_by = auth.uid() or public.is_admin())
  with check (posted_by = auth.uid() or public.is_admin());

drop policy if exists "posts: delete own or admin" on public.posts;
create policy "posts: delete own or admin" on public.posts
  for delete to authenticated using (posted_by = auth.uid() or public.is_admin());

create or replace function public.posts_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then new.pinned := false; end if;
  else
    if not public.is_admin() then new.pinned := old.pinned; end if;
    new.posted_by := old.posted_by;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_guard on public.posts;
create trigger posts_guard before insert or update on public.posts
  for each row execute function public.posts_guard();

-- ---------------------------------------------------------------
-- CV storage: a private bucket. Each member writes only inside their own
-- folder (named by their user id). A CV can be downloaded by its owner,
-- by admins, and by other members ONLY if the owner turned on
-- "share my CV" and is in the Talent Pool.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs', 'cvs', false, 2097152,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

drop policy if exists "cvs: upload own folder" on storage.objects;
create policy "cvs: upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cvs: delete own or admin" on storage.objects;
create policy "cvs: delete own or admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "cvs: read own, shared or admin" on storage.objects;
create policy "cvs: read own, shared or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.members m
        where m.id::text = (storage.foldername(name))[1]
          and m.cv_shared and m.in_pool
      )
    )
  );

-- ---------------------------------------------------------------
-- Make yourself admin AFTER you have signed in once on the site.
-- Replace the email, then run just this statement.
-- ---------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'YOUR_EMAIL@example.com'
-- on conflict do nothing;

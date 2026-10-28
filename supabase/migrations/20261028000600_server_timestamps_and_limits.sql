-- =====================================================================
-- Migration 0600: timestamps set by the server; daily posting limit
-- Status: PROPOSED. Not applied anywhere. Review before running.
-- Requires: 0500 (jobs_guard already fixes jobs.created_at).
-- =====================================================================
-- WHY     Clients can send created_at, so a post dated 2999-01-01 stays at the top of Mading for ever
--         (a way around admin-only pinning), and members.updated_at is whatever the client says.
--         Nothing limits how much one account can post.
-- CHANGES * posts_guard (from schema.sql) now also fixes created_at; pinning rules unchanged.
--         * members_guard: created_at / updated_at set by the server.
--         * posting_limit: at most 10 new Mading posts and 10 new roles per member per 24 hours
--           (admins and server sessions are not limited).
-- IMPACT  No existing rows change. Posting over the limit returns an error the Hub shows as a message.
-- VERIFY  As a member: insert a post with created_at '2999-01-01' -> stored with now().
--         Insert 11 posts within a day -> the 11th fails. As admin -> not limited.
-- =====================================================================

begin;

create or replace function public.posts_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then new.pinned := false; end if;
    if auth.uid() is not null then new.created_at := now(); end if;
  else
    if not public.is_admin() then new.pinned := old.pinned; end if;
    new.posted_by := old.posted_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create or replace function public.members_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists members_guard on public.members;
create trigger members_guard before insert or update on public.members
  for each row execute function public.members_guard();

create or replace function public.posting_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent integer;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  execute format('select count(*) from public.%I where posted_by = $1 and created_at > now() - interval ''1 day''', tg_table_name)
    into recent using auth.uid();
  if recent >= 10 then
    raise exception 'Posting limit reached (10 per day). Try again tomorrow.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_posting_limit on public.posts;
create trigger posts_posting_limit before insert on public.posts
  for each row execute function public.posting_limit();
drop trigger if exists jobs_posting_limit on public.jobs;
create trigger jobs_posting_limit before insert on public.jobs
  for each row execute function public.posting_limit();

commit;

-- ROLLBACK
-- begin;
-- drop trigger if exists posts_posting_limit on public.posts;
-- drop trigger if exists jobs_posting_limit on public.jobs;
-- drop function if exists public.posting_limit();
-- drop trigger if exists members_guard on public.members;
-- drop function if exists public.members_guard();
-- -- restore posts_guard from schema.sql (lines 172-187)
-- commit;

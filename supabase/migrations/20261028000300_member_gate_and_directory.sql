-- =====================================================================
-- Migration 0300: only real members read community data; others see consented columns only
-- Status: PROPOSED. Not applied anywhere. Review before running.
-- =====================================================================
-- WHY
--   1. Sign-in is open to any email address, and today every signed-in account (even one that never
--      created a profile or gave consent) can read pool members, roles and Mading posts via the API.
--   2. Other members can read every column of a pool member's row (institution, cv_path, cv_name,
--      cv_size, timestamps, ...), more than the consent text lists.
--   3. A member can point cv_path at another member's file (e.g. to trick an admin into deleting it).
--
-- CHANGES
--   * public.is_member(): true when the caller has a members row.
--   * members: base table readable only for your own row and for admins.
--   * public.pool_members view: what other members may see (exactly the columns in the consent text,
--     plus id for matching, and cv_path only when the owner shares the CV). Only pool members, and only
--     for callers who have a profile.
--   * jobs / posts: read and create only for members (or admins).
--   * members insert/update: cv_path must be inside your own folder (<your id>/cv-<n>.pdf|docx).
--
-- IMPACT ON EXISTING DATA
--   No rows change. Accounts without a profile lose read access to community data (the Hub already
--   requires onboarding first, so real members notice nothing). The Hub reads the directory from
--   pool_members automatically once this view exists (src/hub/hub.js listMembers).
--
-- VERIFY (staging): as a fresh account with no profile, select from members / pool_members / jobs /
--   posts -> 0 rows. As member A (not admin): select * from members -> only A's own row;
--   select * from pool_members -> pool members, without cv_name / cv_size / updated_at; cv_path only
--   where cv_shared. Update A's cv_path to '<B uid>/cv-1.pdf' -> rejected.
-- =====================================================================

begin;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where id = auth.uid());
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to authenticated;

-- members: own row or admin only (others go through pool_members)
drop policy if exists "members: read" on public.members;
drop policy if exists "members: read own or admin" on public.members;
create policy "members: read own or admin" on public.members
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "members: insert own" on public.members;
create policy "members: insert own" on public.members
  for insert to authenticated
  with check (
    id = auth.uid()
    and (cv_path is null or cv_path ~ ('^' || auth.uid()::text || '/cv-[0-9]+\.(pdf|docx)$'))
  );

drop policy if exists "members: update own" on public.members;
create policy "members: update own" on public.members
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (cv_path is null or cv_path ~ ('^' || auth.uid()::text || '/cv-[0-9]+\.(pdf|docx)$'))
  );

-- Directory of pool members: consented columns only. The view runs with its owner's rights (it reads
-- the base table past the own-row policy above), so it filters rows itself.
create or replace view public.pool_members
with (security_barrier = true) as
  select
    id, full_name, email, city, status, headline, institution, level,
    skills, interests, job_types, work_modes, linkedin, bio,
    in_pool, cv_shared,
    case when cv_shared then cv_path end as cv_path,
    created_at
  from public.members
  where in_pool and public.is_member();

revoke all on public.pool_members from public, anon;
grant select on public.pool_members to authenticated;

-- jobs and posts: members (or admins) only
drop policy if exists "jobs: read" on public.jobs;
create policy "jobs: read" on public.jobs
  for select to authenticated using (public.is_member() or public.is_admin());

drop policy if exists "jobs: insert own" on public.jobs;
create policy "jobs: insert own" on public.jobs
  for insert to authenticated
  with check (posted_by = auth.uid() and (public.is_member() or public.is_admin()));

drop policy if exists "posts: read" on public.posts;
create policy "posts: read" on public.posts
  for select to authenticated using (public.is_member() or public.is_admin());

drop policy if exists "posts: insert own" on public.posts;
create policy "posts: insert own" on public.posts
  for insert to authenticated
  with check (posted_by = auth.uid() and (public.is_member() or public.is_admin()));

commit;

-- ROLLBACK (restores schema.sql behaviour)
-- begin;
-- drop view if exists public.pool_members;
-- drop policy if exists "members: read own or admin" on public.members;
-- create policy "members: read" on public.members for select to authenticated
--   using (id = auth.uid() or in_pool = true or public.is_admin());
-- drop policy if exists "members: insert own" on public.members;
-- create policy "members: insert own" on public.members for insert to authenticated with check (id = auth.uid());
-- drop policy if exists "members: update own" on public.members;
-- create policy "members: update own" on public.members for update to authenticated
--   using (id = auth.uid()) with check (id = auth.uid());
-- drop policy if exists "jobs: read" on public.jobs;
-- create policy "jobs: read" on public.jobs for select to authenticated using (true);
-- drop policy if exists "jobs: insert own" on public.jobs;
-- create policy "jobs: insert own" on public.jobs for insert to authenticated with check (posted_by = auth.uid());
-- drop policy if exists "posts: read" on public.posts;
-- create policy "posts: read" on public.posts for select to authenticated using (true);
-- drop policy if exists "posts: insert own" on public.posts;
-- create policy "posts: insert own" on public.posts for insert to authenticated with check (posted_by = auth.uid());
-- drop function if exists public.is_member();
-- commit;

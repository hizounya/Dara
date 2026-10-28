-- =====================================================================
-- Migration 0500 (migration B): admin-approved roles; CV access exactly as the consent text says
-- Status: PROPOSED. Not applied anywhere. Review before running.
-- Requires: 0100 (cv lockdown), 0300 (is_member). See docs/02-architecture-plan.md §11 and docs/03-security-review.md.
-- =====================================================================
-- RULE (team decision, option b): a CV can be read by
--   * its owner, * admins, and
--   * a member who has an admin-approved, open, not-expired role of their own, but only the owner's
--     CURRENT file (members.cv_path, exact match), and only while the owner shares it and is in the pool.
--
-- CHANGES
--   * jobs.approved_at / approved_by. Roles posted by admins are approved on posting; others wait.
--   * jobs_guard trigger: posted_by and created_at cannot be changed by clients; only admins can set or
--     clear approval. (SQL editor / service role sessions, where auth.uid() is null, are not restricted.)
--   * public.can_read_cv(name): the rule above, used by the Storage read policy.
--   * Storage: read via can_read_cv; uploads only as <your id>/cv-<n>.pdf|docx, at most 3 files per folder.
--
-- IMPACT ON EXISTING DATA
--   * Existing roles stay UNAPPROVED (approved_at null) until an admin approves them in the Hub
--     (Admin > Roles awaiting approval). Until then their posters cannot read shared CVs. This keeps
--     access no wider than migration 0100. To approve all existing roles at once instead, see OPTIONAL.
--   * No member's sharing or pool choice changes. Old CV files that are no longer a member's cv_path
--     become unreadable to anyone but the owner and admins.
--
-- VERIFY (staging; A shares a CV and is in the pool; B is a member; C has no profile; D is admin):
--   1. B with no role, or with an unapproved role: download/list/createSignedUrl of A's CV -> denied.
--   2. D approves B's role in the Hub -> B can download A's current CV; NOT an older file in A's folder.
--   3. B closes the role, or its deadline passes -> denied again.  4. C -> always denied.
--   5. As B: update jobs set approved_at = now() where id = <B's role> -> approved_at unchanged.
--   6. As B: upload '<B uid>/notes.html' -> denied; a 4th file in B's folder -> denied.
-- =====================================================================

begin;

alter table public.jobs add column if not exists approved_at timestamptz;
alter table public.jobs add column if not exists approved_by uuid references auth.users(id) on delete set null;

create or replace function public.jobs_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- trusted server context (SQL editor, service role)
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    if public.is_admin() then
      new.approved_at := now(); new.approved_by := auth.uid();
    else
      new.approved_at := null;  new.approved_by := null;
    end if;
  else
    new.posted_by  := old.posted_by;
    new.created_at := old.created_at;
    if not public.is_admin() then
      new.approved_at := old.approved_at; new.approved_by := old.approved_by;
    elsif new.approved_at is distinct from old.approved_at then
      new.approved_by := case when new.approved_at is null then null else auth.uid() end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_guard on public.jobs;
create trigger jobs_guard before insert or update on public.jobs
  for each row execute function public.jobs_guard();

create or replace function public.can_read_cv(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (storage.foldername(object_name))[1] = auth.uid()::text
    or public.is_admin()
    or (
      public.is_member()
      and exists (
        select 1 from public.members m
        where m.cv_path = object_name and m.cv_shared and m.in_pool
      )
      and exists (
        select 1 from public.jobs j
        where j.posted_by = auth.uid()
          and j.approved_at is not null
          and j.is_open
          and (j.deadline is null or j.deadline >= current_date)
      )
    );
$$;
revoke all on function public.can_read_cv(text) from public;
grant execute on function public.can_read_cv(text) to authenticated;

drop policy if exists "cvs: read own, shared or admin" on storage.objects;
drop policy if exists "cvs: read own or admin" on storage.objects;
drop policy if exists "cvs: read own, admin or approved posters" on storage.objects;
create policy "cvs: read own, admin or approved posters" on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs' and public.can_read_cv(name));

drop policy if exists "cvs: upload own folder" on storage.objects;
create policy "cvs: upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cvs'
    and name ~ ('^' || auth.uid()::text || '/cv-[0-9]+\.(pdf|docx)$')
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'cvs' and (storage.foldername(o.name))[1] = auth.uid()::text
    ) < 3
  );

commit;

-- OPTIONAL: approve all roles that exist today (widens access back to "everyone who has posted a role")
-- update public.jobs set approved_at = now() where approved_at is null;

-- ROLLBACK (returns to migration 0100: owner and admin only)
-- begin;
-- drop policy if exists "cvs: read own, admin or approved posters" on storage.objects;
-- create policy "cvs: read own or admin" on storage.objects for select to authenticated
--   using (bucket_id = 'cvs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- drop policy if exists "cvs: upload own folder" on storage.objects;
-- create policy "cvs: upload own folder" on storage.objects for insert to authenticated
--   with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
-- drop trigger if exists jobs_guard on public.jobs;
-- drop function if exists public.jobs_guard();
-- drop function if exists public.can_read_cv(text);
-- alter table public.jobs drop column if exists approved_by, drop column if exists approved_at;
-- commit;

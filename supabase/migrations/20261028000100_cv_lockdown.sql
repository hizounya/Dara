-- =====================================================================
-- Migration A: CV lockdown (owner and admins only)
-- Status: PROPOSED. Not applied anywhere. Review before running.
-- See docs/02-architecture-plan.md §11.
-- =====================================================================
--
-- WHY
--   The current storage policy "cvs: read own, shared or admin" (schema.sql)
--   lets ANY authenticated account download a CV when its owner has
--   cv_shared = true and in_pool = true. Anyone can create an account with
--   just an email address, so a CV can be downloaded by someone who never
--   joined the community. That is broader than the consent wording
--   ("Let members who post roles download my CV").
--
-- WHAT THIS CHANGES
--   Replaces that policy with one that allows reading a CV only by:
--     - its owner (files live in a folder named after the owner's user id)
--     - admins (public.is_admin())
--   Member-to-member downloads are switched off until migration B
--   (admin-approved role posters) is reviewed and applied.
--
-- IMPACT ON EXISTING DATA
--   - No rows or files are changed, moved, or deleted.
--   - No member's in_pool or cv_shared preference is changed.
--   - Access only gets narrower, so no renewed consent is needed.
--   - Upload and delete policies are untouched.
--   - Visible effect in the current Hub: the "Download CV" button still shows
--     on shared CVs for other members, but the download fails with a
--     not-found error. Owners and admins are unaffected. The Hub UI is
--     aligned in Phase 5.
--
-- IMPORTANT: schema.sql
--   schema.sql recreates the old permissive policy every time it is re-run.
--   Because Postgres combines permissive policies with OR, re-running
--   schema.sql after this migration would silently undo it.
--   Do not re-run schema.sql after applying this; update schema.sql in the
--   same change that applies this migration.
--
-- BEFORE APPLYING: check for other read policies on the bucket.
--   Any other SELECT policy on storage.objects that matches bucket 'cvs'
--   would still grant access. List them with:
--
--     select policyname, roles, cmd, qual
--     from pg_policies
--     where schemaname = 'storage' and tablename = 'objects' and cmd in ('SELECT', 'ALL');
--
--   Expected after this migration: "cvs: read own or admin" is the only
--   policy mentioning bucket_id = 'cvs' for SELECT/ALL.
--
-- VERIFY (staging project, two non-admin test accounts A and B):
--   1. A uploads a CV, ticks "share", stays in the pool.
--   2. As B (Hub, or supabase-js: storage.from('cvs').download(path)): fails.
--   3. As A: succeeds.   4. As an admin: succeeds.
-- =====================================================================

begin;

drop policy if exists "cvs: read own, shared or admin" on storage.objects;
drop policy if exists "cvs: read own or admin" on storage.objects;

create policy "cvs: read own or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

commit;

-- ---------------------------------------------------------------------
-- ROLLBACK (restores the previous, permissive behaviour; not recommended)
-- ---------------------------------------------------------------------
-- begin;
-- drop policy if exists "cvs: read own or admin" on storage.objects;
-- create policy "cvs: read own, shared or admin" on storage.objects
--   for select to authenticated
--   using (
--     bucket_id = 'cvs' and (
--       (storage.foldername(name))[1] = auth.uid()::text
--       or public.is_admin()
--       or exists (
--         select 1 from public.members m
--         where m.id::text = (storage.foldername(name))[1]
--           and m.cv_shared and m.in_pool
--       )
--     )
--   );
-- commit;

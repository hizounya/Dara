-- =====================================================================
-- Migration 0400: database checks that mirror the Hub's validation
-- Status: PROPOSED. Not applied anywhere. Review before running.
-- =====================================================================
-- WHY     The Hub validates input, but the API can be called directly. Without checks in the database,
--         anyone signed in can store huge arrays, non-http(s) links, a "LinkedIn" link to any site,
--         unknown categories, or a cv_path outside their own folder.
-- CHANGES CHECK constraints, all added NOT VALID: they apply to every new insert and update, but do not
--         re-check existing rows, so applying this cannot fail or change data.
-- IMPACT  No existing row changes. Run the queries in STEP 1 first; fix or accept what they list; then
--         run STEP 3 to validate (optional, makes the constraints cover old rows as well).
-- =====================================================================

-- STEP 1 (read-only): rows that would not pass
-- select id, full_name from public.members where cardinality(skills) > 25 or cardinality(interests) > 10
--   or cardinality(job_types) > 5 or cardinality(work_modes) > 3
--   or (linkedin is not null and linkedin <> '' and linkedin !~* '^https?://([a-z0-9-]+\.)*linkedin\.com(/|$)')
--   or (cv_path is not null and cv_path !~ ('^' || id::text || '/cv-[0-9]+\.(pdf|docx)$'))
--   or email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$';
-- select id, title from public.jobs where category not in ('Data & Analytics','Software Engineering',
--   'Product & Project','UI/UX Design','Marketing & Community','Operations & Business','QA & Security')
--   or (apply_link is not null and apply_link <> '' and apply_link !~* '^https?://');
-- select id, title from public.posts where link is not null and link <> '' and link !~* '^https?://';

-- STEP 2: add the checks
begin;

alter table public.members
  add constraint members_lengths check (
    char_length(coalesce(city, '')) <= 80 and char_length(coalesce(headline, '')) <= 120
    and char_length(coalesce(institution, '')) <= 120 and char_length(coalesce(linkedin, '')) <= 200
    and char_length(email) <= 160 and char_length(coalesce(cv_name, '')) <= 200
  ) not valid,
  add constraint members_arrays check (
    cardinality(skills) <= 25 and cardinality(interests) <= 10
    and cardinality(job_types) <= 5 and cardinality(work_modes) <= 3
  ) not valid,
  add constraint members_email_format check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') not valid,
  add constraint members_linkedin check (
    linkedin is null or linkedin = '' or linkedin ~* '^https?://([a-z0-9-]+\.)*linkedin\.com(/|$)'
  ) not valid,
  add constraint members_cv_path check (
    cv_path is null or cv_path ~ ('^' || id::text || '/cv-[0-9]+\.(pdf|docx)$')
  ) not valid,
  add constraint members_cv_name check (cv_name is null or cv_name ~* '\.(pdf|docx)$') not valid;

alter table public.jobs
  add constraint jobs_category check (category in (
    'Data & Analytics', 'Software Engineering', 'Product & Project', 'UI/UX Design',
    'Marketing & Community', 'Operations & Business', 'QA & Security'
  )) not valid,
  add constraint jobs_lengths check (
    char_length(coalesce(location, '')) <= 100 and char_length(coalesce(apply_link, '')) <= 300
    and char_length(coalesce(contact_email, '')) <= 160
  ) not valid,
  add constraint jobs_arrays check (cardinality(req_skills) <= 25 and cardinality(nice_skills) <= 25) not valid,
  add constraint jobs_apply_link check (apply_link is null or apply_link = '' or apply_link ~* '^https?://') not valid,
  add constraint jobs_contact_email check (
    contact_email is null or contact_email = '' or contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ) not valid;

alter table public.posts
  add constraint posts_lengths check (
    char_length(coalesce(organizer, '')) <= 140 and char_length(coalesce(location, '')) <= 120
    and char_length(coalesce(link, '')) <= 300
  ) not valid,
  add constraint posts_link check (link is null or link = '' or link ~* '^https?://') not valid;

commit;

-- STEP 3 (optional, after STEP 1 shows nothing): validate against existing rows
-- alter table public.members validate constraint members_lengths;   -- …repeat for each constraint above

-- ROLLBACK
-- alter table public.members drop constraint if exists members_lengths, drop constraint if exists members_arrays,
--   drop constraint if exists members_email_format, drop constraint if exists members_linkedin,
--   drop constraint if exists members_cv_path, drop constraint if exists members_cv_name;
-- alter table public.jobs drop constraint if exists jobs_category, drop constraint if exists jobs_lengths,
--   drop constraint if exists jobs_arrays, drop constraint if exists jobs_apply_link, drop constraint if exists jobs_contact_email;
-- alter table public.posts drop constraint if exists posts_lengths, drop constraint if exists posts_link;

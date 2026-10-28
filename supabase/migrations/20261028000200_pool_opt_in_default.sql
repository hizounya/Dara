-- =====================================================================
-- Migration 0200: Talent Pool is opt-in by default
-- Status: PROPOSED. Not applied anywhere. Review before running.
-- =====================================================================
-- WHY     members.in_pool defaults to true, so a row created without an explicit choice lands in the pool.
--         The Hub now sends an explicit choice (checkbox off by default), but the database default should
--         also be private.
-- CHANGES Column default only.
-- IMPACT  None on existing rows: no member's in_pool value changes (team decision: never auto-enrol or
--         remove anyone). Only rows inserted without an in_pool value are affected.
-- VERIFY  insert a members row without in_pool (staging) -> in_pool = false.
-- =====================================================================

begin;
alter table public.members alter column in_pool set default false;
commit;

-- ROLLBACK
-- alter table public.members alter column in_pool set default true;

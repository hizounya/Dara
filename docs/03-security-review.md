# 03 · Security review (28 Oct 2026)

**Scope:**
- the public site (Astro)
- the Member Hub (`src/hub/`)
- build and deploy configuration
- the Supabase schema (`schema.sql`) and the proposed migrations

**Method:**
- **Two reviews:** my own review, plus an independent read-only review by a second agent.
- **Browser tests:** Playwright runs for both the site and the Hub.
- **Database policy test:** `schema.sql` and every migration run in a throwaway in-memory PostgreSQL 18 (PGlite) with minimal Supabase stand-ins (`auth.uid()`, `storage.objects`, roles), then the rules are checked as different users. Result: **42/42 checks passed**. The six gaps are confirmed before the migrations and closed after them.

**Not done:**
- Nothing was run against the real Supabase project.
- The stand-ins are simplified, so a staging run on a real Supabase project is still required before production (section 3).

## 1. Findings and status

Legend:
- ✅ fixed in code (this branch)
- 🗄️ fixed by a migration file: **proposed, not applied**
- ⚙️ needs a dashboard or deploy setting
- ⏳ planned

### High

| # | Finding | Status |
|---|---|---|
| S1 | **Wildcard redirect URLs allow account takeover.** Allowing `*.vercel.app` in Supabase Redirect URLs lets anyone deploy a matching site, request a sign-in link for a member's email (or craft a Google sign-in link), and receive that member's tokens. My earlier plan suggested a wildcard; that advice is withdrawn. | ⚙️ Allow only `https://<domain>/hub/` and `https://<domain>/signup`. Previews use a **separate staging Supabase project**. Docs corrected. |
| S2 | **Any email address = full read access.** Sign-in creates an account for any email. RLS then lets that account read pool members, roles, posts and shared CVs, even without a profile or consent. | 🗄️ 0300 (`is_member()` gate), 0100 + 0500 for CVs |
| S3 | **Shared CVs are readable by any signed-in account**, wider than the consent text ("members who post roles"). | 🗄️ 0100 (owner/admin only, apply first), then 0500 (admin-approved role posters) |

### Medium

| # | Finding | Status |
|---|---|---|
| S4 | **`cv_path` can point at another member's file.** For example, to make an admin's "Remove" delete the victim's CV. | ✅ the Hub only removes files inside the member's own folder (`ownsCV`) · 🗄️ 0300 policy + 0400 check |
| S5 | **Downloaded CV name and content are attacker-controlled.** HTML can be uploaded labelled as PDF, and `cv_name` can be anything (e.g. `CV.html`). Admins download every CV. | ✅ uploads checked by their first bytes (PDF `%PDF-`, DOCX `PK\x03\x04`); downloads checked the same way and refused if wrong; the download name is built from the member's name (`Nadia_Putri_CV.pdf`) and never taken from storage · 🗄️ 0400 `cv_name` check, 0500 upload-name rule |
| S6 | **Whole CV folder readable; old files survive.** Replaced or removed CVs and deleted profiles left files behind, and errors from Storage were ignored. | ✅ Storage errors are raised; profile deletion and admin removal delete **every** file in the member's folder; a failed save removes the new upload · 🗄️ 0500 reads only the member's **current** `cv_path` |
| S7 | **Other members can read more than the consent text lists** (`cv_path`, `cv_name`, `cv_size`, timestamps). | 🗄️ 0300 `pool_members` view (consented columns only); the Hub uses it automatically · ✅ the consent text now lists exactly what is visible, including school/company and the fields used for matching |
| S8 | **Demo mode could reach a public deployment.** Demo has a fixed code, and any "admin…" email opens admin screens; the demo code also shipped in every bundle. | ✅ the build fails on Vercel production **and** preview, or when combined with Supabase settings · ✅ the Hub refuses demo mode outside `localhost` · ✅ the demo backend is a separate module that production builds remove completely (checked by a test) |
| S9 | **No Content Security Policy; supabase-js loaded from a CDN** without integrity. | ✅ supabase-js bundled from npm (pinned 2.45.4) · ✅ strict CSP on every page (`script-src` only `'self'` + build hashes; `object-src 'none'`; `connect-src` only self + the Supabase project) · ✅ `vercel.json`: `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, COOP; `no-store` + `noindex` on `/hub` and `/signup` |

### Low

| # | Finding | Status |
|---|---|---|
| S10 | **`created_at` can be forged**, keeping spam at the top of Mading (a way around admin-only pinning). | 🗄️ 0500 (jobs), 0600 (posts, members) |
| S11 | **No limits on posting or uploads.** | 🗄️ 0600: 10 posts and 10 roles per member per day · 0500: at most 3 files per CV folder |
| S12 | **"LinkedIn" accepted any website** (a trusted-looking phishing link). | ✅ only `linkedin.com` · 🗄️ 0400 |
| S13 | **The test hook exposed in-memory state** in production. | ✅ demo builds only |
| S14 | **Sign-out in one tab left other tabs signed in.** | ✅ `onAuthStateChange` / storage event clears the session everywhere |
| S15 | **The Pool was opt-out.** | ✅ the checkbox starts off · 🗄️ 0200 database default |
| S16 | **Admin without a profile could not open a role** (a crash, not a vulnerability). | ✅ fixed |

### Checked and fine

- **XSS:** all Hub output goes through `esc()`, and links through `safeUrl`. An injected inline script is refused by the CSP (tested).
- **Redirects:** the homepage sign-in forwarder only ever goes to `/hub/` (no open redirect).
- **CSV export:** guards against spreadsheet formula injection.
- **Database functions:** `is_admin()` and the new functions are `security definer` with a fixed `search_path` and `execute` limited to `authenticated`.
- **Admin rights:** cannot be granted through the API.
- **Dependencies:** all pinned to exact versions from registry.npmjs.org.

## 2. Remaining risks and next steps

| Item | Plan |
|---|---|
| **Account deletion leaves the `auth.users` record (email).** PDP Law erasure is incomplete. | ⏳ Phase 7: an Edge Function using the service role **server-side only** deletes the auth user, CV files and the member's posts or roles, with confirmation |
| **Contact email is self-declared**, so a member could enter someone else's address. | Accepted for now and labelled "Contact email". ⏳ Show the sign-in email to admins next to it (admin-only RPC) |
| **Sign-in session is kept in the browser's localStorage** (supabase-js default). | Mitigated by the strict CSP. Moving to cookies needs server rendering: not planned |
| **CV content is checked by type, not scanned.** | Files are never opened in the browser by the Hub, only downloaded. ⏳ Optional server-side check in an Edge Function |
| **Automated sign-ups.** | ⚙️ Turn on Supabase CAPTCHA (Turnstile or hCaptcha) for sign-in. The CSP then needs the provider's script and frame origins |
| **Privacy Policy and consent records** | ⏳ Phase 6 `/privacy` page (needs legal and organisational review); consider storing `consented_at` |

## 3. Applying the migrations (owner: team; nothing has been run)

1. **Back up** the production database (Supabase → Database → Backups). Confirm what data exists.
2. Create a **staging** Supabase project. Run `schema.sql`, then every file in `supabase/migrations/` **in filename order**.
3. On staging, follow the **VERIFY** block at the top of each file, with test accounts A, B, C (no profile) and D (admin).
4. Point a local build at staging (`.env`) and run through the Hub: sign up, profile, CV upload and download, post a role, admin approval.
5. Production, in this order:
   - **0100 first.** It only narrows access and closes S3 immediately.
   - Then 0200 → 0600.
   - Each file is one transaction with a commented ROLLBACK.
6. **Never re-run `schema.sql`** on that database afterwards: it would recreate the old policies.
7. Existing roles stay **unapproved** after 0500. Admins approve them in Hub → Admin → *Roles awaiting approval*, or with the optional statement in 0500 if the team decides to approve all at once.

## 4. Supabase dashboard checklist (before going live)

- [ ] **Authentication → URL Configuration:**
  - Site URL: `https://<domain>`
  - Redirect URLs: exactly `https://<domain>/hub/` and `https://<domain>/signup`
  - **no wildcards**
- [ ] **Email OTP:**
  - expiry 10 minutes or less
  - rate limits on (defaults are fine)
  - custom SMTP (Resend or Brevo) so codes arrive reliably
- [ ] **Google sign-in** (if enabled): exact redirect URIs in Google Cloud. `PUBLIC_GOOGLE_LOGIN=true` only after that.
- [ ] **CAPTCHA protection** for sign-in (see section 2).
- [ ] **Organisation:** multi-factor authentication for everyone with dashboard access; as few owners as possible.
- [ ] **Backups:** daily backups (or point-in-time recovery).
- [ ] **The service-role key** is never put in this repository, Vercel env vars named `PUBLIC_*`, or the browser.
- [ ] **Vercel production env:** only `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_GOOGLE_LOGIN`. **No** `PUBLIC_DEMO_MODE` (the build refuses it anyway).

## 5. Re-running the database policy check

The PGlite script used for this review is kept outside the repository to avoid adding a dependency. It can be added as `tests/db/policies.mjs` with `@electric-sql/pglite` as a dev dependency if the team wants it in CI.

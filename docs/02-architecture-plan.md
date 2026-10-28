# 02 · Architecture and UX plan (Phase 3)

Status: proposal for review. Nothing here is implemented yet.
Builds on `01-audit.md`.

**Decisions already made:**
- Astro for the public site; the existing vanilla-JS Talent Hub is kept.
- Primary buttons are solid violet `#6A4CD5` with white text.
- The Supabase database is treated as production.
- No invented events, partners, testimonials, statistics, or contact details.

## 1. Goals and constraints

1. One product. The public site and the Member Hub share one header, footer, token set, and component styles.
2. **Keep the Hub intact during migration:**
   - first move it as-is
   - prove behaviour is unchanged with the same tests before and after
   - only then restyle
3. Minimal dependencies (listed in section 8). No React, no UI framework, no CSS framework.
4. Static output, deployable to Vercel with zero configuration. No server code until account deletion needs it (Phase 7).
5. Database changes ship only as reviewed migration files. Nothing runs against the live project.

## 2. Sitemap and routing

| URL | Page | Access | Source |
| --- | --- | --- | --- |
| `/` | Home | Public | `src/pages/index.astro` |
| `/about` | About us: story, the meaning of "Dara", vision, mission, values | Public | `src/pages/about.astro` |
| `/programs` | Programs & Events: what we run, upcoming and past events | Public | `src/pages/programs.astro` + `src/content/events/` |
| `/partnerships` | Why partner, ways to collaborate, contact | Public | `src/pages/partnerships.astro` |
| `/join` | Membership benefits, how joining works → Member Hub | Public | `src/pages/join.astro` |
| `/privacy` | Privacy Policy (required before open registration) | Public | `src/pages/privacy.astro` |
| `/signup` | Sign up for the Member Hub (added 28 Oct 2026 at the team's request): steps + email form; after the code is confirmed it hands over to `/hub/` for profile setup | Public | `src/pages/signup.astro` (same app, `data-mode="signup"`) |
| `/hub/` | Member Hub: sign in, then the app | Hub handles auth | `src/pages/hub/index.astro` + `src/hub/` |
| `/hub/#/mading`, `#/talent-pool`, `#/postings`, `#/profile`, `#/admin` | Hub views (added in Phase 5) | Members / admins | Hash router inside the Hub |
| `/404` | Not found | Public | `src/pages/404.astro` |
| `/styleguide` | Component reference for contributors (`noindex`, not linked) | Public URL | `src/pages/styleguide.astro` |

**Why hash routes inside the Hub:**
- They give deep links and a working back button with no server rewrites, on Vercel and in `astro dev` alike.
- They don't collide with Supabase's magic-link tokens (`#access_token=…`), because the router only reacts to hashes that start with `#/` and starts after `API.session()` has consumed any token.

### Navigation

```
Desktop header   [logo]   About   Programs & Events   Partnerships      (Member login)  [Join the community]
Mobile header    [logo]                                              [Join]  [☰ menu → full-height sheet]
Signed-in        "Member login" becomes "Member Hub"
Hub header       [logo]   Home  Mading  Talent Pool  My Postings  Profile  (Admin)      [name ▾ · Back to site · Sign out]
Footer (shared)  logo · one-line mission · About · Programs & Events · Partnerships · Join · Privacy · @daraintech.id · ©
```

- The footer shows a contact email only once one is confirmed (`site.contactEmail`, currently `null`).
- Signed-in detection on public pages comes from a cheap check: a Supabase session key in `localStorage`. It only swaps a link label and grants no access.

### User journeys

| Journey | Path |
| --- | --- |
| Visitor → member | Home → About or Programs → `/join` → `/hub/` (email code) → onboarding (consent, opt-in Talent Pool) → Hub home |
| Member → Talent Hub | Header "Member login" → `/hub/` → Hub home (top matches, profile completeness) → Talent Pool / Mading |
| Partner → collaboration | Home "Partner with us" band → `/partnerships` → contact CTA (Instagram DM until an email is confirmed) |

## 3. Homepage layout and hierarchy

All headline copy comes from the official intro carousel. New supporting copy is marked **[draft]** and goes to you for approval before release.

```
┌ SiteHeader ──────────────────────────────────────────────────────────────┐
│ 1 HERO                                                                  │
│   Hi, we're                                                             │  Dala: wave (master), bleeds right/bottom
│   Dara in Tech            ← GradientText, display size only             │  circuit corner top-right, skyline at base
│   A community for women to learn, connect, and grow in tech.            │
│   [Join our community]  (Explore Talent Hub)                            │
├──────────────────────────────────────────────────────────────────────────┤
│ 2 WHY WE EXIST     GradientCard + IconOrb(heart-outline, gradient)      │  Dala: comfort · gradient blob right
│   Exploring tech shouldn't feel lonely. We're building a closer, more   │
│   inclusive space for women, no tech background required.               │
│ 3 WHY DARA?        DefinitionCard  da • ra / noun • indonesian /        │  no mascot (pacing)
│   A young woman. + paragraph + "Because every woman has a place in tech."│
│ 4 WHAT WE DO       4 × FeatureRow (2×2 desktop, stacked mobile)         │
│   Sharing Sessions · Mini Workshop · Networking Nights · Project Collabs│
│   one-line description each [draft] → /programs                         │
│ 5 UPCOMING EVENTS  EventCard × up to 3, from src/content/events         │  Dala: cheer
│   Empty state: "We announce new events on Instagram first." → @daraintech.id
│ 6 TALENT HUB       what members get (real, existing features only):     │  Dala: thumbs-up
│   one profile · opt-in Talent Pool with match scores · Mading board     │
│   [Go to the Member Hub]                                                │
│ 7 PARTNER WITH US  CTABand → /partnerships (no partner logos until real)│
│ 8 JOIN US          framed card (--grad-frame bezel, as carousel slide 5)│  Dala: excited
│   Just exploring tech? Switching careers? Or already in the industry?   │
│   There's a place for you at Dara.  [Join the community]                │
└ SiteFooter (rounded --grad-footer-band) ─────────────────────────────────┘
```

**Behaviour rules:**
- `/` is always the community homepage. Visitors never land on the Talent Hub first. The Hub lives at `/hub/` and is reached through "Explore Talent Hub" (hero, outline button) or "Member login" (header).
- Hero buttons: "Join our community" → `/join` (primary) · "Explore Talent Hub" → `/hub/` (outline). Sentence case, per the DS voice rules.
- Only one primary (violet) button per viewport. Secondary actions use the outline button.
- Dala appears at most once per section, and never two sections in a row with the same pose.
- **Mobile (< 640 px):**
  - single column
  - Dala sits below the hero text at about 70% width, cropped by the section edge
  - decor is scaled down or hidden when it would sit behind copy
- Data-driven sections (events, partners) collapse to their empty state. They never show placeholders that look like real content.

### Other public pages (Phase 6, outline)

| Page | Sections | Content needed from the team |
| --- | --- | --- |
| About | Our story (carousel 2–3 copy) · What "Dara" means · Vision · Mission · Values · CTA | **Vision, mission, values text** |
| Programs & Events | Program formats (4 FeatureRows, expanded) · Upcoming events · Past events | Event entries (Markdown files) |
| Partnerships | Why partner · Ways to collaborate · How it works · Contact CTA | Partnership formats, contact email |
| Join | Who it's for · What members get · How joining works (3 steps) · FAQ · CTA → `/hub/` | FAQ answers [draft] |
| Privacy | Data collected · purpose · who sees what · retention · rights under UU PDP · contact | **Legal/organisational review.** I can draft the structure from what the code actually collects. |

## 4. Shared component architecture

### Principle: the CSS class API is the shared contract

- Astro components render static HTML with `.dit-*` classes.
- The Hub's string templates emit the **same classes**.
- Both sides read one stylesheet, so the site and the Hub stay visually identical without sharing JS.
- The `.dit-` prefix avoids collisions with the legacy Hub classes during the transition.

### Styles

```
src/styles/
  tokens/        colors.css · typography.css · spacing.css · fonts.css   ← copied verbatim from the design system
  web.css        web layer: fluid type scale, web radii, layout, breakpoints, focus ring, state colours
  base.css       reset, document typography, links (violet → pink), :focus-visible, reduced motion
  components.css .dit-btn, .dit-card, .dit-orb, .dit-tag, .dit-field, …
  site.css       entry: imports all of the above (used by public pages and, from Phase 5, the Hub)
```

**Web layer (proposed values, same proportions as the DS canvas scale):**

| Token | Value | Basis |
| --- | --- | --- |
| `--fs-body` | `1.0625rem` (17 px) | body 38 px on canvas |
| `--fs-lead` | `1.125rem` | lead 40 |
| `--fs-subhead` | `clamp(1.25rem, 1.1rem + .6vw, 1.5rem)` | 52 / 38 ≈ 1.37 × body |
| `--fs-section` | `clamp(2rem, 1.4rem + 3vw, 3.25rem)` | 110 / 38 ≈ 2.9 × |
| `--fs-title` | `clamp(2.25rem, 1.5rem + 3.6vw, 3.75rem)` | 132 / 38 ≈ 3.5 × |
| `--fs-hero` | `clamp(2.5rem, 1.6rem + 4.5vw, 4.25rem)` | 150 / 38 ≈ 3.9 × |
| `--fs-caption` / `--fs-label` | `.9375rem` / `.8125rem` | floored for legibility |
| Radii | control 12 · card 20 · feature 28 · frame 40 · pill | DS 16/28/44/64 scaled to a ~1200 px viewport |
| Layout | container 1200 px; gutters 16 / 24 / 32; breakpoints 640 / 960 / 1200 | — |
| States | error `#B0233B` · success `#17694A` | **Needs approval** (DS has none) |

Line height (0.95 / 1.1 / 1.42), tracking, spacing, shadows, and motion come straight from the DS tokens.

### Components

| Layer | Public site (Astro, zero JS) | Hub (same classes, rendered by Hub JS) |
| --- | --- | --- |
| Brand | `Logo`, `Mascot` (pose name → optimised `<picture>`), `GradientText`, `CircuitDecor`, `Skyline`, `GradientBlob` | `Mascot` images pre-built by Astro, URLs passed to the Hub |
| Layout | `BaseLayout` (doctype, lang, meta, fonts), `SiteHeader` (public or hub mode), `MobileNav` (≈20 lines of inline JS), `SiteFooter`, `Section`, `Container`, `SkipLink` | `HubLayout` reuses `SiteHeader mode="hub"` and `SiteFooter` |
| Content | `Button` (primary · outline · plum · ghost; sm / md / lg; `<a>` or `<button>`), `GradientCard`, `FeatureRow`, `IconOrb`, `Icon`, `Tag`, `DefinitionCard`, `EventCard`, `BenefitCard`, `CTABand`, `EmptyState` | Same classes |
| Forms | — (Join links to the Hub) | `.dit-field` text / select / textarea, checkbox, chip toggle group, skill picker, CV file input, form alert, toast |
| Hub data | — | job card, match score (tile + breakdown, always with a text label), person card, post card, filter bar, segmented tabs, dialog, data table, stat strip, profile completeness |

DS → web mapping notes:
- **Gradient CTA button:** not used for text buttons (contrast). Primary is solid violet.
- **`SwipePill` and `Handle`:** Instagram-only. The handle appears as a plain link in the footer.

### Content and configuration

- `src/data/site.ts`:
  - nav links
  - Instagram handle (real)
  - `contactEmail: null`
  - `partners: []`

  Sections that depend on these render only when the values are present.
- `src/content/events/*.md`: Astro content collection with a schema (title, date, location, format, link, summary).
  - Adding an event is a Markdown pull request.
  - Upcoming and past are split automatically by date.
  - **Starts empty.**

## 5. Preserving the Talent Hub and Supabase

### Phase 4: lift and shift (behaviour unchanged)

1. Move v1 with `git mv` to `legacy/talent-hub-v1/` (`index.html`, `source/`, `assets/`). History and relative paths are preserved, and it stays runnable as the "before" baseline.
2. `src/hub/hub.js` gets the IIFE from `source/index.html` **verbatim**, with only these changes:

   | Change | Why |
   | --- | --- |
   | `CONFIG` reads `import.meta.env.PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` / `PUBLIC_GOOGLE_LOGIN` | Configure through Vercel env vars, not by editing code. The anon key is public by design. |
   | Demo mode only when `PUBLIC_DEMO_MODE=true`. If not demo and config is missing → "Hub is not configured" screen. | Fail closed (audit finding 4). Local dev keeps demo mode via `.env`. |
   | `IMG.logo` / `IMG.dala` → URLs of Astro-optimised images | Replaces 87 KB of base64; cacheable |
   | Remove the `window.claude` download branch | Dead outside the artifact host. The plain `<a download>` path is already the fallback. |

   Everything else is untouched: API layer, match engine, views, events, `window.__DARA_TEST` hook, and supabase-js loaded from the same pinned CDN URL (`@supabase/supabase-js@2.45.4`).
3. `src/hub/legacy.css` holds the v1 `<style>` block verbatim. It's loaded **only** on `/hub/` in Phase 4, so v1 and site styles can't collide.
4. `/hub/` is rendered by a minimal layout with doctype, `lang="en"`, charset, and viewport. This alone fixes the mobile layout bug, because v1's responsive CSS starts applying.
5. Auth redirects keep working without code changes. `emailRedirectTo` and the OAuth `redirectTo` are built from `location.origin + location.pathname`, which becomes `/hub/`.
   - **Dashboard action for you (not code):** add `https://<domain>/hub/` and `https://<domain>/signup` (plus the Vercel preview pattern) to Supabase → Authentication → URL Configuration → Redirect URLs. Sign-in links sent from `/signup` return there and are handed over to `/hub/`.
6. **Old magic links.** Links emailed before the switch point at `/`. A ~5-line inline script on the homepage forwards any auth callback (`#access_token=`, `?code=`, `#error_description=`) to `/hub/` with the fragment intact.

### Phase 5: Hub redesign (behaviour preserved; changes listed explicitly)

- Swap `legacy.css` for `site.css` and update class names in templates.
- `shell()` stops rendering its own header and footer; the Hub fills the shared `SiteHeader` hub nav.
- Add the hash router (section 2).
- Add an `onAuthStateChange` listener.
- Extract `match.js` (pure functions) so it can be unit tested.
- Replace the CDN loader with `@supabase/supabase-js` pinned at the same version. This removes the third-party runtime script and enables a strict CSP.
- Correct the CV-sharing copy (see the decision list in section 9).

### Database changes: migration files only, never executed by me

Files go in `supabase/migrations/`, written in Phase 5. Each comes with:
- a plain-language impact note at the top
- a rollback block
- the expected effect on existing rows

The original `schema.sql` stays as your teammate wrote it.

| File | Change | Impact on existing data |
| --- | --- | --- |
| `…_01_pool_opt_in_default.sql` | `members.in_pool` default → `false` | None: affects new rows only. Whether existing members must re-confirm is a separate decision. |
| `…_02_member_gate.sql` | `is_member()` (security definer). `members`, `jobs`, `posts` select policies and the CV storage read policy require the reader to have a profile; your own row stays visible. | Accounts without a profile can no longer read community data. The UI already forces onboarding first, so no visible change for real members. |
| `…_03_constraints.sql` | Length limits, array caps (skills ≤ 25), `http(s)` URL checks, `jobs.category` list. Added `NOT VALID`, with a query to list violating rows before `VALIDATE`. | No rows changed or rejected retroactively |
| `…_04_cv_lockdown.sql` / `…_05_cv_verified_posters.sql` | CV access per section 11 (A, then B) | Narrows access only. No member settings change. |

**Rollout:**
1. Run `schema.sql` plus the migrations on a **fresh free Supabase project (staging)**.
2. Run the e2e suite against it.
3. Only then do you apply them to production, after confirming what data exists there.

Account deletion (an Edge Function using the service role server-side) and column-level privacy for the member directory are designed in Phase 7.

## 6. Testing: before and after, executed for real

| Suite | Tooling | Runs against |
| --- | --- | --- |
| `tests/e2e/hub.spec.js` (the Phase 1 smoke checks, extended) | `@playwright/test` with the **system Chrome** channel (no browser download) | **Before:** `legacy/talent-hub-v1/index.html` (project `hub-legacy`). **After:** `/hub/` on a demo build (project `hub`). Same spec. Builds are served by `tests/static-server.mjs`, because Astro 7's `preview` can detach into the background. |
| `tests/e2e/site.spec.js` (Phase 4) | Playwright | Homepage is not the Hub · old sign-in links forwarded to `/hub/` · a build with no Supabase config fails closed and writes no demo data |
| `tests/e2e/site.spec.ts` | Playwright + `@axe-core/playwright` | Every public page: renders, nav works, no console errors, no horizontal scroll at 390 px, no serious or critical axe violations |
| `tests/unit/match.test.js` (Phase 5) | `node:test` (built in) | Extracted match engine |
| Supabase-backed flows | Same e2e suite with `.env.staging` | Staging project only, once you create one |

**Acceptance for Phase 4:**
- `/hub/` passes every check v1 passed.
- The 4 document/viewport checks now pass too.
- The opt-in check remains a known failure until the Phase 5 fix.
- Results are reported as actually run.

## 7. Repository layout after Phase 4

```
astro.config.mjs · package.json · package-lock.json · .nvmrc (22) · .env.example · .gitignore
docs/                      01-audit.md · 02-architecture-plan.md
legacy/talent-hub-v1/      index.html · source/ · assets/          (untouched v1, the test baseline)
src/styles/fonts/          Open Sauce Sans, Hanken Grotesk woff2 + OFL license texts (beside tokens/ so the DS's
                           relative font paths resolve unchanged; Vite fingerprints them at build)
schema.sql                 unchanged
src/
  assets/brand/            logo, Dala poses, decor (optimised at build)
  components/              brand/ · layout/ · content/
  content/events/          (empty) + content.config.ts schema
  data/site.ts
  hub/                     hub.js · legacy.css
  layouts/                 BaseLayout.astro · HubLayout.astro
  pages/                   index · styleguide · hub/index · 404   (other pages in Phase 6)
  styles/                  tokens/ · web.css · base.css · components.css · site.css
tests/                     e2e/ · unit/
```

## 8. Dependencies

| Package | Kind | Why |
| --- | --- | --- |
| `astro` (latest stable at install time, pinned exactly) | runtime/build | Pages, layouts, image optimisation (bundled `sharp`), content collections |
| `@playwright/test` | dev | Before/after regression tests |
| `@axe-core/playwright` | dev | Automated accessibility checks |
| `@supabase/supabase-js@2.45.4` | runtime, **Phase 5** | Replaces the CDN-loaded copy of the same version |

No sitemap or SEO plugins. `sitemap.xml` and `robots.txt` are generated by small Astro endpoints in Phase 7.
Node 22 LTS (matches Vercel), pinned in `.nvmrc`. Node 25 is installed locally; the Astro engine range is checked at install time in 4.1.

## 9. Milestones

Each milestone ends with tests run and a **local commit on `feature/official-website`**. Nothing is pushed, merged, or deployed without your explicit approval.

| # | Milestone | Deliverable | Gate |
| --- | --- | --- | --- |
| **4.1** | Baseline and scaffold | Playwright suite run against v1 (recorded) · `git mv` v1 to `legacy/` · Astro scaffold · DS tokens and fonts copied · `.env.example` | Baseline results recorded |
| **4.2** | Hub lift and shift | `/hub/` running v1 behaviour from env config, fail-closed demo, optimised images, old-link forwarder | Same suite passes on `/hub/` |
| **4.3** | Design foundation | `web.css`, `base.css`, `components.css`, `/styleguide` | Your visual review of the styleguide |
| **4.4** | Header, footer, homepage | `SiteHeader`, `MobileNav`, `SiteFooter`, homepage sections 1–8 | Site e2e + axe, screenshots at 390 / 768 / 1280 → **Phase 4 review** |
| 5 | Hub redesign | Shared styles and header in the Hub, hash routing, auth listener, npm supabase-js, `match.js` + unit tests, migration files | Hub suite green; migrations reviewed by you |
| 6 | Remaining pages | About, Programs & Events, Partnerships, Join, Privacy (structure + draft), 404 | Content review by you |
| 7 | Production readiness | `vercel.json` security headers + CSP, SEO metadata + OG image, sitemap/robots, performance budget, account-deletion design, staging run of migrations, Vercel preview (with approval) | Final review |

## 10. Decisions (resolved 28 Oct 2026)

1. **Logo:** `Dara in Tech Design System/assets/logo/dara-in-tech-logo.png`, used unmodified. **Favicon:** the "d" mark cropped from that file, with no change to shape, colours, or proportions. It must stay recognisable at 16 / 32 px.
2. **Fonts:** Hanken Grotesk stays (HK Grotesk files are not available).
3. **State colours:** error `#B0233B`, success `#17694A`, as semantic tokens. Status messages always carry text, never colour alone.
4. **CV sharing: option (b).** A CV can be downloaded by:
   - its owner
   - admins
   - members who have posted a role, **only while** the owner has opted in to sharing **and** is in the Talent Pool

   It must be enforced by RLS and Storage policies, never by the UI alone. Access must not broaden to all authenticated members. CVs stay private by default. The existing consent label ("Let members who post roles download my CV") already describes this rule, so the wording stays and the policy is changed to match it. See section 11.
5. **Existing pool members:** `in_pool` and `cv_shared` values are never changed by a migration: no automatic enrolment or removal. Any future change that **widens** visibility or sharing requires renewed consent before it applies to existing members.
6. **About copy:** superseded on 28 Oct 2026 by the fuller "About Dara in Tech" copy from the team, which is now on the homepage:
   - About
   - the meaning of Dara
   - vision and mission
   - What we do (Learn Together · Connect Meaningfully · Grow With Opportunities)
   - What we believe (Belonging · Curiosity · Collaboration · Growth)
   - Who is Dara for?
   - Be part of Dara

   The meaning section uses the team's 28 Oct revision ("“Dara” is an Indonesian word for a young woman…"). The carousel's four formats (Sharing Sessions, Mini Workshop, Networking Nights, Project Collabs) appear as tags under What we do. Still marked **[draft]** in code: the Talent Hub blurb and the Partner with us line.
9. **Hero headline (28 Oct 2026):** "A new generation of women. A new era of tech." with "Hi, we’re Dara in Tech" as the line above it.
10. **Homepage tells the story before asking:** the order is hero → About → meaning + vision/mission → What we do (+ events) → values → who it's for → Talent Hub → Partner → Be part of Dara (CTA). Header links point to these sections until the separate pages exist (Phase 6), so there are no dead links. Button labels stay in sentence case ("Join our community") per the DS voice rules.
7. **Demo mode:**
   - off by default
   - enabled only by `PUBLIC_DEMO_MODE=true` at build time
   - never a silent fallback: missing Supabase config in a non-demo build shows a configuration error, not a simulated login
   - demo data stays in demo-only `localStorage` keys
   - visitors cannot switch it on in production, because the flag is compiled in and not read from the URL or storage
8. **Homepage first:** `/` always introduces the community. Hero buttons: "Join our community" (primary) and "Explore Talent Hub" (outline, → `/hub/`).

## 11. CV access: how role posters are identified (security note)

**What the database does today (`schema.sql`):**
- `jobs.posted_by` defaults to `auth.uid()`, and the insert policy requires `posted_by = auth.uid()`. So the database knows reliably *who* posted each role, and nobody can post a role under someone else's id.
- However, **any authenticated user can insert a role, with no review**. "Has posted a role" is therefore self-service: anyone can create a placeholder role in seconds, through the UI or straight through the API, and immediately qualify.
- The current storage read policy is broader still. Any authenticated user (not even a member) can download any CV whose owner ticked sharing and is in the pool. That is **more permissive than the consent wording**, so it is treated as a security issue.

**Proposed fix, as reviewable migrations (not applied):**

| Step | Change | Effect |
| --- | --- | --- |
| A. Lock down (ship first) | Storage read policy on `cvs`: owner or admin only | Member-to-member CV downloads are disabled until B is reviewed. No member's settings change. Strictly narrows access, so no renewed consent is needed. |
| B. Verified posters | `jobs.approved_at`, `jobs.approved_by`, set only by admins (guard trigger, same pattern as `posts_guard`) · `can_download_shared_cvs()` (security definer, pinned `search_path`): the caller has a `members` row **and** at least one role that is approved, open, and not past its deadline · storage policy: owner **or** admin **or** (`can_download_shared_cvs()` **and** owner `cv_shared` **and** owner `in_pool`) | Matches the consent wording. A placeholder role does not unlock CVs until an admin approves it. Needs a small admin "Approve role" action in the Hub (Phase 5). |

Enforcement lives entirely in Postgres and Storage policies, so calling the Supabase API directly gives the same answer as the UI. Each migration will document how to verify it with two test accounts on a staging project.

**Open question for the team:** should unapproved roles stay visible to members while they wait for approval? Approval only gates CV access, so either answer works.

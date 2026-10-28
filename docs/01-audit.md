# 01 · Audit: Talent Hub v1 and the design system

Status: Phase 1 and Phase 2 findings, recorded 28 Oct 2026 on branch `feature/official-website`.
Nothing in the codebase or database was changed while preparing this document.

## 1. Repository state

| Item | Finding |
| --- | --- |
| Remote | `origin` → `github.com/hizounya/Dara`, one branch (`main`) |
| History | One commit, `05d49a3` (28 Oct 2026, Hizounya Maycinto Alkian): "Add Dara in Tech Talent Hub: login, talent pool with match score, CV upload, Mading" |
| Source of truth | `source/index.html` (CSS + about 900 lines of JS in one IIFE) |
| Built output | Root `index.html` is `source/index.html` with the logo and Dala inlined as base64 (≈87 KB). `source/build.py` writes to `source/dist/`, not the root, so the root copy is updated by hand and can drift. |
| Database | `schema.sql`: tables, RLS policies, storage bucket. Safe to re-run (idempotent). |
| Missing | No tests, `package.json`, `vercel.json`, `.gitignore`, or license. README is in Indonesian. |
| Artifact leftovers | `<meta name="claude:viewport-fit-sides">` and a `window.claude.use('downloads')` call. The page was most likely written as a Claude artifact, where the host supplies the document skeleton. Deployed on its own, it has **no `<!doctype>`, `lang`, charset, or viewport meta**. |

## 2. What was verified to work

Demo mode, headless Chrome (Playwright), 28 Oct 2026: **19 of 26 checks passed.**

| Check | Result |
| --- | --- |
| Demo login (code `123456`; wrong code rejected) | Pass |
| Onboarding requires the consent checkbox | Pass |
| Profile save → home with top matches | Pass |
| All member tabs render (Home, Mading, Talent Pool, My Postings, Profile) | Pass |
| Member directory, posting a role, candidates ranked by match | Pass |
| Mading event post | Pass |
| Stored XSS payloads in name, headline, title, description: not executed | Pass |
| `javascript:` / `data:` links rejected (`safeUrl`) | Pass |
| `matchScore`: skill aliases + full fit = 100, no fit = 0 | Pass |
| Admin table and CSV export | Pass |
| No uncaught JS errors across the flow | Pass |
| Standards mode / `lang` / viewport meta / meta description | **Fail** (quirks mode; on a 390 px phone the layout is **980 px wide**, so the mobile CSS never applies) |
| Talent Pool opt-in by default | **Fail**: the checkbox is pre-ticked |

The 7th failure was a sequencing error in the test script, not an app defect. LinkedIn URL rejection was then confirmed directly against `safeUrl`.

**Not verified (no Supabase project available):** email OTP delivery, Google OAuth, RLS behaviour, Storage policies. These were reviewed by reading the code only.

## 3. Security and privacy findings

### High

1. **Anyone with an email address is effectively a member.** `signInWithOtp` creates an account for any address. RLS grants the `authenticated` role read access to:
   - all pool members' full rows (email, institution, bio, CV metadata)
   - all jobs and posts
   - shared CVs

   Onboarding and consent are enforced only in the UI. An account that never creates a profile can still read all of this directly through the Supabase API.
2. **The Talent Pool is opt-out.** `members.in_pool` defaults to `true` and the UI checkbox starts ticked, while the README says opt-in. Indonesia's PDP Law (UU 27/2022) expects explicit, informed consent.
3. **The CV sharing label is inaccurate.** It says "Let members who post roles download my CV", but the storage policy allows **any authenticated user**.

### Medium

4. **Demo mode activates silently when config is empty.** A misconfigured production deploy would look live, keep each visitor's data in their own browser, and show admin screens to any email starting with `admin`. Production should refuse to run (fail closed).
5. **Deletion is incomplete.** "Delete my profile" removes the `members` row and the CV, but the `auth.users` record (with the email) and the member's jobs and posts remain. Admin "Remove" is not a ban; the person can sign in again. Full erasure needs a server-side function. The service-role key must never reach the browser.
6. **The database doesn't enforce what the client validates.** No checks on URL schemes, array sizes, most text lengths, or `jobs.category`. `members.email` can be any value. Nothing rate-limits posting.

### Low

7. **Session and navigation:**
   - No `onAuthStateChange` listener, so sign-out or expiry in another tab isn't reflected.
   - No URL routing: refresh and the back button lose your place.
8. **Loading and caching:**
   - supabase-js loads from jsDelivr without SRI, and there's no CSP.
   - Base64-inlined images can't be cached.
   - All members are refetched on every tab focus. Fine at community scale.

### Done well (keep)

- Consistent HTML escaping (`esc`) and an http(s)-only link allowlist (`safeUrl`).
- CSV formula-injection guard.
- Only the anon key is used.
- `is_admin()` is `security definer` with a pinned `search_path`.
- The `admins` table has no write policies, so admin rights can't be granted through the API.
- Pinning is enforced by the `posts_guard` trigger.
- The CV bucket is private, with folder-scoped writes and a 2 MB / PDF+DOCX allowlist.

## 4. Design system extraction

Source: `Dara in Tech Design System/` (tokens CSS, React components for a 1080×1350 Instagram canvas, guidelines, assets). The carousel images are the primary visual reference.

### Tokens (used as-is)

| Group | Values |
| --- | --- |
| Core palette | Lavender `#AEAFF2` · Deep Plum `#331C33` · Soft Lilac `#E9E5FA` · Blush `#F7DEEB` · Vibrant Pink `#DE67A6` · Warm Ivory `#FAF8F5` |
| Sampled from carousel | Violet ink `#40298B` (all headlines and body) · Violet `#6A4CD5` · Orchid `#B582E4` · Rose `#F2A4D2` |
| Gradients | One family, violet → orchid → rose: `--grad-brand`, `-soft`, `-cta`, `-frame`, `-blob`, `-footer-band`, `-icon-orb` |
| Type | Open Sauce Sans 600/700/800 (display) · Hanken Grotesk 400/400i/500/700 (body) |
| Spacing | 8 · 16 · 24 · 32 · 48 · 64 · 80 · 120 |
| Radii | 16 · 28 · 44 · 64 · pill |
| Shadows | Violet-tinted only (`--shadow-soft`, `--shadow-cta`, `--shadow-card`) |
| Motion | `--ease-soft`, 140 ms / 240 ms; fades and small rises only |

### Rules

- **Backgrounds:** white or ivory, with one large soft gradient blob bleeding off an edge.
- **Decoration:**
  - circuit traces at corners and edges only, never behind copy
  - a pale lilac Jakarta skyline
  - no photography, textures, glassmorphism, or neon
- **Cards:** white fill with a gradient outline. No left-border accents.
- **The gradient is reserved for:** the brand word, card outlines, decorative blobs, and frames.
- **Interaction:** hover brightens slightly, press scales to 0.97, and links go from violet to pink.
- **Dala:**
  - pose matched to the topic, not one pose everywhere
  - large, bleeding off the right or bottom edge
  - **never drawn or generated**; only official artwork
- **Voice:**
  - "we" for the community, "you" for the reader; sentence case
  - no emoji; curly apostrophes
- **Icons:** solid single-colour glyphs inside lilac orbs.

### Gaps when applying an Instagram system to a website

| Gap | Resolution (see `02-architecture-plan.md`) |
| --- | --- |
| Type sizes and radii are canvas pixels (hero 150 px, body 38 px, card radius 44 px) | Add a web layer with the same proportions, fluid type scale, web radii. DS tokens stay untouched. |
| `--grad-cta` with white text = 2.97 → 1.91:1 (fails AA) | **Decided:** primary buttons are solid violet `#6A4CD5` with white text (5.82:1). Gradient stays decorative. |
| Pink `#DE67A6` text on white = 3.18:1 | Large text and decoration only. |
| Gradient headline word: rose end ≈ 1.9:1 | Brand word at display sizes only, never information-bearing text. |
| `--border-soft` `#E3DBF7` on white = 1.33:1 | Decorative dividers only. Form control borders use `--text-muted` `#6E5A9E` (5.80:1). |
| No error or success colours | Proposed: error `#B0233B` (6.67:1), success `#17694A` (6.65:1), both from the existing Hub. **Needs approval.** |
| No form components, no dark mode | Forms derived from tokens. Dark mode dropped for v1 rather than invented. |
| HK Grotesk substituted with Hanken Grotesk | HK Grotesk files are not on this machine. See section 5. |
| Icons are Font Awesome Free substitutes | Keep until originals are supplied. FA Free icons are CC BY 4.0: keep the attribution comment in each SVG. |
| Pose PNGs are 1.1–1.5 MB each | Astro image pipeline → responsive WebP/AVIF. |

### Contrast reference (WCAG 2.x)

| Pair | Ratio |
| --- | --- |
| Violet ink on white / ivory / lilac / blush | 11.01 / 10.38 / 8.94 / 8.70 |
| Plum on white | 15.50 |
| Muted `#6E5A9E` on white / lilac | 5.80 / 4.71 |
| White on violet `#6A4CD5` (primary button) | 5.82 |
| White on `--grad-cta` start / end | 2.97 / 1.91 ✗ |
| Pink `#DE67A6` on white | 3.18 (large text only) |
| Lavender `#AEAFF2` on white | 2.06 (decoration only) |

## 5. Brand assets

| Asset | File | Status |
| --- | --- | --- |
| **Logo (proposed)** | `Dara in Tech Design System/assets/logo/dara-in-tech-logo.png`, 1253×663 RGBA, trimmed from the official upload | Same artwork as the v1 repo logo, at about 3× the resolution. Proposed as the temporary master until an SVG exists. Used unmodified: no recolouring, redrawing, or re-proportioning. |
| v1 repo logo | `assets/logo.png`, 420×225 | Same artwork, low resolution and soft edges. Retire. |
| Icon-only mark | `~/Downloads/dara_in_tech_icon_transparent.png`, 1024×1024 | The "d" mark, but its lavender is visibly more muted and greyer than in the full logo. **Not used until confirmed official.** |
| Mascot | `assets/mascot/dala-waving-laptop.png` + 7 poses in `assets/mascot/poses/` | Official. Missing poses: point, explain, curious, surprised, clap. |
| Decor | `assets/decor/` (circuit corners, pins, skyline) | Official cut-outs from the carousel. |
| Fonts | Open Sauce Sans (OFL), Hanken Grotesk (OFL) | No license files are bundled in the DS folder. Add OFL texts alongside the self-hosted fonts. |

**HK Grotesk:** not found on this machine (searched Spotlight, `~/Library/Fonts`, `/Library/Fonts`, `~/Downloads`). Hanken Grotesk is the open-source successor from the same foundry (Hanken Design Co.), is OFL-licensed, and is already the DS fallback. **Recommendation: keep Hanken Grotesk.** If HK Grotesk files are supplied, check the license bundled with them before use. Switching is a one-line `@font-face` change because `--font-body` already lists `"HK Grotesk"` as an alternative.

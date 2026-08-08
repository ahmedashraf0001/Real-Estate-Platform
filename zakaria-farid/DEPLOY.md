# Production Deployment & Maintenance Runbook
## Zakaria Farid Real Estate — Cloudflare Pages (OpenNext adapter)

---

## Pre-Deployment Gate (must all be ✅ before deploying)

- [ ] All QA/security/audit findings are resolved (see `Audit-followup-corrections.md`)
- [ ] Real WhatsApp number confirmed live via an actual tap-test on a mobile device
- [ ] `MAINTENANCE_MODE` is built and tested locally (see Section 4)
- [ ] `npm run build` passes with 0 errors

---

## Section 1 — Cloudflare Pages Project Setup

### 1.1 GitHub Connection
1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Pages**.
2. Verify the GitHub repo `ahmedashraf0001/Real-Estate-Platform` is connected.
   - If not: **Create a project** → **Connect to Git** → select the repo → branch: `main`.

### 1.2 Build Configuration
Set these in the Pages project → **Settings** → **Builds & deployments**:

| Setting | Value |
|---|---|
| Build command | `npx @opennextjs/cloudflare build` |
| Build output directory | `.open-next/assets` |
| **Root directory (REQUIRED)** | **`zakaria-farid`** *(Cloudflare must build inside `zakaria-farid` subfolder where Next.js app lives)* |
| Node.js version | `22.x` *(set `NODE_VERSION=22` in Environment Variables to avoid Supabase package engine warnings)* |

> ⚠️ **CRITICAL**: In Cloudflare Pages project **Settings** → **Builds & deployments** → **Build configuration**, you **MUST** set **Root directory** to `zakaria-farid`. If left blank (`/`), Cloudflare tries to build the repository root where `Next.js` dependencies are missing.

### 1.3 Compatibility Flags (CRITICAL — do not skip)
In the Pages project → **Settings** → **Functions** → **Compatibility flags**:
- Add flag: **`nodejs_compat`**
- Set **Compatibility date** to today's date (format: `YYYY-MM-DD`)

Skipping this causes real runtime failures on edge, not a cosmetic issue.

---

## Section 2 — Environment Variables

Set these in Pages project → **Settings** → **Environment Variables** → **Production** tab.

> ⚠️ These must be set in the Cloudflare dashboard. Cloudflare does **not** read your local `.env.local` file at deploy time.

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lybkeycbiposjkjkyjlh.supabase.co` | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Safe (anon key, gated by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | **Server-side only. Mark as secret/encrypted.** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `201009970776` | Zakaria's confirmed real number |
| `MAINTENANCE_MODE` | `false` | Set to `true` for maintenance windows |

> 🔒 Mark `SUPABASE_SERVICE_ROLE_KEY` as **Encrypted** in the Cloudflare dashboard — this prevents it from appearing in build logs.

---

## Section 3 — Custom Domain (if applicable)

1. Pages project → **Custom domains** → **Set up a custom domain**.
2. Add Zakaria's domain. Cloudflare will provision SSL automatically (usually < 5 min).
3. If no custom domain yet: the `*.pages.dev` URL is fully functional — treat domain setup as a fast-follow.

---

## Section 4 — First Production Deploy & Smoke Test

### 4.1 Trigger Deploy
Push to `main` branch (or use **Manual deploy** in the Pages dashboard).

**Read the build log** — don't just check for "build succeeded." Look for warnings about missing environment variables or adapter version mismatches.

### 4.2 Post-Deploy Smoke Test (run on the real production URL)

- [ ] Homepage loads in both `/en` and `/ar` locales
- [ ] A property detail page loads with real finishing-details data
- [ ] Submit a real test lead via the contact form → appears in `/admin` pipeline
- [ ] WhatsApp redirect button opens with the correct number (`+201009970776`)
- [ ] Log into `/admin` → confirm dashboard, property CRUD, and lead pipeline work
- [ ] **Maintenance mode test** (see Section 5)
- [ ] Run Lighthouse on the live URL (not local dev — numbers differ)

---

## Section 5 — Maintenance Mode Toggle Runbook

### To ENABLE maintenance mode (take public site down)

1. Cloudflare Dashboard → **Workers & Pages** → select the Pages project.
2. **Settings** → **Environment Variables** → **Production**.
3. Edit `MAINTENANCE_MODE` → set value to **`true`** → Save.
4. Go to **Deployments** → **Retry deployment** (or push an empty commit to `main`).
   > ⚠️ **Full rebuild required** — Cloudflare Pages reads env vars at build time for Next.js. An env-var-only change without a rebuild will NOT take effect. Always trigger a redeploy.
5. Wait for build to complete (typically 2–4 minutes).
6. Visit the live URL → confirm the maintenance page appears (dark green branded page with WhatsApp button).
7. Visit `/admin` → confirm the admin dashboard still loads normally.
8. **Check HTTP status in browser DevTools → Network tab → the page request should return `503`** (not `200`).

### To DISABLE maintenance mode (restore site)

1. Repeat steps 1–3 above, set `MAINTENANCE_MODE` to **`false`**.
2. Trigger a redeploy (step 4 above).
3. Verify the homepage and property pages load normally.

> **Incident note**: Toggle maintenance mode ON *before* investigating a production issue — this shows a real branded page instead of a broken error to any visitors who land during your investigation window. Section 3.4 of `production.md` explains the rationale.

---

## Section 6 — Ongoing Maintenance (Monthly Cadence)

| Task | Frequency | Owner |
|---|---|---|
| Check npm dependency updates (`npm outdated`) | Monthly | You |
| Test updates in a Cloudflare Pages preview branch before merging to `main` | Per update | You |
| Check Supabase usage vs free-tier limits (dashboard.supabase.com) | Monthly | You |
| Domain/SSL renewal check (if domain not on auto-renew) | Before expiry | You |
| Re-run RLS audit (verify no new tables without RLS since last check) | Quarterly | You |
| Add/edit/remove property listings | As needed | Zakaria (via `/admin`) |
| Manage leads pipeline | Daily | Zakaria (via `/admin`) |

---

## Scope Boundary (communicate to Zakaria at handover)

The ongoing maintenance agreement covers:
- ✅ Dependency updates, security patches, uptime monitoring
- ✅ Maintenance mode activation during incidents
- ✅ Bug fixes for existing functionality

It does **not** cover:
- ❌ New features (e.g. cashflow calculator — separate scoped engagement)
- ❌ Content writing or translation
- ❌ Brand or design changes

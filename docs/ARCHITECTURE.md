# CaawiyeAI — Production Architecture & Migration Plan

> **Status:** Approved-as-planning · No application code in this document
> **Mission:** Collect **1,000,000** high-quality Somali speech recordings. Every approved recording feeds **two** AI datasets automatically:
> 1. **SomaliDatasets/somali-tts** (Text-to-Speech)
> 2. **SomaliDatasets/somali-stt** (Speech-to-Text)

**Architecture rule:** Supabase is the **primary database**. Hugging Face is the **final dataset repository**.
Users **never** upload to Hugging Face. Only **approved** recordings are synchronized automatically.

---

## 1. Current Project Analysis

### 1.1 Inventory (verified against the working tree)

| Layer | Files | Notes |
|---|---|---|
| **App shell** | `src/App.jsx`, `src/main.jsx`, `src/index.css` | React 18 + Vite 5, BrowserRouter, Theme + Auth + Toast providers |
| **Routing** | `src/App.jsx` | `/`, `/login`, `/register`, `/dashboard`, `/record`, `/profile`, `/leaderboard`, `/statistics`, `/admin/login` (hidden), `/admin/*` (overview, datasets, sentences, users, charts, settings), fallback `* → Home` |
| **Route guards** | `src/components/ProtectedRoute.jsx`, `AdminGuard.jsx` | `AdminGuard` guards `/admin`, sending unauthenticated staff to hidden `/admin/login` and non-admins (`admin`/`super_admin` only) to `/dashboard` |
| **Public pages** | `Home`, `Login`, `Register`, `Leaderboard`, `Statistics` | |
| **User pages** | `Dashboard`, `Record`, `Profile` | `Record` uses `MediaRecorder` + `getUserMedia` |
| **Admin pages** | `admin/AdminLayout`, `AdminOverview`, `AdminDatasets`, `AdminSentences`, `AdminUsers`, `AdminCharts`, `AdminSettings` | Chart.js via `react-chartjs-2` |
| **Shared components** | `Navbar`, `Footer`, `PageHeader`, `StatCard`, `ui/Toast` | |
| **Data layer** | `src/services/dataService.js` (466 lines), `src/services/mockData.js` | **Dual-mode**: Supabase "live" OR localStorage mock, selected by `IS_LIVE` |
| **Auth** | `src/contexts/AuthContext.jsx`, `lib/supabase.js` | Email, Google, GitHub; mock admin `admin@caawiyeai.so` |
| **Config / env** | `src/config/config.js`, `.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Schema** | `supabase/schema.sql` | `profiles`, `sentences`, `datasets` + RLS + one trigger |
| **Sync stub** | `supabase/hf_sync.py` | Reference script (not wired) |
| **PWA** | `vite.config.js`, `public/manifest.webmanifest`, icons | `vite-plugin-pwa`, generated service worker |

### 1.2 Current data flow

```
User login → Record page → getSentences() → getUserMedia/MediaRecorder
  → data.submitDataset(audio_blob) → [live] Storage bucket "audio" (public) + datasets row (status=pending)
  → admin sets status accepted/rejected → counters on profiles → charts/stats read datasets table
```

### 1.3 Current database model (simplified)

- **profiles**: id, username, email, photo, country, language, bio, role (`member|admin`), joined_at, total_submissions, accepted, rejected
- **sentences**: id, text, language, category, difficulty, is_recorded
- **datasets**: id, sentence_id, user_id, audio_url, duration, noise, gender, age_group, device, browser, status (`pending|accepted|rejected`), created_at
- 3 indexes, 7 RLS policies, 1 trigger, 1 storage bucket (`audio`, public)

---

## 2. Problems Found

1. **Prototype architecture pattern.** The dual live/mock `dataService` is an acceptable demo technique but is **not production** — it duplicates every API, hard-codes a demo admin, and hides real backend bugs behind `IS_LIVE`.
2. **No data model for the mission.** One `datasets` table cannot express the full lifecycle: sentence → assignment → recording → validation → approval → sync. No `recordings`, `validation_results`, `approvals`, `notifications`, `achievements`, `daily_progress`, `sync_queue`, `audit_logs`, `roles`, `permissions`.
3. **Audio is public and user-uploaded directly.** Bucket `audio` is public; any recording is world-readable. There is no `pending → approved` storage separation, no signed URLs, and no per-user isolation.
4. **No anti-abuse / validation pipeline.** No quality gate before acceptance; "accepted" is a manual flag. No duplicate detection, silence/noise checks, STT comparison, or duration validation.
5. **No real dataset sync.** `hf_sync.py` is a standalone script; nothing is wired to `SomaliDatasets/somali-tts` / `somali-stt`, and no idempotent sync queue exists.
6. **RBAC is a single string column.** `role in ('member','admin')`. No `reviewer`, `super_admin`, no permissions matrix, no revocation, no elevation on hidden admin surface.
7. **Admin is discoverable and unencrypted.** `/admin` is in the public nav for admins; the login is the same page as users; no separate `/admin/login`; no rate limiting on auth attempts.
8. **Security gaps.** No rate limiting, no bot protection (CAPTCHA/Turnstile), no CSP headers, no audit logging, no input validation on server (sentences can be inserted by anyone — RLS `with check (true)`), no CSRF consideration for cookie flows, no `service_role`-isolated server path.
9. **No type safety / validation.** Plain JS, no `zod`, no generated `supabase.types.ts`; a typo in a column name fails silently at runtime.
10. **Stats are expensive count(*) queries.** `getStats` fires 5 exact-count queries on every view; leaderboard is computed client-side; no materialized views/caching.
11. **Env/config is ad-hoc.** Config is a plain object with no validation; no server-side envs (service-role key, HF token, etc.).
12. **No tests, linting, CI, or migrations tooling.** No `supabase db` migration workflow; no unit/e2e tests; no ESLint/Prettier config; no GH Actions.
13. **Stack drift.** The stated target stack says **TailwindCSS**, but the repo is **Bootstrap 5**. Must be decided before Phase 1 (see §3).
14. **Mobile recording is untested.** WebM on iOS Safari is not supported (produces `audio/mp4`); no codec normalization, no offline queue, no background sync.

---

## 3. Recommended Improvements (decisions to ratify)

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | **CSS framework** | **Keep Bootstrap 5** (already shipping, zero regression risk); adopt a thin design-token layer (`src/styles/tokens.css`) mapping brand colors. Tailwind migration deferred to a later optional phase. | Do not break existing functionality. |
| D2 | **Language** | Adopt **TypeScript incrementally** — generate `Database` types from Supabase, keep components in JSX during Phase 1–2, convert core modules first (lib, services, hooks), no big-bang rewrite. | Type-safe data access without a disruptive rewrite. |
| D3 | **Delete the mock layer** | `dataService` mock path removed; **Supabase is the only data source**. Dev/seed data comes from SQL seeds + test fixtures, never localStorage. | Production parity; removes the `IS_LIVE` fork. |
| D4 | **Server-side authority** | All **mutating** operations (submit, approve, sync, sentence add) go through **Supabase Edge Functions** using `service_role`; the anon key + RLS stays for reads and auth. | Single enforcement point, audit-friendly. |
| D5 | **Audio** | Private buckets (`pending-recordings`, `approved-recordings`, `rejected-recordings`), signed-URL reads, client-side pre-validation, server-side AI validation. | Users never touch each other's audio; privacy & abuse control. |
| D6 | **Datasets** | Rename `datasets` → `recordings`; introduce full lifecycle tables (§5). | Fits the mission (TTS + STT corpora). |
| D7 | **Hugging Face** | Sync only `approved` recordings via an idempotent `dataset_sync_queue` + scheduled Edge Function to `SomaliDatasets/somali-tts` and `SomaliDatasets/somali-stt`. | Users never upload to HF. |

---

## 4. New Folder Structure

```
caawiyeai/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # router composition
│   │   ├── router.tsx                 # route definitions + lazy loading
│   │   └── providers.tsx              # Theme/Auth/Toast/Query providers
│   ├── components/                    # shared presentational components
│   │   ├── ui/                        # design system (Button, Card, Badge, Toast, Skeleton…)
│   │   ├── layout/                    # Navbar, Footer, AppShell, Sidebar
│   │   └── common/                    # Avatar, ProgressBar, AudioPlayer, EmptyState
│   ├── features/                      # feature modules (owned domain slices)
│   │   ├── auth/                      # login, register, admin-login, session hooks
│   │   ├── recording/                 # record flow, recorder hook, upload
│   │   ├── review/                    # admin review queue, validation status
│   │   ├── gamification/              # achievements, leaderboard, daily-progress
│   │   ├── admin/                     # admin layout + pages
│   │   └── datasets/                  # stats, export, sync monitor
│   ├── lib/
│   │   ├── supabase/client.ts         # typed client (anon)
│   │   ├── supabase/server.ts         # typed client (service_role, Edge-only)
│   │   ├── supabase/types.ts          # generated Database types
│   │   └── storage/audio.ts           # upload, signed URLs, bucket constants
│   ├── config/env.ts                  # zod-validated env
│   ├── hooks/                         # shared hooks (useDebounce, useRealtime, …)
│   ├── utils/                         # validators, formatters, audio utils
│   ├── styles/                        # tokens.css, theme.css, bootstrap import
│   └── test/                          # unit + integration tests
├── supabase/
│   ├── migrations/                    # 001_….sql … NNN_….sql  (one per phase)
│   ├── functions/                     # Edge Functions (each with its own folder)
│   │   ├── submit-recording/
│   │   ├── validate-recording/
│   │   ├── approve-recording/
│   │   ├── sync-datasets/
│   │   ├── admin-auth/
│   │   └── _shared/                   # zod schemas, rbac helper, audit helper
│   ├── seeds/                         # idempotent seed data
│   ├── policies/                      # RLS policy snippets (mirrored in migrations)
│   └── tests/                         # SQL tests / pgTAP
├── e2e/                               # Playwright tests
├── playwright.config.ts
├── .github/workflows/                 # ci.yml, deploy.yml
└── .env.example
```

---

## 5. New Database Schema

Conventions: `uuid pk default gen_random_uuid()`, `timestamptz default now()`, enums for constrained states, `updated_at` on mutable tables, hard FKs with explicit `on delete`, indexes on every FK + filtered indexes for hot queries, `exclude` constraints where needed (e.g., sentence-to-user assignment uniqueness).

### 5.1 Roles & Permissions

```sql
create type public.app_role as enum ('member', 'reviewer', 'admin', 'super_admin');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code public.app_role unique not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- e.g. 'recordings.approve', 'sentences.manage', 'users.view'
  description text
);

create table public.role_permissions (
  role public.app_role not null references public.roles(code),
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role, permission_id)
);
```

### 5.2 Profiles

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  photo text,
  country text,
  language text default 'so',
  bio text,
  role public.app_role not null default 'member',
  status text not null default 'active' check (status in ('active','banned','pending')),
  gender text, age_group text,          -- optional self-reported (also captured per recording)
  consent_approved_at timestamptz,      -- GDPR-style explicit consent (required before submit)
  total_submissions int not null default 0,
  accepted int not null default 0,
  rejected int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_contribution_at timestamptz,
  joined_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index profiles_rank_idx on public.profiles(total_submissions desc);
```

### 5.3 Sentences

```sql
create table public.sentences (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  language text not null default 'so',
  dialect text check (dialect in ('maxaa','maay','neutral')),
  category text default 'general',
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  source text,                           -- CC0/CC-BY source attribution
  is_recorded boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index sentences_status_idx on public.sentences(status) where status = 'active';
create index sentences_dialect_idx on public.sentences(dialect);
-- normalized-ish text uniqueness to avoid near-duplicate prompts
create unique index sentences_text_uq on public.sentences(lower(text));
```

### 5.4 Assignments (who records what, once)

```sql
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  sentence_id uuid not null references public.sentences(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open','recorded','skipped','expired')),
  expired_at timestamptz,
  unique (sentence_id, user_id)
);
create index assignments_user_open_idx on public.assignments(user_id, status) where status = 'open';
create index assignments_queue_idx on public.assignments(status, assigned_at);
```

### 5.5 Recordings (the core entity)

```sql
create type public.recording_status as enum ('pending_upload','uploaded','validating','pending_review','approved','rejected','archived');

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete set null,
  sentence_id uuid not null references public.sentences(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.recording_status not null default 'pending_upload',
  storage_key text,                      -- path in pending/approved/rejected bucket
  duration numeric check (duration between 0.5 and 30),
  sample_rate int, channels int, format text,   -- recorded capture metadata
  noise_level smallint check (noise_level between 1 and 5),
  gender text, age_group text,           -- speaker metadata for dataset balance
  device text, browser text, app_version text,
  client_checks jsonb not null default '{}',  -- e.g. {silenceRatio, clippedSamples, micLevel}
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  validation jsonb,                      -- snapshot of validation result
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index recordings_status_idx on public.recordings(status);
create index recordings_user_idx on public.recordings(user_id);
create index recordings_sentence_idx on public.recordings(sentence_id);
create index recordings_review_queue_idx on public.recordings(status, created_at) where status in ('pending_review');
```

### 5.6 Validation Results

```sql
create table public.validation_results (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references public.recordings(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','pass','fail','error')),
  checks jsonb not null default '{}',    -- {duration, silenceRatio, noiseLevel, sttMatch, duplicateHash, pronunciationScore}
  scores jsonb,                          -- normalized 0..1 per check
  transcript text,                       -- STT transcript (for STT dataset)
  audio_hash text,                       -- perceptual/byte hash for de-dupe
  model text,                            -- e.g. 'whisper-large-v3', 'pipeline:2.1'
  ran_at timestamptz not null default now()
);
create index validation_status_idx on public.validation_results(status);
create index validation_hash_idx on public.validation_results(audio_hash);
```

### 5.7 Approvals

```sql
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings(id) on delete cascade,
  decided_by uuid references public.profiles(id),
  decision text not null check (decision in ('auto_approved','approved','rejected','requires_review')),
  source text not null check (source in ('ai','reviewer','admin')),
  comment text,
  decided_at timestamptz not null default now()
);
create index approvals_recording_idx on public.approvals(recording_id);
```

### 5.8 Notifications

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,                    -- 'achievement','approval','milestone','system'
  title text not null, message text,
  payload jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_read_idx on public.notifications(user_id, is_read);
```

### 5.9 Achievements

```sql
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,             -- bronze/silver/gold/diamond
  title text not null, icon text, threshold int not null, unit text
);
create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
```

### 5.10 Leaderboard

```sql
-- Single source of truth; materialized nightly for heavy reads
create materialized view public.leaderboard_daily as
  select row_number() over (order by sum(case when r.status='approved' then 1 else 0 end) desc) as rank,
         u.id as user_id, u.username, u.photo, u.country,
         count(*) filter (where r.status='approved') as approved,
         count(*) filter (where r.created_at >= now() - interval '7 days' and r.status='approved') as weekly
  from public.recordings r join public.profiles u on u.id = r.user_id
  group by u.id, u.username, u.photo, u.country;
refresh materialized view concurrently public.leaderboard_daily;
```

### 5.11 Daily Progress

```sql
create table public.daily_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  recorded int not null default 0,
  approved int not null default 0,
  primary key (user_id, day)
);
create index daily_progress_day_idx on public.daily_progress(day);
```

### 5.12 Dataset Sync Queue

```sql
create table public.dataset_sync_queue (
  id bigint generated always as identity primary key,
  recording_id uuid not null unique references public.recordings(id) on delete cascade,
  target text not null check (target in ('tts','stt','both')),
  status text not null default 'queued' check (status in ('queued','uploading','uploaded','failed','skipped')),
  attempts int not null default 0,
  last_error text,
  uploaded_at timestamptz,
  queued_at timestamptz not null default now()
);
create index sync_queue_status_idx on public.dataset_sync_queue(status) where status in ('queued','failed');
```

### 5.13 Audit Logs

```sql
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,                  -- 'recording.approved','recording.rejected','sentence.created','user.banned'
  entity_type text, entity_id uuid,
  before jsonb, after jsonb,
  ip inet, user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on public.audit_logs(actor_id);
create index audit_logs_action_idx on public.audit_logs(action);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
```

### 5.14 Index / FK summary

- **FKs:** every `user_id` → `profiles(id)`; `sentence_id` → `sentences(id)`; `recording_id` → `recordings(id)`; `assignment_id` → `assignments(id)`; child tables cascade with their parent.
- **Unique:** assignments `(sentence_id, user_id)`; sentences `lower(text)`; validation_results per recording; sync queue per recording; user_achievements pair; daily_progress `(user_id, day)`.
- **Hot filtered indexes:** `recordings(status='pending_review')`, `assignments(user_id,'open')`, `sync_queue(status in ('queued','failed'))`.

### 5.15 RLS policy map

| Table | Select | Insert | Update | Delete | Notes |
|---|---|---|---|---|---|
| profiles | all authed | — (via trigger) | owner OR admin | — | public reads of `username` via limited view |
| sentences | all | **Edge-only (service_role)** | admin/super_admin | admin/super_admin | no public `insert` (fixes current gap) |
| assignments | owner OR admin | Edge-only | Edge-only | — | user sees own open assignments |
| recordings | owner OR reviewer/admin | Edge-only (validated upload) | Edge-only | admin/super_admin | **users cannot read others' audio paths** |
| validation_results | reviewer/admin | Edge-only | Edge-only | — | never public |
| approvals | reviewer/admin | reviewer/admin | — | — | |
| notifications | owner | system/service | owner (mark read) | owner | |
| achievements | all | system | — | — | |
| user_achievements | owner OR public aggregate | system | — | — | |
| daily_progress | owner OR admin | system | system | — | |
| dataset_sync_queue | admin/super_admin | system | system | system | **service-role only** |
| audit_logs | super_admin | **system trigger/Edge only** | — | — | append-only |
| roles / permissions | all authed | super_admin | super_admin | super_admin | |

Every Edge Function runs with `service_role` + zod-validated input; the **client** can only invoke functions (via `supabase.functions.invoke`), never touch `service_role`.

---

## 6. Security Architecture

| Layer | Control |
|---|---|
| **AuthN** | Supabase Auth (email/password, Google, GitHub); optional **anonymous guest** session that must upgrade before submitting (keeps consent + identity for the corpus). JWT issued by Supabase; short-lived access + refresh token handling via SDK. |
| **AuthZ** | RBAC via `profiles.role` (`member|reviewer|admin|super_admin`) + `permissions`/`role_permissions`; a `has_permission(role, code)` helper used in Edge Functions and RLS; `security definer` only for owned internal functions. |
| **Hidden admin surface** | Separate `/admin/login` route with its own rate-limited Edge Function (`admin-auth`); admin login **never appears on landing page**; after auth the app checks role via `profiles.role`; every admin route wrapped in `<AdminGuard>` + server-side check in every admin Edge Function. |
| **RLS** | All tables `enable row level security` (see §5.15). Client (anon) key used only for reads + auth; no client writes to protected tables. |
| **Rate limiting** | Edge Functions throttle by `auth.uid()` + IP using Postgres-backed counters (or Upstash Redis): e.g. max 1 recording/min, max 10 auth attempts/5 min, max 50 API calls/min. |
| **Bot protection** | Cloudflare Turnstile (invisible) token on `/register`, `/login`, and the recording **submit** path; verified in the Edge Function before processing. |
| **Storage security** | Buckets `pending-recordings`, `approved-recordings`, `rejected-recordings` are **private**. Uploads via signed-URL generation in Edge Function; reads via short-lived signed URLs; per-user isolation enforced by path pattern `<user_id>/<recording_id>.webm` + Edge checks. |
| **API routes** | All mutation goes through Edge Functions (service_role); functions validate with **zod**, verify Turnstile, rate limits, ownership, and write audit entries. |
| **Input validation** | zod schemas shared between Edge Functions and client (`@caawiyeai/validators`); sentence length/dialect checks; file-type/mime/size/duration validation. |
| **CSRF** | Supabase cookies flow (`SameSite=Lax`/`Strict`), custom headers on `fetch`, no credential-carrying GETs; Edge Functions reject requests without the expected `apikey`/authorization headers. |
| **XSS** | React auto-escaping; **CSP** headers in `vercel.json`/`_headers` (default-src 'self', no inline scripts, allow-listed connect-src for Supabase/HF); sanitize any rendered `sentence`/`comment`. |
| **Audit logging** | `audit_logs` rows appended inside Edge transactions for every sensitive action; super_admin can query; DB-level triggers capture destructive `DELETE`. |
| **Secrets** | Never in the client. `VITE_*` vars only (anon key, Supabase URL, Turnstile site key). Server secrets (`service_role`, `HF_TOKEN`, `WHISPER_KEY`) live in Supabase Secrets / Vercel envs. |

---

## 7. API Architecture

**Pattern:** thin client → Supabase Edge Functions → Postgres + Storage. Reads may use typed Supabase queries (RLS-scoped); **all writes are function calls**.

| Endpoint (Edge Function) | Method | Purpose | Validation |
|---|---|---|---|
| `submit-recording` | POST | Validate Turnstile + rate limit, create assignment→recording, generate signed upload URL for `pending-recordings`, client uploads blob, mark `uploaded` | zod schema, mime/size/duration, ownership |
| `validate-recording` | POST | Client-ready; after upload, starts AI validation job (§9) → writes `validation_results`, moves recording to `pending_review` or auto-approve | internal/queued |
| `approve-recording` | POST | Reviewer/admin approves or rejects; moves blob pending→approved/rejected bucket; updates counters; enqueues sync; audits | reviewer+ |
| `admin-auth` | POST | Hidden admin login with rate limiting + Turnstile | zod, role check |
| `sync-datasets` | POST/CRON | Pulls `dataset_sync_queue` rows, pushes to HF TTS + STT repos, idempotent | service-only |
| `admin/sentences` | POST/PATCH/DELETE | Sentence CRUD (reviewer+) | zod, uniqueness |
| `admin/users` | PATCH | Ban/unban, role change (super_admin only, audit) | zod, elevation rules |
| `admin/export` | POST | Generate metadata.csv snapshot + signed download URL | admin |
| `notifications/read` | POST | Mark notification read | owner |
| `stats/overview` | GET | Return cached/aggregated stats from views | public |

**Realtime:** `notifications`, `recordings` (admin review queue) via Supabase Realtime channels with RLS. **Observability:** structured logs to Supabase Logs + optional Sentry ingestion; every function returns `{ ok, data | error }`.

---

## 8. Audio Processing Architecture

```
getUserMedia (webm/opus on desktop, mp4/m4a on iOS)
   │
   ├─ Client pre-checks (before upload):
   │    duration 0.5–15s · micLevel > threshold · silenceRatio < 0.3
   │    clippedSamples < 1% · no clicks (zero-crossing spikes)
   │
   ▼
Edge Function: submit-recording
   └─ signed upload URL → upload blob to storage.pending-recordings/<user_id>/<recording_id>.webm
   ▼
Edge Function/worker: validate-recording
   ├─ normalize (ffmpeg/ffprobe): mono 16kHz WAV for STT, 24kHz for TTS
   ├─ VAD (silence trimming), RMS loudness normalization
   ├─ STT transcript (Whisper) → store transcript (STT target) 
   ├─ text alignment (WER between prompt & transcript) → pronunciation gate
   ├─ perceptual hash / near-duplicate detection vs validation_results.audio_hash
   ├─ scores → validation_results (pass/fail)
   ▼
approved path: move to storage.approved-recordings/<user_id>/<id>.<ext>
rejected path: move to storage.rejected-recordings/… (retention policy TTL)
```

Server-side transcode is done by the validation worker (Edge Function can shell out to a Deno ffmpeg wasm or delegate to a small Fly/Render worker); the **raw** upload is always kept immutable and referenced by `storage_key`.

---

## 9. AI Validation Architecture

| Check | Model/Technique | Gate |
|---|---|---|
| Duration | ffprobe | 0.5s–15s |
| Silence/VAD | Silero VAD (ONNX) | silence ratio < 0.3 |
| Noise/SNR | spectral flatness / SNR estimate | SNR ≥ threshold |
| Clipping | waveform peaks | < 1% clipped samples |
| **STT comparison** | Whisper (large-v3) Somali transcript vs prompt (WER) | WER ≤ 0.15 |
| **Pronunciation** | phonetic alignment (forced aligner) | score ≥ 0.8 |
| **Duplicate** | audio hash + STT text similarity | unique per prompt+speaker |
| Speaker/session | (future) speaker diarization/ID | Phase 4 |

**Decision flow:** all checks **pass** → `auto_approved` (with reviewer override window); any **hard fail** → `rejected` + reason; **soft fail** → `pending_review` for human reviewer. Scores persist in `validation_results.scores` and ride along into dataset metadata for corpus QA. Pipeline versioned in `model` column.

---

## 10. Dataset Synchronization Architecture

```
recordings.status = approved
   │ (after commit)
   ▼
dataset_sync_queue: (recording_id, target=both, status=queued)
   │
   ▼  cron: pg_cron every N min  (or scheduled Edge Function)
Edge Function: sync-datasets
   ├─ select queued/failed rows (batch 100, idempotent, order by queued_at)
   ├─ for each: fetch normalized audio (approved-recordings signed URL)
   ├─ for TTS:    push audio + metadata → SomaliDatasets/somali-tts
   ├─ for STT:    push audio + transcript → SomaliDatasets/somali-stt
   ├─ upload via HF API (LFS), verify 200, mark uploaded
   └─ on failure: attempts+1, last_error, requeue w/ backoff (max 5)
```

- **Only approved** recordings ever leave Supabase.
- HF is treated as a **cold storage sink**; Supabase remains the source of truth.
- `metadata.csv` regenerated per batch or on `sync-datasets --full` with `client_id`, `sentence`, `transcript`, `duration`, `gender`, `age_group`, `dialect`, `quality` columns.
- Failures are visible in the admin **Sync Monitor** page (new) and retried automatically.

---

## 11. Deployment Architecture

```
[ Vercel (frontend, PWA) ]  ←  vercel.json (headers, CSP, rewrites to /admin/*)
        │
[ Supabase project ]
   ├─ Auth + Postgres (RLS, views, pg_cron)
   ├─ Storage: pending / approved / rejected buckets (private)
   └─ Edge Functions (Deno) + Realtime
        │
        ▼ (approved only)
[Hugging Face] SomaliDatasets/somali-tts · SomaliDatasets/somali-stt
```

| Concern | Approach |
|---|---|
| Frontend | Vercel; `npm run build`; preview deployments per PR; `vercel.json` for security headers |
| DB migrations | `supabase migrations` committed to repo; applied via CI (`supabase db push`) on `main` |
| Secrets | `VITE_*` in Vercel for client; `SUPABASE_SERVICE_ROLE_KEY`, `HF_TOKEN`, `WHISPER_KEY` in Supabase/Vercel envs |
| Observability | Supabase logs, Sentry (client + functions), structured `audit_logs` |
| CI/CD | GH Actions: lint → test → build → e2e (Playwright against preview) → deploy |
| Environments | `dev` (branch DB), `staging`, `prod`; seeds only in dev/staging |
| Backup | Supabase PITR; HF repo history as dataset backup |
| Scale | Materialized leaderboard, indexed queues, batch sync, `pg_cron`; Pagination on all admin lists (server-side) |

---

## 12. Development Roadmap (each phase independently deployable)

### Phase 0 — Foundation (no feature change)
- ESLint/Prettier + TS setup, zod, typed Supabase client (`supabase gen types`)
- `supabase/migrations` workflow, CI (lint/test/build), Playwright scaffold, `vercel.json` CSP
- Remove mock/dataService fork → single Supabase path; SQL seeds for dev
- **Exit:** green CI, clean build, existing functionality intact on Supabase

### Phase 1 — Data model + security base
- Migrations: full §5 schema (roles, profiles, sentences, assignments, recordings, validation_results, approvals, notifications, achievements, daily_progress, sync_queue, audit_logs) + all indexes/FKs/RLS
- Storage buckets (private) + policies; `_shared` Edge helpers (rbac, audit, rate-limit, turnstile)
- Migration script for existing rows (datasets → recordings)
- **Exit:** schema deployed, RLS verified with service-role/anon matrix tests

### Phase 2 — Auth & admin hardening
- `/admin/login` (hidden), rate-limited `admin-auth`, `AdminGuard`
- RBAC helpers, super_admin promotion path (SQL + guarded), role/permission seed
- Guest mode (optional), consent capture on first submit
- **Exit:** public login surface unchanged; admin only reachable via `/admin/login`

### Phase 3 — Recording pipeline (core)
- `submit-recording` + `validate-recording` Edge Functions, private signed upload
- Recorder hook upgrade (codec fallback, client pre-checks, offline queue + retry)
- Assignment queue (user gets one open assignment, unique per sentence)
- Live review queue on admin datasets page (replace current tables with typed queries)
- **Exit:** a user can record → upload → see status; admin can review; no public audio

### Phase 4 — AI validation & approval
- Validation worker (duration/VAD/STT/WER/duplicate), `validation_results`
- `approve-recording` flow: auto-approve vs reviewer, counters, storage bucket moves, audit
- Reviewer role enabled
- **Exit:** recordings pass/fail automatically; approved recordings visible in corpus

### Phase 5 — Gamification & notifications
- Achievements, leaderboard materialized view, daily progress, streaks, notifications
- Replace chart.js stats page with typed aggregate queries / realtime updates
- **Exit:** leaderboard + badges live on real data

### Phase 6 — Hugging Face sync (TTS + STT)
- `sync-datasets` Edge Function + pg_cron, sync queue, idempotency, backoff
- Admin **Sync Monitor** page + manual trigger + retry
- `metadata.csv` generation (TTS & STT variants)
- **Exit:** approved recordings flow automatically to both HF repos

### Phase 7 — Scale, QA & launch
- Pagination everywhere, cache/views for stats, load tests, observability (Sentry)
- Legal/consent/privacy pages, content moderation, reporting
- Public launch checklist + monitoring dashboard
- **Exit:** production launch with 1M-clip telemetry

---

## 13. Deliverables checklist

- [x] 1. Current Project Analysis (§1)
- [x] 2. Problems Found (§2)
- [x] 3. Recommended Improvements (§3)
- [x] 4. New Folder Structure (§4)
- [x] 5. New Database Schema (§5)
- [x] 6. Security Architecture (§6)
- [x] 7. API Architecture (§7)
- [x] 8. Audio Processing Architecture (§8)
- [x] 9. AI Validation Architecture (§9)
- [x] 10. Dataset Synchronization Architecture (§10)
- [x] 11. Deployment Architecture (§11)
- [x] 12. Development Roadmap (§12)

**Next step:** ratify decisions D1–D7 (§3), then begin **Phase 0** implementation.

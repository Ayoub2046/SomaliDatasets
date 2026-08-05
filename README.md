# CaawiyeAI · Somali Community Voice Platform 🎙️

Samee cod, dhig AI-da Af-Soomaaliga. CaawiyeAI waa madal xor ah oo lagu uruurinayo **codka
Af-Soomaaliga** si loo tababaro TTS, STT, Voice Assistants & LLM-yada Af-Soomaaliga.

Built with **React**, **Bootstrap 5**, **Chart.js**, **Supabase** and **PWA** — branded with the
CaawiyeAI logo palette (lime `#9efe05` on deep green `#141a15`).

---

## ✨ Features

- **Public** — Home (hero, goal tracker, mission, stats), Leaderboard (podium + table), Statistics (charts)
- **Auth** — Supabase Auth (Email / Google / GitHub) with a full in-browser **demo mode** fallback
- **Record** — read a Somali sentence → record → listen → submit (mediaRecorder, waveform, timer, noise slider)
- **Dashboard** — rank, submitted/accepted/rejected, badges (🥉🥈🥇💎), recent activity
- **Profile** — avatar, bio, country/language, contributions, edit
- **Admin dashboard** (full):
  - Overview with KPIs + Chart.js (status doughnut, daily line, gender doughnut, age bar)
  - **Datasets** — approve ✓ / reject ✗ / delete / listen for large table set
  - **Sentences** — add / edit / delete
  - **Users** — table with per-user counts + badges
  - **Analytics** — doughnut / bar / polar / radar charts
  - **Settings & Export** — export `metadata.csv`, export full CSV, "Push to Hugging Face" button
- **PWA** — installable, offline asset caching, custom launcher icons
- **Dark / light** theme with your logo colors

---

## 🚀 Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

### Demo mode (no setup needed)
With no `.env`, the app runs on an in-browser mock backend so you can explore **every** screen
including the admin dashboard with pre-seeded charts.

**Demo admin account:**
> email: `admin@caawiyeai.so` · password: `admin123`

Or register / Google / GitHub for a normal contributor account.

### Production build
```bash
npm run build
npm run preview
```

---

## 🔌 Connect Supabase (live mode)

1. Copy `.env.example` → `.env` and fill:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
2. Run the SQL in [`supabase/schema.sql`](supabase/schema.sql) (Supabase → SQL Editor).
   It creates `profiles`, `sentences`, `datasets`, RLS policies, a stats trigger, and the `audio` bucket.
3. Promote a user to admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
4. Set up Auth providers (Google / GitHub) in Supabase → Authentication.

When env vars are present the data layer (auth + postgres + storage) switches to Supabase automatically.

---

## 🤗 Hugging Face automation

A reference script is included at [`supabase/hf_sync.py`](supabase/hf_sync.py). In production you would
trigger it after review (or via an Edge Function / cron) to push the accepted clips into a HF dataset repo:

```
audio/                 # sound clips
metadata.csv           # transcripts
```

---

## 🗺️ Roadmap (Phases)

| Phase | Items |
|---|---|
| **1** | PWA, Login, Profile, sentence recording, Submit, Supabase DB  |
| **2** | Admin dashboard, review system, leaderboard, statistics, badges |
| **3** | Hugging Face auto-upload, AI quality check, duplicate detection, analytics |
| **4** | React Native app, Somali dialects (maay/maxaa), STT, translation, speaker ID |

---

## 🛠️ Tech stack

- **Frontend**: React 18, React Router, Bootstrap 5 + Bootstrap Icons, Chart.js (react-chartjs-2), Vite
- **PWA**: vite-plugin-pwa/service worker + web app manifest
- **Backend/data**: Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **Deploy**: Vercel (out-of-the-box Vite output)

## 🎨 Brand palette
`#9efe05` `#d1d2d4` `#93c542` `#a9e63c` `#141a15` `#224704` `#aaf228`
# Supplier Register

A mobile-first web app for an Australian civil construction site engineer to manage **suppliers**, **RFQs** (requests for quotation), **supplier quotations**, **quotation comparisons** and **historical price searches**. Data lives in the cloud (Supabase), so it is the same on your laptop and phone, and keeps working when your laptop is off.

**Stack:** Next.js 16 (App Router, TypeScript) · React 19 · Tailwind CSS 4 · Supabase (Postgres + Auth) · Zod · decimal.js · Vitest · hosted on Vercel.

---

## Contents

1. [How it works (architecture)](#1-how-it-works)
2. [Folder structure](#2-folder-structure)
3. [Set up Supabase](#3-set-up-supabase-database--login)
4. [Run locally](#4-run-locally)
5. [Tests](#5-tests)
6. [Put the code on GitHub](#6-put-the-code-on-github)
7. [Deploy to Vercel](#7-deploy-to-vercel)
8. [Open it on your phone](#8-open-it-on-your-phone)
9. [Costs and free tiers](#9-costs-and-free-tiers)
10. [Day-to-day tips and troubleshooting](#10-tips-and-troubleshooting)

---

## 1. How it works

```
 Phone / laptop browser
        │  HTTPS
        ▼
 Vercel (runs the Next.js app)
   ├─ src/proxy.ts ............ checks you are logged in on every request
   ├─ Pages (Server Components) read data
   └─ Server Actions .......... validate forms (Zod), calculate totals, save
        │  your login token
        ▼
 Supabase
   ├─ Auth .................... email + password login
   └─ Postgres ................ tables + Row Level Security (RLS)
```

Key decisions, in plain language:

- **One Next.js project, no separate backend.** Pages and the server code that saves data live together, so there is only one thing to deploy.
- **Server Actions do all writes.** When you submit a form, the browser sends the data to the server. The server checks you are logged in, validates every field with Zod, works out the totals, and only then writes to the database. Checks in the browser can be bypassed. These can't.
- **Three layers of security.** (1) `src/proxy.ts` sends anyone not logged in to `/login`. (2) Every page and action calls `requireUser()`. (3) The database's **Row Level Security** only returns rows whose `owner_id` matches the logged-in user. So even a bug in the app can't leak data to someone who isn't logged in.
- **Exact money maths.** Prices are calculated with `decimal.js`, never ordinary floating point, and stored in Postgres `numeric` columns. All GST rules live in one tested file, `src/lib/money.ts`. The database also checks that `total_inc_gst = total_ex_gst + gst_amount`.
- **Ready for more users later.** Every record has an `owner_id`. Adding teams or projects later means adding an `organisation_id` and widening the RLS policies. Nothing has to be rebuilt.
- **Cache Components.** Next.js serves an instant page "shell" (header, nav) and then streams in your data. Data is never cached, so you always see the latest saved records.

### GST rules

| GST treatment on the quote | Ex-GST total | GST | Inc-GST total |
|---|---|---|---|
| Prices exclude GST | qty × rate + delivery | 10% of ex-GST | ex + GST |
| Prices include GST | inc − GST | 1/11 of inc-GST | qty × rate + delivery |
| GST-free | qty × rate + delivery | $0.00 | same as ex-GST |

Totals are rounded to the cent, with half-cents rounded up (e.g. $1.005 → $1.01).

### When is a quote highlighted as "cheapest"?

Only when **every** quote on the RFQ covers the full scope, uses the RFQ's unit and quantity, and has the same GST basis (all taxable or all GST-free). Quotes are then ranked by **ex-GST total**. If they aren't like-for-like, the app explains why instead of guessing. Awarding is always your own decision ("Mark successful").

## 2. Folder structure

```
supplier-register/
├─ src/
│  ├─ app/                     Pages (each folder = a URL)
│  │  ├─ login/                Sign-in page + login/logout actions
│  │  └─ (app)/                Logged-in pages ("(app)" is not part of the URL)
│  │     ├─ page.tsx           Dashboard  →  /
│  │     ├─ suppliers/         Supplier register + actions.ts
│  │     ├─ rfqs/              RFQs, quotations, comparison + actions.ts
│  │     └─ prices/            Historical price search
│  ├─ components/              Reusable UI (forms, lists, nav, ui/ basics)
│  ├─ lib/
│  │  ├─ money.ts              ★ GST + totals (decimal maths)
│  │  ├─ comparison.ts         ★ "is this like-for-like?" rules
│  │  ├─ validation.ts         ★ Zod schemas for every form
│  │  ├─ auth-paths.ts         Which pages need a login
│  │  ├─ data/                 Database queries
│  │  └─ supabase/             Supabase connection helpers
│  ├─ types/database.ts        TypeScript description of the database
│  └─ proxy.ts                 Runs before every request (login check)
├─ supabase/
│  ├─ migrations/              ★ SQL that creates the database (tables, RLS)
│  └─ sample-data/             Optional demo records + removal script
├─ tests/
│  ├─ unit/                    Calculations, comparison, validation, auth rules
│  └─ integration/             Live database + RLS tests (optional)
├─ .env.example                Template for your settings
└─ package.json
```

## 3. Set up Supabase (database + login)

> You need to do these steps yourself. They require your own accounts.

### 3.1 Create the project

1. Go to <https://supabase.com> and sign up (GitHub sign-in is easiest).
2. Click **New project**.
   - **Name:** `supplier-register`
   - **Database password:** generate a strong one and save it in your password manager.
   - **Region:** **Sydney (ap-southeast-2)**, so it's fast from Australian sites.
   - Plan: **Free**.
3. Wait about 2 minutes for it to finish setting up.

### 3.2 Create the database tables (apply the migration)

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Open `supabase/migrations/20261111000001_initial_schema.sql` in VS Code, copy **all** of it, and paste it into the editor.
3. Click **Run**. You should see "Success. No rows returned".
4. Check **Table Editor**: you should see `profiles`, `rfqs`, `quotations`, `suppliers`, `supplier_categories` and `supplier_category_links`, each with an "RLS enabled" marker.

> Optional, for later: the Supabase CLI can apply future migrations for you. Run `npx supabase login`, then `npx supabase link --project-ref <ref>`, then `npx supabase db push`. Copy-pasting into the SQL Editor is fine for Version 1.

### 3.3 Lock down sign-ups and create your account

This is a private app, so nobody else should be able to register.

1. **Authentication → Sign In / Providers**: under the **Email** provider, keep Email enabled. Then turn **off "Allow new users to sign up"** and save.
2. **Authentication → Users → Add user → Create new user**
   - Enter your email and a strong password.
   - Tick **Auto Confirm User**.
3. That's your login for the app. When the user is created, a matching `profiles` row is added automatically.

### 3.4 Get your connection settings

**Project Settings → API Keys** (and **Data API** for the URL):

- **Project URL**, e.g. `https://abcdefghijkl.supabase.co`
- **Publishable key** (starts with `sb_publishable_`). Older projects call this the **anon** key, which also works.

**Do not** use the **secret** / **service_role** key anywhere. This app doesn't need it.

### 3.5 (Optional) Load sample data

To try the app with realistic demo records (6 suppliers, 4 RFQs, 5 quotations):

1. Create your user first (step 3.3).
2. In the **SQL Editor**, run `supabase/sample-data/load_sample_data.sql`.
3. When you're ready for real data, run `supabase/sample-data/remove_sample_data.sql`. It only deletes records whose notes start with `[SAMPLE]`.

The tidiest option is a second free Supabase project for development and testing, keeping your production project for real data only.

## 4. Run locally

Requires **Node.js 20.9+** (you have 24) and the steps in section 3.

```bash
cd supplier-register
cp .env.example .env.local      # then edit .env.local with your URL and key
npm install                     # only needed the first time
npm run dev
```

Open <http://localhost:3000> and sign in with the user from step 3.3.

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm run build` | Production build (what Vercel runs) |
| `npm test` | Run the automated tests |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Check code style |
| `npm run check` | Typecheck + lint + test in one go |

> **Dropbox note:** this project is inside Dropbox. `node_modules` and `.next` contain tens of thousands of files, which Dropbox will try to sync. In Dropbox preferences, choose **Selective Sync** and exclude those two folders, or move the project outside Dropbox. Git and GitHub become your backup.

## 5. Tests

```bash
npm test
```

- **Unit tests** (`tests/unit`): GST and total calculations, rounding, decimal precision, the cheapest-quote comparison rules, Zod validation, search-term handling, and the authentication boundary (which pages redirect to login, and open-redirect protection).
- **Live database tests** (`tests/integration/database.test.ts`): these check that anonymous visitors can't read or write any data, that logged-in users can create records, that inconsistent totals are rejected, that only one quote per RFQ can be awarded, and that price search works. They are **skipped** until you create `.env.test.local` with the `TEST_*` values shown in `.env.example`. Point it at a **development** project and run `npm run test:db`.

## 6. Put the code on GitHub

1. Create a free account at <https://github.com> if you don't have one.
2. Click **New repository**. Name it `supplier-register`, set it to **Private**, and don't add a README.
3. In the VS Code terminal, inside `supplier-register/`:

```bash
git add .
git commit -m "Supplier Register v1"
git branch -M main
git remote add origin https://github.com/<your-username>/supplier-register.git
git push -u origin main
```

`.env.local` is in `.gitignore`, so your keys are never uploaded.

## 7. Deploy to Vercel

1. Go to <https://vercel.com> → **Sign up with GitHub** (Hobby plan).
2. **Add New… → Project** → **Import** your `supplier-register` repository. You may need to grant Vercel access to the repo.
3. Vercel detects Next.js automatically. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key |

4. Click **Deploy** and wait 1–2 minutes. You'll get a URL like `https://supplier-register-xyz.vercel.app`.
5. In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to that Vercel URL.
6. From now on, every `git push` to `main` redeploys automatically.

If you change an environment variable in Vercel, redeploy so it takes effect: **Deployments → … → Redeploy**.

## 8. Open it on your phone

1. Turn off Wi-Fi to test on mobile data, then open your Vercel URL.
2. Sign in.
3. Add it to your home screen:
   - **iPhone (Safari):** Share → **Add to Home Screen**
   - **Android (Chrome):** ⋮ menu → **Add to Home screen** / **Install app**
4. It now opens full-screen like an app. Phone numbers are tap-to-call, and emails open your mail app.

**Acceptance check:** add a supplier on your laptop, refresh on your phone and it's there. Switch the laptop off, and the phone still works.

## 9. Costs and free tiers

Prices and limits change, so check each provider's pricing page. As of writing:

| Service | Free tier | Things to watch | Paid option |
|---|---|---|---|
| **Supabase** | 2 active projects, 500 MB database, 50k monthly active users | **Free projects pause after about 1 week with no activity.** The app then stops working until you click **Restore** in the dashboard. No downloadable backups on Free. | Pro, about US$25/month: no pausing, daily backups |
| **Vercel** | Hobby plan: free HTTPS, automatic deploys | Hobby is meant for **personal, non-commercial** use. Using it for paid work may need the Pro plan under their terms. | Pro, about US$20/month per user |
| **GitHub** | Unlimited private repositories | None for this app | Not needed |
| Custom domain (optional) | Not included | About A$15–30/year for a `.com.au` | Optional |

At a few hundred quotations per year, you'll use a tiny fraction of the free database limits. The main practical risks are **Supabase pausing** if you don't use the app for a week, and the **Vercel Hobby non-commercial clause**. If this becomes a daily work tool, budget around US$45/month for both Pro plans, or ask your employer to host it.

## 10. Tips and troubleshooting

- **"Missing Supabase settings"**: `.env.local` (locally) or the Vercel environment variables aren't set. In Vercel, add them and then redeploy.
- **Can't log in**: confirm the user exists and was **auto-confirmed** in Supabase → Authentication → Users. Passwords can be reset from that screen too.
- **App suddenly shows errors after a quiet week**: the Supabase free project has probably paused. Open the dashboard and click **Restore project**.
- **Adding a supplier category**: run `insert into supplier_categories (name, sort_order) values ('Landscaping', 130);` in the SQL Editor.
- **Backing up your data**: in Supabase → Table Editor, open each table and choose **Export → CSV**. Do this every so often while on the Free plan.
- **Regenerating database types** after changing the schema: `npx supabase gen types typescript --project-id <ref> > src/types/database.ts`

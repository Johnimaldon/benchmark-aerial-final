# Supabase setup (one-time)

This turns on real, cross-device data storage: projects and flights now live in
your Supabase project instead of only in your own browser's storage. Until you
do this, the site keeps working exactly as it did before (admin passcode
`AMDG`, everything saved only in the browser you're using).

## 1. Run the schema

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Copy the entire contents of `supabase/migrations/0001_init.sql` from this
   repo, paste it in, and click **Run**.
3. You should see "Success. No rows returned." This creates three tables
   (`sites`, `flights`, `share_links`), locks them down with Row Level
   Security so only you can read/write them directly, and adds a private
   storage bucket for future photo uploads.

You can re-run this script safely later if a future update adds to it.

## 2. Create your operator login

This replaces the `AMDG` passcode with a real account only you know the
password to.

1. In Supabase, go to **Authentication** → **Users** → **Add user**.
2. Enter your email and a password. Leave "Auto Confirm User" checked.
3. That's your sign-in for the "Admin sign-in" screen going forward.

(You can add more operator accounts the same way later if someone else on
your team needs access — every account can see all projects for now; per-user
project ownership can be added later if you need it.)

## 3. Get your API keys

1. In Supabase, go to **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon / public** key (NOT the
   `service_role` key — that one must never be used in a browser app).

## 4. Set the environment variables

**On Vercel** (for the live site):
1. Go to your project on vercel.com → **Settings** → **Environment Variables**.
2. Add:
   - `VITE_SUPABASE_URL` = the Project URL from step 3
   - `VITE_SUPABASE_ANON_KEY` = the anon key from step 3
3. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the build picks them up.

**For local development** (optional, only if you run the site on your own
machine):
1. Copy `.env.example` to `.env.local` inside the `wisconsin-aerial` folder.
2. Fill in the same two values.
3. `.env.local` is already git-ignored — it will never get committed or
   pushed.

## What changes once this is on

- "Admin sign-in" becomes an email + password form (your Supabase user).
- Projects and flights are stored in Supabase, so they show up the same way
  no matter which computer or browser you sign in from.
- The client "project access code" flow keeps working the same way for your
  clients — it now looks the code up in Supabase instead of the current
  browser's storage, which is what makes it actually usable across devices.
- If you don't set these variables, none of the above changes — the site
  quietly falls back to the original passcode + browser-storage behavior.

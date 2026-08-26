# Job Application System

A personal dashboard that tracks job listings, generates a tailored CV and
cover letter as PDFs, and follows each application through to an offer.

Stack: Next.js (Pages Router) + Tailwind · Supabase (DB, Auth, Edge Functions) · Vercel

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env example and fill in your Supabase project values:
   ```bash
   cp .env.example .env.local
   ```
   Get these from **Supabase → Project Settings → API**.

3. In Supabase, add the resume-related columns to your `users` table (run in
   the SQL Editor):
   ```sql
   alter table users
     add column if not exists linkedin text,
     add column if not exists objective text,
     add column if not exists experience_text text,
     add column if not exists education_text text,
     add column if not exists skills_text text,
     add column if not exists projects_text text;
   ```

4. In **Authentication → URL Configuration**, add both of these as allowed
   redirect URLs (so login works locally and after you deploy):
   ```
   http://localhost:3000/auth/callback
   https://your-vercel-domain.vercel.app/auth/callback
   ```

5. Run locally:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the same two env vars from `.env.local` in Vercel's project settings.
4. Deploy.

## Filling in your resume data

Don't edit the source code with your personal details. Instead, once the app
is running, go to **Profile** and fill in your contact info and resume
sections there — it's saved to your private Supabase database, not to this
repository. The Profile page explains the exact text format each section
expects (see `utils/resumeParser.js` for the full spec if you want details).

## Notes on privacy

- `.env.local` is git-ignored — never commit real Supabase keys.
- No personal data (name, phone, address, resume content) lives in this
  codebase. It's entered through the app and stored in your database.
- The `jobs` table is shared/global by design (one scraper feeds everyone
  using this deployment); `applications` are scoped to your user id.

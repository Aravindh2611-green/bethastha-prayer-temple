# Bethastha Prayer Temple

A bilingual, responsive church website for Bethastha Prayer Temple in Madhukkur, Tamil Nadu. The public website runs without a backend; Supabase enables secure sign-in and shared publishing for the `/admin` dashboard.

## Run locally

```sh
npm install
npm run dev
npm run build
```

The site defaults to Tamil. The language switcher remembers the visitor's choice in local storage. All dates and the live clock use `Asia/Kolkata`; the church schedule and Gregorian festival dates are calculated at runtime.

## Supabase shared administration

1. Create or open a Supabase project.
2. In **Project Settings → API**, copy the Project URL and the `anon`/publishable public key. The app reads this public key from `VITE_SUPABASE_ANON_KEY`; do not use a `service_role` or secret key in the frontend.
3. Copy `.env.example` to `.env.local` and set:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

4. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the tables and policies described below and is safe to rerun to restore the expected grants and RLS policies.
5. In Supabase Authentication, create the administrator account. Disable public sign-ups if accounts should only be provisioned by a project owner.
6. Resolve the admin account's actual UUID from Supabase Auth and insert it into the allow-list. For example, to grant the account whose email is `ADMIN_EMAIL`, run:

   ```sql
   do $$
   declare
     target_user_id uuid;
   begin
     select id into strict target_user_id
     from auth.users
     where lower(email) = lower('ADMIN_EMAIL');

     insert into public.admin_users (user_id)
     values (target_user_id)
     on conflict (user_id) do nothing;
   exception
     when no_data_found then
       raise exception 'No Supabase Auth user found for ADMIN_EMAIL';
     when too_many_rows then
       raise exception 'More than one Supabase Auth user matched ADMIN_EMAIL';
   end;
   $$;
   ```

   Replace `ADMIN_EMAIL` with the exact email for the Supabase Auth account. This SQL looks up and inserts Supabase's UUID; do not make up or manually derive a UUID. To verify the account before granting access, run `select id, email from auth.users where lower(email) = lower('ADMIN_EMAIL');`. Do not grant membership to an account you do not control.
7. Restart Vite after setting or changing environment variables, then open `/admin` and sign in with the allow-listed account.

If `/admin` shows setup guidance, at least one of the two Vite variables is missing from the running build. Confirm `.env.local` is in the project root and contains both values, then restart Vite. For deployment, configure both variables in the hosting provider and redeploy. With valid configuration, `/admin` shows Supabase email/password sign-in and only enables management for an authenticated account listed in `admin_users`. The setup guidance does not disable the public website.

The frontend expects these database objects:

- `public.admin_users`: `user_id uuid` referencing `auth.users(id)` and `created_at timestamptz`. Membership is checked against the signed-in user's Auth UUID.
- `public.site_config`: `id text` (the public row is `public`), `published jsonb`, `updated_at timestamptz`, and `updated_by uuid`. Public/anonymous clients can select only the `id` and `published` columns of the `public` row. Publishing is performed by `publish_site_config(jsonb)`, which checks the authenticated user's admin membership; clients have no direct table write grants.
- `public.site_drafts`: `id text` (the admin draft row is `admin`), `content jsonb`, `updated_at timestamptz`, `updated_by uuid`, and `is_published boolean`. Only allow-listed admins can read or manage drafts.

RLS is enabled on all three tables. There is no public admin-registration flow. The publish RPC independently checks `admin_users`; browser-side access checks are not the security boundary. **Save draft** keeps the current dashboard configuration private, while **Publish changes** updates the public `site_config.published` value. Event-level drafts are excluded from published content. If the schema was already installed, rerun the updated `supabase/schema.sql` to restore the expected columns, grants, RLS policies, and publish function. Without Supabase variables, the public website continues using its built-in content.

### Troubleshooting Supabase

- **Setup guidance keeps appearing:** Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present and non-empty in the project-root `.env.local`. The latter accepts the Supabase anon/public or publishable key. Restart Vite after edits; for a hosted site, update the deployment environment and redeploy. Do not put a service-role or secret key in any `VITE_` variable.
- **Sign-in fails:** Confirm the account exists and is enabled in Supabase Authentication, the email/password are correct, and the URL/key belong to the same project. If email confirmation is required, complete it first. Sign-in alone does not grant admin access.
- **Schema or dashboard data errors:** The dashboard reports the affected table/column and Supabase error code when available. Run the full current `supabase/schema.sql` in the SQL Editor and inspect its output for errors. Confirm the `site_config`, `admin_users`, and `site_drafts` tables, RLS policies, and `publish_site_config` function exist. If Supabase reports that a table is not in the schema cache after the migration, wait briefly and retry; do not disable RLS.
- **Dashboard reports `PGRST205` for `public.admin_users`:** Run the full current `supabase/schema.sql` in the SQL Editor for the same project as `VITE_SUPABASE_URL`. It creates `admin_users(user_id uuid primary key references auth.users(id), created_at timestamptz)`, limits membership reads to the authenticated user's own row, and reloads the PostgREST schema cache. Then explicitly allow-list the intended user with the UUID lookup SQL in the setup steps. The schema migration does not make any account an administrator automatically.
- **Homepage reports `PGRST205` for `public.site_config`:** The project API cannot find the published-settings table in its schema cache. Run the full current `supabase/schema.sql` in that project's SQL Editor. The script creates and seeds the public row, grants anonymous `SELECT`, applies the policy restricting reads to `id = 'public'`, and requests a PostgREST schema reload. Wait briefly, then use **Retry** on the homepage. If it persists, verify the SQL Editor was opened for the same project as `VITE_SUPABASE_URL` and that the script completed without errors.
- **Signed in but shown as unauthorized:** Confirm the email is present under **Authentication → Users** in this same project. Run the email-based SQL above after replacing `ADMIN_EMAIL` with the account's email; it resolves the actual UUID from `auth.users`. Verify the SQL succeeded, then sign out and sign in again. Sign-in alone does not grant admin access.
- **Publish or draft operations are denied:** Check the Supabase API/database logs for RLS or RPC errors. Confirm the current user is still in `admin_users` and the schema policies and `publish_site_config` function have been applied. Do not weaken or disable RLS to work around an authorization error.

The admin dashboard can manage:

- Automatic Gregorian festival dates and themes (including Palm Sunday, Maundy Thursday, Good Friday, Easter, Pentecost, Christmas, and New Year), custom festival dates and theme activation windows, plus manual overrides with optional expiry.
- Bilingual theme headings, subtitles, scripture, announcements, colors, and image URLs.
- Bilingual church events with category, location, featured status, weekly/monthly/yearly recurrence, publication status, image, accent, scripture, announcements, and optional automatic theme activation.
- Gallery image URLs and captions, plus default-image visibility.
- Bible verses, worship times, and the optional online youth prayer link.
- Bilingual church address, nearby landmarks, telephone, and registration details. The map link points to nearby Jamaliya Super Market as a navigation landmark, not as the exact church location.

The public calendar, upcoming-event lists, and “Seasons of faith” section all read from the same date-range event generator. Movable Christian occasions are calculated from Gregorian Easter; church-specific anniversaries, baptisms, revival meetings, and special services appear only after an administrator adds them. Selecting **View in Calendar** navigates to the event’s exact date. Psalm 122:1 is also kept as a permanent homepage verse, separate from seasonal scripture.

Only add image URLs for images the church has permission to use. The gallery and festival photography in the default site are remote Unsplash image URLs; replace them with church-approved images when available.

## Deployment

### Vercel

1. Import the existing GitHub repository into Vercel.
2. Set the build command to `npm run build` and the output directory to `dist` (Vite defaults).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables for deployments that need shared administration. Use only a public anon/publishable key.
4. Redeploy after setting or changing environment variables.

The included `index.html` uses the SPA entry point. `/admin` is handled by the same React application; ensure your hosting platform rewrites unknown paths to `index.html` if its Vite SPA fallback is not enabled by default.

### GitHub

Commit and push through your usual Git workflow. This project does not push or deploy changes automatically.

## Project structure

- `src/data/content.js` — centralized English/Tamil copy, theme presets, and defaults.
- `src/lib/church.js` — IST date helpers, recurring schedules, fasting reminder, and Gregorian festival calculations.
- `src/components/SiteSections.jsx` — shared public page components.
- `src/pages/AdminPage.jsx` — authenticated draft and publish dashboard.
- `src/lib/supabase.js` — optional Supabase client and published configuration access.
- `supabase/schema.sql` — database schema and Row Level Security policies.

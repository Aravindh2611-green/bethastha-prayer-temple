begin;

create table if not exists public.site_config (
  id text primary key check (id = 'public'),
  published jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_drafts (
  id text primary key check (id = 'admin'),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  is_published boolean not null default false
);

alter table public.site_config
  add column if not exists published jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users (id);

alter table public.admin_users
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

alter table public.site_drafts
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users (id),
  add column if not exists is_published boolean not null default false;

alter table public.site_config enable row level security;
alter table public.admin_users enable row level security;
alter table public.site_drafts enable row level security;

revoke all on table public.site_config, public.admin_users, public.site_drafts
  from public, anon, authenticated;

revoke select (id, published, updated_at, updated_by),
  insert (id, published, updated_at, updated_by),
  update (id, published, updated_at, updated_by),
  references (id, published, updated_at, updated_by)
  on table public.site_config from public, anon, authenticated;
revoke select (user_id, created_at),
  insert (user_id, created_at),
  update (user_id, created_at),
  references (user_id, created_at)
  on table public.admin_users from public, anon, authenticated;
revoke select (id, content, updated_at, updated_by, is_published),
  insert (id, content, updated_at, updated_by, is_published),
  update (id, content, updated_at, updated_by, is_published),
  references (id, content, updated_at, updated_by, is_published)
  on table public.site_drafts from public, anon, authenticated;

grant select (id, published) on table public.site_config to anon, authenticated;
grant select on table public.admin_users to authenticated;
grant select, insert, update, delete on table public.site_drafts to authenticated;

drop policy if exists "Published configuration is public" on public.site_config;
drop policy if exists "Only public configuration row is readable" on public.site_config;
drop policy if exists "Admins can publish configuration" on public.site_config;
drop policy if exists "Admins can update configuration" on public.site_config;

create policy "Published configuration is public"
  on public.site_config as permissive for select
  to anon, authenticated
  using (id = 'public');

create policy "Only public configuration row is readable"
  on public.site_config as restrictive for select
  to anon, authenticated
  using (id = 'public');

drop policy if exists "Admins can read their own membership" on public.admin_users;
drop policy if exists "Only own administrator membership is readable" on public.admin_users;

create policy "Admins can read their own membership"
  on public.admin_users as permissive for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Only own administrator membership is readable"
  on public.admin_users as restrictive for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins can manage website drafts" on public.site_drafts;
drop policy if exists "Only administrators can manage website drafts" on public.site_drafts;

create policy "Admins can manage website drafts"
  on public.site_drafts as permissive for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );

create policy "Only administrators can manage website drafts"
  on public.site_drafts as restrictive for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = (select auth.uid())
    )
  );

create or replace function public.publish_site_config(p_published jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  ) then
    raise exception 'Administrator access required';
  end if;

  insert into public.site_config (id, published, updated_at, updated_by)
  values ('public', p_published, now(), (select auth.uid()))
  on conflict (id) do update
    set published = excluded.published,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;

  update public.site_drafts
  set is_published = true
  where id = 'admin';
end;
$$;

revoke all on function public.publish_site_config(jsonb) from public, anon, authenticated;
grant execute on function public.publish_site_config(jsonb) to authenticated;

insert into public.site_config (id, published)
values ('public', '{}'::jsonb)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

commit;

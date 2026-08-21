create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocabulary_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  item_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  transcript text not null,
  source_type text not null default 'transcript',
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('listening', 'speaking')),
  results jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.conversations enable row level security;
alter table public.practice_sessions enable row level security;

revoke all on public.profiles, public.vocabulary_items, public.conversations, public.practice_sessions from anon;
grant select, insert, update, delete on public.profiles, public.vocabulary_items, public.conversations, public.practice_sessions to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "vocabulary_select_own" on public.vocabulary_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "vocabulary_insert_own" on public.vocabulary_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vocabulary_update_own" on public.vocabulary_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "vocabulary_delete_own" on public.vocabulary_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "conversations_select_own" on public.conversations for select to authenticated using ((select auth.uid()) = user_id);
create policy "conversations_insert_own" on public.conversations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "conversations_update_own" on public.conversations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "conversations_delete_own" on public.conversations for delete to authenticated using ((select auth.uid()) = user_id);

create policy "practice_select_own" on public.practice_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "practice_insert_own" on public.practice_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "practice_update_own" on public.practice_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "practice_delete_own" on public.practice_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists vocabulary_items_user_idx on public.vocabulary_items(user_id);
create index if not exists conversations_user_idx on public.conversations(user_id);
create index if not exists practice_sessions_user_idx on public.practice_sessions(user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

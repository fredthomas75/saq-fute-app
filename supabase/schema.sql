-- SAQ Fute — Supabase schema for user data sync
-- Run this in the Supabase SQL Editor after creating the project

create extension if not exists "uuid-ossp";

-- ============================================================
-- FAVORITES
-- ============================================================
create table public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  wine_id text not null,
  name text not null,
  type text not null,
  price numeric not null,
  country text not null,
  deal_score numeric,
  deal_label text,
  saq_url text,
  grapes text[],
  appellation text,
  region text,
  is_organic boolean default false,
  on_sale boolean default false,
  coeur_badge text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, wine_id)
);

alter table public.favorites enable row level security;
create policy "Users manage own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CELLAR
-- ============================================================
create table public.cellar (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  wine_id text not null,
  name text not null,
  type text not null,
  price numeric not null,
  country text not null,
  quantity integer default 1 not null,
  date_added bigint not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, wine_id)
);

alter table public.cellar enable row level security;
create policy "Users manage own cellar"
  on public.cellar for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- WISHLIST
-- ============================================================
create table public.wishlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  wine_id text not null,
  name text not null,
  type text not null,
  price numeric not null,
  country text not null,
  deal_score numeric,
  deal_label text,
  saq_url text,
  grapes text[],
  appellation text,
  region text,
  is_organic boolean default false,
  on_sale boolean default false,
  coeur_badge text,
  date_added bigint not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, wine_id)
);

alter table public.wishlist enable row level security;
create policy "Users manage own wishlist"
  on public.wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- WINE NOTES
-- ============================================================
create table public.wine_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  wine_id text not null,
  wine_name text not null,
  note text not null,
  rating smallint check (rating >= 1 and rating <= 5),
  date_modified bigint not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, wine_id)
);

alter table public.wine_notes enable row level security;
create policy "Users manage own notes"
  on public.wine_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- USER SETTINGS
-- ============================================================
create table public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  language text default 'fr' not null,
  theme text default 'auto' not null,
  notifications boolean default true not null,
  vip_mode boolean default false not null,
  updated_at timestamptz default now() not null
);

alter table public.user_settings enable row level security;
create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- AUTO updated_at TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger favorites_updated_at before update on public.favorites
  for each row execute function public.handle_updated_at();
create trigger cellar_updated_at before update on public.cellar
  for each row execute function public.handle_updated_at();
create trigger wishlist_updated_at before update on public.wishlist
  for each row execute function public.handle_updated_at();
create trigger wine_notes_updated_at before update on public.wine_notes
  for each row execute function public.handle_updated_at();
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.handle_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_favorites_user on public.favorites(user_id);
create index idx_cellar_user on public.cellar(user_id);
create index idx_wishlist_user on public.wishlist(user_id);
create index idx_wine_notes_user on public.wine_notes(user_id);

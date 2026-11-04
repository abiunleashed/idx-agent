-- Sepadan: initial database schema (Supabase / Postgres)
--
-- Rules enforced here, not just in the app:
--   * one review per user per car            (unique constraint)
--   * one like/dislike per user per car      (primary key)
--   * users can only write/edit their own rows (row level security)
--   * hidden (moderated) reviews are not publicly readable

-- ---------------------------------------------------------------------------
-- Profiles (one per signed-in user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  city         text,
  is_moderator boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Pengguna'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_moderator from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.cars (
  id            text primary key,              -- e.g. 'toyota-innova-zenix'
  brand         text not null,
  model         text not null,
  body_type     text not null check (body_type in ('mpv','suv','lcgc','hatchback','sedan','ev')),
  generation    text not null,
  price_min_idr bigint not null check (price_min_idr > 0),
  price_max_idr bigint not null check (price_max_idr >= price_min_idr),
  price_source  text,                          -- where/when the new-car price came from
  tint          text not null default '#56606E',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Owner reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  car_id            text not null references public.cars (id),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  model_year        int  not null check (model_year between 1980 and 2100),
  variant           text,
  price_paid_idr    bigint not null check (price_paid_idr between 10000000 and 50000000000),
  condition         text not null check (condition in ('new','used')),
  city              text,
  months_owned      int  not null default 0 check (months_owned between 0 and 600),
  overall           int  not null check (overall between 1 and 5),
  build_quality     int  not null check (build_quality between 1 and 5),
  comfort           int  not null check (comfort between 1 and 5),
  fuel              int  not null check (fuel between 1 and 5),
  after_sales       int  not null check (after_sales between 1 and 5),
  worth_it          text not null check (worth_it in ('yes','unsure','no')),
  would_buy_again   boolean not null,
  pros              text[] not null default '{}',
  cons              text[] not null default '{}',
  body              text not null check (char_length(body) between 30 and 5000),
  status            text not null default 'published' check (status in ('published','hidden')),
  verified_purchase boolean not null default false,   -- set only by moderators
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, car_id)
);

create index reviews_car_idx on public.reviews (car_id) where status = 'published';

create table public.review_photos (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null,                 -- path inside the 'review-photos' bucket
  caption      text check (char_length(caption) <= 200),
  sentiment    text not null check (sentiment in ('positive','negative')),
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Quick like / dislike (anyone signed in, separate from owner scores)
-- ---------------------------------------------------------------------------
create table public.car_votes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  car_id     text not null references public.cars (id),
  vote       text not null check (vote in ('up','down')),
  created_at timestamptz not null default now(),
  primary key (user_id, car_id)
);

-- ---------------------------------------------------------------------------
-- Reports ("this review is fake / abusive")
-- ---------------------------------------------------------------------------
create table public.review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null check (reason in ('fake','abusive','personal_data','spam','other')),
  note        text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (review_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- Per-car summary used by the feed and the car page
-- ---------------------------------------------------------------------------
create view public.car_stats with (security_invoker = true) as
select
  c.id as car_id,
  count(r.id)                                              as review_count,
  avg(r.overall)                                           as avg_overall,
  avg((r.worth_it = 'yes')::int)                           as worth_yes,
  avg(r.would_buy_again::int)                              as buy_again,
  avg(r.price_paid_idr)                                    as avg_paid_idr,
  min(r.price_paid_idr)                                    as min_paid_idr,
  max(r.price_paid_idr)                                    as max_paid_idr,
  avg(r.build_quality) as avg_build_quality,
  avg(r.comfort)       as avg_comfort,
  avg(r.fuel)          as avg_fuel,
  avg(r.after_sales)   as avg_after_sales,
  (select count(*) from public.car_votes v where v.car_id = c.id and v.vote = 'up')   as likes,
  (select count(*) from public.car_votes v where v.car_id = c.id and v.vote = 'down') as dislikes
from public.cars c
left join public.reviews r on r.car_id = c.id and r.status = 'published'
group by c.id;

-- ---------------------------------------------------------------------------
-- Fields only moderators may change. Without this, an owner could un-hide a
-- moderated review (or mark it verified) simply by editing it.
-- ---------------------------------------------------------------------------
create function public.protect_review_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  -- auth.uid() is null for admin/server connections (SQL editor, service role): allow those.
  if auth.uid() is not null and not public.is_moderator() then
    new.status            := old.status;
    new.verified_purchase := old.verified_purchase;
    new.user_id           := old.user_id;
    new.car_id            := old.car_id;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger reviews_protect_fields before update on public.reviews
  for each row execute function public.protect_review_fields();

create function public.protect_profile_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  -- auth.uid() is null for admin/server connections (SQL editor, service role): allow those.
  if auth.uid() is not null and not public.is_moderator() then
    new.is_moderator := old.is_moderator;
  end if;
  return new;
end $$;

create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.cars           enable row level security;
alter table public.reviews        enable row level security;
alter table public.review_photos  enable row level security;
alter table public.car_votes      enable row level security;
alter table public.review_reports enable row level security;

create policy "profiles readable by all"  on public.profiles for select using (true);
create policy "update own profile"        on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "cars readable by all"      on public.cars for select using (true);

create policy "published reviews readable" on public.reviews for select
  using (status = 'published' or user_id = auth.uid() or public.is_moderator());
create policy "insert own review" on public.reviews for insert
  with check (user_id = auth.uid() and status = 'published' and verified_purchase = false);
create policy "update own review" on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own review" on public.reviews for delete using (user_id = auth.uid());
create policy "moderators manage reviews" on public.reviews for update
  using (public.is_moderator()) with check (public.is_moderator());

create policy "photos readable with review" on public.review_photos for select
  using (exists (select 1 from public.reviews r where r.id = review_id
                 and (r.status = 'published' or r.user_id = auth.uid() or public.is_moderator())));
create policy "manage photos of own review" on public.review_photos for all
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

create policy "votes readable by all" on public.car_votes for select using (true);
create policy "manage own vote"       on public.car_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "file a report"           on public.review_reports for insert with check (reporter_id = auth.uid());
create policy "moderators read reports" on public.review_reports for select using (public.is_moderator());
create policy "moderators resolve"      on public.review_reports for update using (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Photo storage: users upload into a folder named after their user id
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- TBUZZ DATING ECOSYSTEM — "SUNLIT GALLERY"
-- Complete migration: tables, RLS, indexes, RPCs
-- ============================================================================

-- ─── 1. DATING PROFILES ────────────────────────────────────────────────────
create table if not exists public.dating_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  media         text[] not null default '{}',
  vitals        jsonb  not null default '{}',
  prompts       jsonb  not null default '[]',
  is_active     boolean not null default true,
  is_verified   boolean not null default false,
  university_id uuid references public.universities(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint dating_profiles_user_unique unique(user_id),
  constraint dating_profiles_media_count check (cardinality(media) <= 5)
);

create index idx_dating_profiles_user on public.dating_profiles(user_id);
create index idx_dating_profiles_active on public.dating_profiles(is_active) where is_active = true;
create index idx_dating_profiles_university on public.dating_profiles(university_id);

-- ─── 2. DATING LIKES ───────────────────────────────────────────────────────
create table if not exists public.dating_likes (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references auth.users(id) on delete cascade,
  receiver_id   uuid not null references auth.users(id) on delete cascade,
  content_liked text not null,           -- e.g. "photo:2" or "prompt:1"
  comment       text not null,           -- mandatory icebreaker
  created_at    timestamptz not null default now(),
  constraint dating_likes_no_self check (sender_id <> receiver_id),
  constraint dating_likes_unique unique (sender_id, receiver_id)
);

create index idx_dating_likes_sender on public.dating_likes(sender_id);
create index idx_dating_likes_receiver on public.dating_likes(receiver_id);
create index idx_dating_likes_created on public.dating_likes(created_at);

-- ─── 3. SECRET CRUSHES ─────────────────────────────────────────────────────
create table if not exists public.secret_crushes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  crush_username  text not null,
  created_at      timestamptz not null default now(),
  constraint secret_crushes_no_dupe unique (user_id, crush_username),
  constraint secret_crushes_max_3 check (true)  -- enforced via trigger below
);

create index idx_secret_crushes_user on public.secret_crushes(user_id);
create index idx_secret_crushes_username on public.secret_crushes(crush_username);

-- ─── 4. DATING MATCHES (denormalized for fast lookup) ──────────────────────
create table if not exists public.dating_matches (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references auth.users(id) on delete cascade,
  user_b          uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id),
  matched_via     text not null default 'like',  -- 'like' or 'secret_crush'
  created_at      timestamptz not null default now(),
  constraint dating_matches_ordered check (user_a < user_b),
  constraint dating_matches_unique unique (user_a, user_b)
);

create index idx_dating_matches_users on public.dating_matches(user_a, user_b);

-- ============================================================================
-- ROW LEVEL SECURITY — DOUBLE-BLIND POLICIES
-- ============================================================================

alter table public.dating_profiles enable row level security;
alter table public.dating_likes enable row level security;
alter table public.secret_crushes enable row level security;
alter table public.dating_matches enable row level security;

-- ─── DATING PROFILES RLS ───────────────────────────────────────────────────
-- Users can read all active dating profiles (for discovery feed)
create policy "Anyone can read active dating profiles"
  on public.dating_profiles for select
  using (is_active = true);

-- Users can only insert/update/delete their own profile
create policy "Users can insert own dating profile"
  on public.dating_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own dating profile"
  on public.dating_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own dating profile"
  on public.dating_profiles for delete
  using (auth.uid() = user_id);

-- ─── DATING LIKES RLS (DOUBLE-BLIND) ──────────────────────────────────────
-- Senders can see their own sent likes
create policy "Users can read own sent likes"
  on public.dating_likes for select
  using (auth.uid() = sender_id);

-- DOUBLE-BLIND: receivers CANNOT see incoming likes directly
-- (matches are revealed only through the match RPC)

-- Users can insert likes (rate-limited by RPC)
create policy "Users can send dating likes"
  on public.dating_likes for insert
  with check (auth.uid() = sender_id);

-- ─── SECRET CRUSHES RLS (FULLY PRIVATE) ───────────────────────────────────
-- Only the owner can see their secret crushes
create policy "Users can read own secret crushes"
  on public.secret_crushes for select
  using (auth.uid() = user_id);

create policy "Users can insert own secret crushes"
  on public.secret_crushes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own secret crushes"
  on public.secret_crushes for delete
  using (auth.uid() = user_id);

-- ─── DATING MATCHES RLS ───────────────────────────────────────────────────
-- Both matched users can read their own matches
create policy "Users can read own matches"
  on public.dating_matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ============================================================================
-- TRIGGER: Enforce max 3 secret crushes per user
-- ============================================================================
create or replace function enforce_max_secret_crushes()
returns trigger as $$
begin
  if (select count(*) from public.secret_crushes where user_id = NEW.user_id) >= 3 then
    raise exception 'Maximum of 3 secret crushes allowed';
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_max_secret_crushes
  before insert on public.secret_crushes
  for each row execute function enforce_max_secret_crushes();

-- ============================================================================
-- TRIGGER: Auto-update updated_at on dating_profiles
-- ============================================================================
create or replace function update_dating_profile_timestamp()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_dating_profile_updated
  before update on public.dating_profiles
  for each row execute function update_dating_profile_timestamp();

-- ============================================================================
-- RPC: 4-LIKE RATE LIMITER + LIKE INSERTION
-- Returns: { success: bool, match: bool, conversation_id?: uuid }
-- ============================================================================
create or replace function public.send_dating_like(
  p_receiver_id uuid,
  p_content_liked text,
  p_comment text
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_sender_id   uuid := auth.uid();
  v_likes_today int;
  v_is_mutual   boolean := false;
  v_match_id    uuid;
  v_conv_id     uuid;
  v_user_a      uuid;
  v_user_b      uuid;
begin
  -- Validate
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_sender_id = p_receiver_id then
    raise exception 'Cannot like yourself';
  end if;

  -- Check 4-like daily limit (UTC midnight reset)
  select count(*) into v_likes_today
  from public.dating_likes
  where sender_id = v_sender_id
    and created_at >= date_trunc('day', now() at time zone 'UTC');

  if v_likes_today >= 4 then
    return jsonb_build_object(
      'success', false,
      'error', 'daily_limit_reached',
      'remaining', 0
    );
  end if;

  -- Check for existing like (no double-likes)
  if exists (
    select 1 from public.dating_likes
    where sender_id = v_sender_id and receiver_id = p_receiver_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'already_liked'
    );
  end if;

  -- Insert the like
  insert into public.dating_likes (sender_id, receiver_id, content_liked, comment)
  values (v_sender_id, p_receiver_id, p_content_liked, p_comment);

  -- Check for mutual like (reciprocal)
  if exists (
    select 1 from public.dating_likes
    where sender_id = p_receiver_id and receiver_id = v_sender_id
  ) then
    v_is_mutual := true;
  end if;

  -- If mutual, create match + conversation
  if v_is_mutual then
    -- Ensure consistent ordering for the unique constraint
    if v_sender_id < p_receiver_id then
      v_user_a := v_sender_id;
      v_user_b := p_receiver_id;
    else
      v_user_a := p_receiver_id;
      v_user_b := v_sender_id;
    end if;

    -- Check if match already exists
    select id, conversation_id into v_match_id, v_conv_id
    from public.dating_matches
    where user_a = v_user_a and user_b = v_user_b;

    if v_match_id is null then
      -- Create conversation
      insert into public.conversations (id, created_at, updated_at)
      values (gen_random_uuid(), now(), now())
      returning id into v_conv_id;

      -- Add both participants
      insert into public.conversation_participants (conversation_id, user_id)
      values (v_conv_id, v_sender_id), (v_conv_id, p_receiver_id);

      -- Create the match record
      insert into public.dating_matches (user_a, user_b, conversation_id, matched_via)
      values (v_user_a, v_user_b, v_conv_id, 'like');
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'match', v_is_mutual,
    'conversation_id', v_conv_id,
    'remaining', 4 - v_likes_today - 1
  );
end;
$$;

-- ============================================================================
-- RPC: CHECK SECRET CRUSH MATCH
-- Called when a secret crush is added — checks if the other user also crushed
-- ============================================================================
create or replace function public.add_secret_crush(
  p_crush_username text
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_user_id       uuid := auth.uid();
  v_crush_user_id uuid;
  v_crush_count   int;
  v_is_mutual     boolean := false;
  v_user_a        uuid;
  v_user_b        uuid;
  v_conv_id       uuid;
  v_match_id      uuid;
  v_my_display    text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Resolve the crush username to a user_id
  select p.user_id into v_crush_user_id
  from public.profiles p
  where lower(p.display_name) = lower(p_crush_username)
  limit 1;

  if v_crush_user_id is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  if v_crush_user_id = v_user_id then
    return jsonb_build_object('success', false, 'error', 'cannot_crush_self');
  end if;

  -- Check current crush count
  select count(*) into v_crush_count
  from public.secret_crushes
  where user_id = v_user_id;

  if v_crush_count >= 3 then
    return jsonb_build_object('success', false, 'error', 'max_crushes_reached');
  end if;

  -- Check if already crushed
  if exists (
    select 1 from public.secret_crushes
    where user_id = v_user_id and crush_username = p_crush_username
  ) then
    return jsonb_build_object('success', false, 'error', 'already_crushed');
  end if;

  -- Insert the secret crush
  insert into public.secret_crushes (user_id, crush_username)
  values (v_user_id, p_crush_username);

  -- Get my display_name to check reverse crush
  select display_name into v_my_display
  from public.profiles
  where profiles.user_id = v_user_id
  limit 1;

  -- Check if the crush also has us as a secret crush
  if exists (
    select 1 from public.secret_crushes
    where user_id = v_crush_user_id
      and lower(crush_username) = lower(v_my_display)
  ) then
    v_is_mutual := true;
  end if;

  -- Also check if we already exchanged dating_likes
  if not v_is_mutual and exists (
    select 1 from public.dating_likes
    where (sender_id = v_user_id and receiver_id = v_crush_user_id)
       or (sender_id = v_crush_user_id and receiver_id = v_user_id)
  ) then
    -- If at least one like exists in either direction, count crush as the match trigger
    if exists (
      select 1 from public.dating_likes
      where sender_id = v_crush_user_id and receiver_id = v_user_id
    ) then
      v_is_mutual := true;
    end if;
  end if;

  -- If mutual, create match
  if v_is_mutual then
    if v_user_id < v_crush_user_id then
      v_user_a := v_user_id;
      v_user_b := v_crush_user_id;
    else
      v_user_a := v_crush_user_id;
      v_user_b := v_user_id;
    end if;

    select id, conversation_id into v_match_id, v_conv_id
    from public.dating_matches
    where user_a = v_user_a and user_b = v_user_b;

    if v_match_id is null then
      insert into public.conversations (id, created_at, updated_at)
      values (gen_random_uuid(), now(), now())
      returning id into v_conv_id;

      insert into public.conversation_participants (conversation_id, user_id)
      values (v_conv_id, v_user_id), (v_conv_id, v_crush_user_id);

      insert into public.dating_matches (user_a, user_b, conversation_id, matched_via)
      values (v_user_a, v_user_b, v_conv_id, 'secret_crush');
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'match', v_is_mutual,
    'conversation_id', v_conv_id
  );
end;
$$;

-- ============================================================================
-- RPC: GET REMAINING LIKES TODAY
-- ============================================================================
create or replace function public.get_dating_likes_remaining()
returns int
language plpgsql security definer stable
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.dating_likes
  where sender_id = auth.uid()
    and created_at >= date_trunc('day', now() at time zone 'UTC');
  return 4 - v_count;
end;
$$;

-- ============================================================================
-- RPC: GET DISCOVERY FEED (randomized, excludes self, already-liked, matched)
-- ============================================================================
create or replace function public.get_dating_feed(
  p_limit int default 10,
  p_offset int default 0
)
returns setof public.dating_profiles
language plpgsql security definer stable
as $$
begin
  return query
  select dp.*
  from public.dating_profiles dp
  where dp.is_active = true
    and dp.user_id <> auth.uid()
    and cardinality(dp.media) = 5
    -- Exclude already-liked users
    and not exists (
      select 1 from public.dating_likes dl
      where dl.sender_id = auth.uid() and dl.receiver_id = dp.user_id
    )
    -- Exclude already-matched users
    and not exists (
      select 1 from public.dating_matches dm
      where (dm.user_a = auth.uid() and dm.user_b = dp.user_id)
         or (dm.user_a = dp.user_id and dm.user_b = auth.uid())
    )
    -- Exclude blocked users
    and not exists (
      select 1 from public.blocked_users bu
      where (bu.blocker_user_id = auth.uid() and bu.blocked_user_id = dp.user_id)
         or (bu.blocker_user_id = dp.user_id and bu.blocked_user_id = auth.uid())
    )
  order by random()
  limit p_limit
  offset p_offset;
end;
$$;

-- ============================================================================
-- STORAGE BUCKET for dating media
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dating-media',
  'dating-media',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload own dating media"
  on storage.objects for insert
  with check (
    bucket_id = 'dating-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view dating media"
  on storage.objects for select
  using (bucket_id = 'dating-media');

create policy "Users can delete own dating media"
  on storage.objects for delete
  using (
    bucket_id = 'dating-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- Identities (usernames, server-side only)
create table public.identities (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);
create index identities_username_lower on public.identities (lower(username));

-- IP bindings
create table public.ip_bindings (
  ip_hash text primary key,
  identity_id uuid not null references public.identities(id) on delete cascade,
  raw_ip text,
  user_agent text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index ip_bindings_identity on public.ip_bindings(identity_id);

-- Communities
create table public.communities (
  slug text primary key,
  name text not null,
  malayalam text,
  description text,
  icon text,
  color text,
  created_by uuid references public.identities(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  community_slug text not null references public.communities(slug) on delete cascade,
  author_id uuid references public.identities(id) on delete set null,
  author_username text not null,
  anonymous boolean not null default false,
  title text not null,
  body text,
  type text not null default 'text',
  image text,
  poll jsonb,
  voice jsonb,
  tags text[] default '{}',
  nsfw boolean not null default false,
  pinned boolean not null default false,
  upvotes integer not null default 1,
  comments_count integer not null default 0,
  reactions jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_community on public.posts(community_slug, created_at desc);
create index posts_created on public.posts(created_at desc);

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid references public.identities(id) on delete set null,
  author_username text not null,
  anonymous boolean not null default false,
  body text not null,
  upvotes integer not null default 1,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post on public.comments(post_id, created_at);

-- Votes
create table public.votes (
  user_id uuid not null references public.identities(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  dir smallint not null check (dir in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Reactions (one per user per post)
create table public.reactions (
  user_id uuid not null references public.identities(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Poll votes
create table public.poll_votes (
  user_id uuid not null references public.identities(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Live rooms
create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text,
  host_id uuid references public.identities(id) on delete set null,
  host_username text not null,
  color text,
  listeners integer not null default 1,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Presence pings
create table public.presence_pings (
  user_id uuid primary key references public.identities(id) on delete cascade,
  last_seen timestamptz not null default now()
);

-- Enable RLS on everything
alter table public.identities enable row level security;
alter table public.ip_bindings enable row level security;
alter table public.communities enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.reactions enable row level security;
alter table public.poll_votes enable row level security;
alter table public.live_rooms enable row level security;
alter table public.presence_pings enable row level security;

-- Public read on non-sensitive tables (no policies on identities/ip_bindings = locked)
create policy "public read posts" on public.posts for select using (deleted = false);
create policy "public read comments" on public.comments for select using (deleted = false);
create policy "public read communities" on public.communities for select using (true);
create policy "public read votes" on public.votes for select using (true);
create policy "public read reactions" on public.reactions for select using (true);
create policy "public read poll_votes" on public.poll_votes for select using (true);
create policy "public read live_rooms" on public.live_rooms for select using (ended_at is null);
create policy "public read presence" on public.presence_pings for select using (true);

-- Enable realtime
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.communities;
alter publication supabase_realtime add table public.live_rooms;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.presence_pings;
alter table public.posts replica identity full;
alter table public.comments replica identity full;
alter table public.live_rooms replica identity full;
alter table public.presence_pings replica identity full;

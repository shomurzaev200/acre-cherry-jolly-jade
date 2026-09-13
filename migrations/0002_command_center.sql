-- PULSE command center schema. Per-user isolation via user_id TEXT.

create table if not exists cc_meta (
  user_id text primary key,
  seeded boolean not null default false,
  paused_all boolean not null default false,
  role text not null default 'OWNER',
  created_at timestamptz not null default now()
);

create table if not exists network_profiles (
  id text primary key,
  user_id text not null,
  name text not null,
  region text not null default '',
  proxy_host text not null default '',
  proxy_kind text not null default 'none',
  status text not null default 'HEALTHY',
  latency_ms integer,
  last_check timestamptz,
  warning text
);
create index if not exists network_profiles_user_idx on network_profiles (user_id);

create table if not exists ig_accounts (
  id text primary key,
  user_id text not null,
  handle text not null,
  display_name text not null,
  niche text not null,
  language text not null default 'ru',
  status text not null default 'ACTIVE',
  mode text not null default 'MANUAL',
  require_approval boolean not null default true,
  interval_hours integer not null default 6,
  timezone text not null default 'Asia/Tashkent',
  network_profile_id text,
  followers integer not null default 0,
  bio text not null default '',
  profile_link text not null default '',
  meta_user_id text,
  meta_connected boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ig_accounts_user_idx on ig_accounts (user_id);

create table if not exists account_ai_profiles (
  account_id text primary key,
  user_id text not null,
  best_hours text not null default '[]',
  best_days text not null default '[]',
  best_length_min integer,
  best_length_max integer,
  best_topics text not null default '[]',
  best_hooks text not null default '[]',
  best_cta text not null default '',
  best_hashtag_cluster text not null default '',
  best_caption_style text not null default '',
  profile_visit_rate double precision,
  link_click_rate double precision,
  confidence integer not null default 0,
  sample_size integer not null default 0,
  do_more text not null default '[]',
  do_less text not null default '[]',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists videos (
  id text primary key,
  user_id text not null,
  title text not null,
  duration_sec integer not null,
  topic text not null,
  topic_cluster text not null default 'A',
  hook_style text not null default '',
  language text not null default 'ru',
  status text not null default 'ready',
  thumbnail_seed text not null default '1',
  original_name text not null default '',
  file_size_kb integer,
  created_at timestamptz not null default now()
);
create index if not exists videos_user_idx on videos (user_id);

create table if not exists ai_video_analysis (
  video_id text primary key,
  user_id text not null,
  analysis_hash text not null,
  topic text not null default '',
  category text not null default '',
  visual_style text not null default '',
  duration_sec integer,
  hook text not null default '',
  hook_score integer,
  hook_reasons text not null default '[]',
  has_text boolean,
  has_face boolean,
  has_speech boolean,
  language text not null default 'ru',
  tone text not null default '',
  structure text not null default '',
  cta text not null default '',
  audience text not null default '',
  pace text not null default '',
  info_density text not null default '',
  content_score integer,
  hook_subscore integer,
  topic_subscore integer,
  retention_subscore integer,
  cta_subscore integer,
  conversion_subscore integer,
  provider text not null default 'local_engine'
);

create table if not exists publication_tasks (
  id text primary key,
  user_id text not null,
  account_id text not null,
  video_id text not null,
  scheduled_at timestamptz not null,
  status text not null default 'queued',
  caption text not null default '',
  hashtags text not null default '',
  cta text not null default '',
  hashtag_cluster text not null default '',
  predicted_views_lo integer,
  predicted_views_hi integer,
  predicted_profile_lo integer,
  predicted_profile_hi integer,
  predicted_clicks_lo integer,
  predicted_clicks_hi integer,
  prediction_confidence integer,
  attempt_count integer not null default 0,
  error text,
  idempotency_key text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists publication_tasks_idem_idx on publication_tasks (idempotency_key);
create index if not exists publication_tasks_user_idx on publication_tasks (user_id);
create index if not exists publication_tasks_account_idx on publication_tasks (account_id, scheduled_at);

create table if not exists video_analytics (
  id text primary key,
  user_id text not null,
  task_id text,
  account_id text not null,
  video_id text not null,
  hours_after integer not null default 24,
  views integer,
  reach integer,
  profile_visits integer,
  link_clicks integer,
  likes integer,
  comments integer,
  saves integer,
  shares integer,
  retention double precision,
  watch_time_sec integer,
  source text not null,
  captured_at timestamptz not null default now()
);
create index if not exists video_analytics_account_idx on video_analytics (account_id);

create table if not exists analytics_velocity (
  id text primary key,
  user_id text not null,
  task_id text not null,
  window_label text not null,
  views integer,
  source text not null
);

create table if not exists experiments (
  id text primary key,
  user_id text not null,
  account_id text not null,
  kind text not null,
  name text not null,
  variant_a text not null,
  variant_b text not null,
  hold_constant text not null default '',
  status text not null default 'running',
  winner text,
  sample_a integer not null default 0,
  sample_b integer not null default 0,
  metric_a double precision,
  metric_b double precision,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists ai_recommendations (
  id text primary key,
  user_id text not null,
  account_id text,
  created_at timestamptz not null default now(),
  rec_date text not null,
  body text not null,
  reason text not null default '',
  confidence integer not null default 0,
  accepted boolean,
  result text
);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null,
  account_id text,
  video_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  user_id text not null,
  actor text not null default 'system',
  action text not null,
  target text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists hashtag_clusters (
  id text primary key,
  user_id text not null,
  account_id text,
  name text not null,
  tags text not null,
  avg_views double precision,
  avg_profile_rate double precision
);

create table if not exists topic_clusters (
  id text primary key,
  user_id text not null,
  account_id text,
  name text not null,
  label text not null,
  last_used timestamptz
);

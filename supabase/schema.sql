-- ============================================================
-- FashionVoid Strategizer — Supabase Schema + RLS Policies
-- Run this in the Supabase SQL editor
-- ============================================================

-- ========================
-- user_profile
-- ========================
CREATE TABLE IF NOT EXISTS user_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_handle text,
  current_followers int,
  follower_goal int,
  account_start_year int,
  niche_description text,
  primary_eras jsonb DEFAULT '[]'::jsonb,
  hero_brands jsonb DEFAULT '[]'::jsonb,
  unique_value_prop text,
  post_types_used jsonb DEFAULT '[]'::jsonb,
  posting_frequency text,
  appears_on_camera text,
  caption_style text,
  target_audience text,
  audience_comes_for jsonb DEFAULT '[]'::jsonb,
  competitor_accounts jsonb DEFAULT '[]'::jsonb,
  sells_items bool,
  avg_item_price numeric,
  monthly_budget numeric,
  sell_platforms jsonb DEFAULT '[]'::jsonb,
  secondary_platforms jsonb DEFAULT '[]'::jsonb,
  optimization_mode text DEFAULT 'Growth',
  biggest_challenge text,
  what_worked text,
  ai_context text,
  dark_mode bool DEFAULT false,
  accent_color text DEFAULT 'mono',
  onboarding_complete bool DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profile
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================
-- inventory_items
-- ========================
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand text,
  season text,
  collection_name text,
  designer text,
  item_name text,
  category text,
  condition_score numeric,
  condition_flaws text,
  size_tagged text,
  measurements text,
  fit_notes text,
  status text CHECK (status IN ('in_hand','on_the_way','sold','personal_collection','posted','unposted','needs_repost')),
  price_paid numeric,
  target_price numeric,
  availability_type text CHECK (availability_type IN ('for_sale','personal','hold')),
  acquisition_date date,
  date_posted date,
  times_posted int DEFAULT 0,
  notes text,
  rarity_estimate text CHECK (rarity_estimate IN ('common','uncommon','rare','grail')),
  engagement_potential text CHECK (engagement_potential IN ('low','medium','high','viral')),
  sales_potential text CHECK (sales_potential IN ('low','medium','high')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own inventory" ON inventory_items
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- analytics_entries
-- ========================
CREATE TABLE IF NOT EXISTS analytics_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  post_date date NOT NULL,
  post_time time DEFAULT '12:00',
  post_type text CHECK (post_type IN ('carousel','reel','single','story')),
  platform text CHECK (platform IN ('instagram','tiktok')) DEFAULT 'instagram',
  views int,
  likes int,
  comments int,
  shares int,
  saves int,
  reach int,
  followers_gained int,
  views_1h int,
  views_24h int,
  watch_time_seconds int,
  retention_pct numeric,
  shot_style text,
  caption_style text,
  hook_type text,
  cta_type text,
  notes text,
  source text CHECK (source IN ('manual','screenshot','csv')) DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own analytics" ON analytics_entries
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- captions
-- ========================
CREATE TABLE IF NOT EXISTS captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  platform text CHECK (platform IN ('instagram','grailed','vinted')),
  title_line text,
  body_copy text,
  info_block text,
  hashtags text,
  full_caption text,
  is_validated bool DEFAULT false,
  validation_issues jsonb DEFAULT '[]'::jsonb,
  is_posted bool DEFAULT false,
  posted_at timestamptz,
  performance_views int,
  performance_followers int,
  ab_variant text DEFAULT 'A',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own captions" ON captions
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- calendar_events
-- ========================
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  event_type text CHECK (event_type IN ('post','shoot','edit','repost','deadline','other')) DEFAULT 'other',
  start_date date NOT NULL,
  end_date date,
  all_day bool DEFAULT true,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  caption_id uuid REFERENCES captions(id) ON DELETE SET NULL,
  notes text,
  status text CHECK (status IN ('planned','done','cancelled')) DEFAULT 'planned',
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- shoot_sessions
-- ========================
CREATE TABLE IF NOT EXISTS shoot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  session_date date NOT NULL,
  status text CHECK (status IN ('planned','in_progress','done','cancelled')) DEFAULT 'planned',
  location text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shoot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own shoot sessions" ON shoot_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- shoot_session_items
-- ========================
CREATE TABLE IF NOT EXISTS shoot_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES shoot_sessions(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  item_label text,
  shot_types jsonb DEFAULT '[]'::jsonb,
  status text CHECK (status IN ('pending','shot','skipped')) DEFAULT 'pending',
  notes text,
  sort_order int DEFAULT 0
);

ALTER TABLE shoot_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own shoot session items" ON shoot_session_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM shoot_sessions
      WHERE shoot_sessions.id = shoot_session_items.session_id
        AND shoot_sessions.user_id = auth.uid()
    )
  );

-- ========================
-- hashtags
-- ========================
CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag text NOT NULL,
  category text,
  reach_tier text CHECK (reach_tier IN ('micro','mid','macro','mega')),
  times_used int DEFAULT 0,
  avg_views numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own hashtags" ON hashtags
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- follower_history
-- ========================
CREATE TABLE IF NOT EXISTS follower_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recorded_date date NOT NULL,
  follower_count int NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, recorded_date)
);

ALTER TABLE follower_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own follower history" ON follower_history
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- recommendations
-- ========================
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rec_type text CHECK (rec_type IN ('post_next','shoot_next','repost_next','content_type','daily_card')),
  title text NOT NULL,
  summary text NOT NULL,
  reasoning text,
  confidence numeric,
  expected_impact text,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  is_dismissed bool DEFAULT false,
  optimization_mode text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own recommendations" ON recommendations
  FOR ALL USING (auth.uid() = user_id);

-- ========================
-- Realtime subscriptions
-- Enable for analytics_entries and follower_history
-- ========================
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE follower_history;

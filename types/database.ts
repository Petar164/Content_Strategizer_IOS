export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface UserProfile {
  user_id: string;
  instagram_handle: string | null;
  current_followers: number | null;
  follower_goal: number | null;
  account_start_year: number | null;
  niche_description: string | null;
  primary_eras: Json;
  hero_brands: Json;
  unique_value_prop: string | null;
  post_types_used: Json;
  posting_frequency: string | null;
  appears_on_camera: string | null;
  caption_style: string | null;
  target_audience: string | null;
  audience_comes_for: Json;
  competitor_accounts: Json;
  sells_items: boolean | null;
  avg_item_price: number | null;
  monthly_budget: number | null;
  sell_platforms: Json;
  secondary_platforms: Json;
  optimization_mode: string | null;
  biggest_challenge: string | null;
  what_worked: string | null;
  ai_context: string | null;
  dark_mode: boolean;
  accent_color: string;
  onboarding_complete: boolean;
  updated_at: string;
}

export type ItemStatus =
  | 'in_hand'
  | 'on_the_way'
  | 'sold'
  | 'personal_collection'
  | 'posted'
  | 'unposted'
  | 'needs_repost';

export type RarityEstimate = 'common' | 'uncommon' | 'rare' | 'grail';
export type EngagementPotential = 'low' | 'medium' | 'high' | 'viral';
export type SalesPotential = 'low' | 'medium' | 'high';
export type AvailabilityType = 'for_sale' | 'personal' | 'hold';

export interface InventoryItem {
  id: string;
  user_id: string;
  brand: string | null;
  season: string | null;
  collection_name: string | null;
  designer: string | null;
  item_name: string | null;
  category: string | null;
  condition_score: number | null;
  condition_flaws: string | null;
  size_tagged: string | null;
  measurements: string | null;
  fit_notes: string | null;
  status: ItemStatus | null;
  price_paid: number | null;
  target_price: number | null;
  availability_type: AvailabilityType | null;
  acquisition_date: string | null;
  date_posted: string | null;
  times_posted: number;
  notes: string | null;
  rarity_estimate: RarityEstimate | null;
  engagement_potential: EngagementPotential | null;
  sales_potential: SalesPotential | null;
  created_at: string;
  updated_at: string;
}

export type PostType = 'carousel' | 'reel' | 'single' | 'story';
export type Platform = 'instagram' | 'tiktok';

export interface AnalyticsEntry {
  id: string;
  user_id: string;
  item_id: string | null;
  post_date: string;
  post_time: string;
  post_type: PostType | null;
  platform: Platform | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  followers_gained: number | null;
  views_1h: number | null;
  views_24h: number | null;
  watch_time_seconds: number | null;
  retention_pct: number | null;
  shot_style: string | null;
  caption_style: string | null;
  hook_type: string | null;
  cta_type: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export type CaptionPlatform = 'instagram' | 'grailed' | 'vinted';

export interface Caption {
  id: string;
  user_id: string;
  item_id: string | null;
  platform: CaptionPlatform | null;
  title_line: string | null;
  body_copy: string | null;
  info_block: string | null;
  hashtags: string | null;
  full_caption: string | null;
  is_validated: boolean | null;
  validation_issues: Json;
  is_posted: boolean | null;
  posted_at: string | null;
  performance_views: number | null;
  performance_followers: number | null;
  ab_variant: string;
  created_at: string;
}

export type EventType = 'post' | 'shoot' | 'edit' | 'repost' | 'deadline' | 'other';
export type EventStatus = 'planned' | 'done' | 'cancelled';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  item_id: string | null;
  caption_id: string | null;
  notes: string | null;
  status: EventStatus;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';

export interface ShootSession {
  id: string;
  user_id: string;
  title: string;
  session_date: string;
  status: SessionStatus;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ShootItemStatus = 'pending' | 'shot' | 'skipped';

export interface ShootSessionItem {
  id: string;
  session_id: string;
  item_id: string;
  item_label: string | null;
  shot_types: Json;
  status: ShootItemStatus;
  notes: string | null;
  sort_order: number | null;
}

export type ReachTier = 'micro' | 'mid' | 'macro' | 'mega';

export interface Hashtag {
  id: string;
  user_id: string;
  tag: string;
  category: string | null;
  reach_tier: ReachTier | null;
  times_used: number;
  avg_views: number | null;
  notes: string | null;
  created_at: string;
}

export interface FollowerHistory {
  id: string;
  user_id: string;
  recorded_date: string;
  follower_count: number;
  notes: string | null;
  created_at: string;
}

export type RecType =
  | 'post_next'
  | 'shoot_next'
  | 'repost_next'
  | 'content_type'
  | 'daily_card';

export interface Recommendation {
  id: string;
  user_id: string;
  rec_type: RecType;
  title: string;
  summary: string;
  reasoning: string | null;
  confidence: number | null;
  expected_impact: string | null;
  item_id: string | null;
  is_dismissed: boolean;
  optimization_mode: string | null;
  created_at: string;
  expires_at: string | null;
}

export type AccentColor = 'mono' | 'amber' | 'indigo' | 'rose' | 'emerald';
export type OptimizationMode = 'Growth' | 'Sales' | 'Authority';

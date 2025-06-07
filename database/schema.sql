-- YouTube Filter Project - Database Schema
-- This file contains the complete database schema for the Supabase backend
-- Execute this in your Supabase SQL Editor

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User Profiles Table (extends auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  api_quota_used INTEGER DEFAULT 0,
  api_quota_limit INTEGER DEFAULT 1000,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories Table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{
    "relevance_threshold": 70,
    "auto_assign": true,
    "notifications": false,
    "view_mode": "grid",
    "show_in_navigation": true,
    "include_in_digest": true,
    "max_videos_in_feed": 50
  }',
  video_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_category_name UNIQUE(user_id, name)
);

-- Videos Table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  published_at TIMESTAMPTZ,
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  category_id TEXT, -- YouTube category
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  quality_score DECIMAL(5,2) DEFAULT 0.00 CHECK (quality_score >= 0 AND quality_score <= 100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Category Videos (Many-to-Many)
CREATE TABLE public.user_category_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  relevance_score DECIMAL(5,2) DEFAULT 0.00 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  ai_analysis JSONB DEFAULT '{}',
  is_saved BOOLEAN DEFAULT false,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  watch_status TEXT DEFAULT 'unwatched' CHECK (watch_status IN ('unwatched', 'watching', 'completed')),
  watch_progress INTEGER DEFAULT 0 CHECK (watch_progress >= 0 AND watch_progress <= 100),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_category_video UNIQUE(user_id, category_id, video_id)
);

-- ============================================================================
-- ANALYTICS AND TRACKING TABLES
-- ============================================================================

-- API Usage Logs
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  api_type TEXT NOT NULL CHECK (api_type IN ('youtube', 'openai', 'transcript')),
  endpoint TEXT NOT NULL,
  quota_used INTEGER DEFAULT 1,
  cost_estimate DECIMAL(10,6) DEFAULT 0.00,
  response_status INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Analysis Cache
CREATE TABLE public.video_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('transcript', 'ai_summary', 'relevance', 'content_insights')),
  analysis_data JSONB NOT NULL,
  confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_video_category_analysis UNIQUE(video_id, category_id, analysis_type)
);

-- User Search History
CREATE TABLE public.user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  results_count INTEGER DEFAULT 0,
  filters_applied JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECURE API KEY STORAGE
-- ============================================================================

-- Encrypted API Keys Table
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  youtube_api_key_encrypted TEXT,
  openai_api_key_encrypted TEXT,
  encryption_key_salt TEXT,
  encryption_iv TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- User queries
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_active ON categories(user_id, is_active);
CREATE INDEX idx_categories_sort ON categories(user_id, sort_order);

-- Video lookups
CREATE INDEX idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX idx_videos_channel ON videos(channel_id);
CREATE INDEX idx_videos_published ON videos(published_at DESC);
CREATE INDEX idx_videos_quality ON videos(quality_score DESC);

-- User video relationships
CREATE INDEX idx_user_category_videos_user ON user_category_videos(user_id);
CREATE INDEX idx_user_category_videos_category ON user_category_videos(category_id);
CREATE INDEX idx_user_category_videos_video ON user_category_videos(video_id);
CREATE INDEX idx_user_category_videos_relevance ON user_category_videos(relevance_score DESC);
CREATE INDEX idx_user_category_videos_watch_status ON user_category_videos(user_id, watch_status);

-- Analytics
CREATE INDEX idx_api_usage_user_date ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_api_usage_type ON api_usage_logs(api_type, created_at DESC);
CREATE INDEX idx_api_usage_cost ON api_usage_logs(user_id, cost_estimate DESC);

-- Cache
CREATE INDEX idx_analysis_cache_video ON video_analysis_cache(video_id);
CREATE INDEX idx_analysis_cache_expires ON video_analysis_cache(expires_at);
CREATE INDEX idx_analysis_cache_category ON video_analysis_cache(category_id);

-- Search history
CREATE INDEX idx_search_history_user ON user_search_history(user_id, created_at DESC);
CREATE INDEX idx_search_history_query ON user_search_history(query);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Updated Timestamp Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Category Video Count Function
CREATE OR REPLACE FUNCTION public.update_category_video_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE categories 
    SET video_count = video_count + 1, updated_at = NOW()
    WHERE id = NEW.category_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE categories 
    SET video_count = GREATEST(video_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.category_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- API Usage Tracking Function
CREATE OR REPLACE FUNCTION public.update_user_api_quota()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles 
  SET api_quota_used = api_quota_used + NEW.quota_used
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cache Cleanup Function
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM video_analysis_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated timestamp triggers
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Category video count trigger
CREATE TRIGGER trigger_update_category_video_count
  AFTER INSERT OR DELETE ON user_category_videos
  FOR EACH ROW EXECUTE FUNCTION update_category_video_count();

-- API usage tracking trigger
CREATE TRIGGER trigger_update_user_api_quota
  AFTER INSERT ON api_usage_logs
  FOR EACH ROW EXECUTE FUNCTION update_user_api_quota(); 
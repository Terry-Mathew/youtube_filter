-- YouTube Filter Project - Row Level Security Policies
-- This file contains all RLS policies for data security and user isolation

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- USER CATEGORY VIDEOS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own category videos" ON user_category_videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category videos" ON user_category_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category videos" ON user_category_videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own category videos" ON user_category_videos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- API USAGE LOGS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own API usage" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API usage" ON api_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VIDEO ANALYSIS CACHE POLICIES
-- ============================================================================

CREATE POLICY "Users can view analysis cache" ON video_analysis_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_category_videos ucv 
      WHERE ucv.video_id = video_analysis_cache.video_id 
      AND ucv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analysis cache" ON video_analysis_cache
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_category_videos ucv 
      WHERE ucv.video_id = video_analysis_cache.video_id 
      AND ucv.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEARCH HISTORY POLICIES
-- ============================================================================

CREATE POLICY "Users can view own search history" ON user_search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON user_search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- API KEYS POLICIES (MOST SECURE)
-- ============================================================================

CREATE POLICY "Users can view own API keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- VIDEOS POLICIES (PUBLIC DATA WITH CONTROLLED ACCESS)
-- ============================================================================

-- Videos table should be readable by all authenticated users (public data)
CREATE POLICY "Authenticated users can view all videos" ON videos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert videos" ON videos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "System can update videos" ON videos
  FOR UPDATE TO authenticated USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated; 
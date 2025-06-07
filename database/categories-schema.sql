-- Categories table for TASK_014
-- This replaces localStorage category storage with proper database storage

-- Enable RLS for security
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  color TEXT DEFAULT '#3b82f6',
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique category names per user
  CONSTRAINT unique_user_category_name UNIQUE (user_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- User category videos (many-to-many relationship between categories and videos)
CREATE TABLE IF NOT EXISTS public.user_category_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  relevance_score DECIMAL(3,2) DEFAULT 0.0,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  
  -- Ensure unique video per category per user
  CONSTRAINT unique_user_category_video UNIQUE (user_id, category_id, video_id)
);

-- Enable RLS for user_category_videos
ALTER TABLE public.user_category_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_category_videos
CREATE POLICY "Users can manage their own category videos" ON public.user_category_videos
  FOR ALL USING (auth.uid() = user_id);

-- Videos table (if not exists from TASK_012)
CREATE TABLE IF NOT EXISTS public.videos (
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
  like_count BIGINT DEFAULT 0,
comment_count BIGINT DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
   tags TEXT[] DEFAULT '{}',
comment_count BIGINT DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
   tags TEXT[] DEFAULT '{}',
comment_count BIGINT DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
   tags TEXT[] DEFAULT '{}',
comment_count BIGINT DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
   tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  quality_score NUMERIC(3,2) DEFAULT 0.0,
   metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_user_category_videos_user_id ON public.user_category_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_videos_category_id ON public.user_category_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON public.videos(youtube_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON public.categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at 
  BEFORE UPDATE ON public.videos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- Grant specific privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.videos TO authenticated;
-- Videos might not need DELETE if they're shared across users 
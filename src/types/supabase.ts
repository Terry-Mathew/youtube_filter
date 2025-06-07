/**
 * Placeholder Supabase Database types
 * 
 * This file will be replaced with auto-generated types from Supabase CLI in TASK_012.
 * For now, it provides basic type structure to allow development to continue.
 */

// Database Types for YouTube Filter Project
// Generated types matching the Supabase database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      api_usage_logs: {
        Row: {
          id: string
          user_id: string
          api_type: 'youtube' | 'openai' | 'transcript'
          endpoint: string
          quota_used: number
          cost_estimate: number
          response_status: number | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          api_type: 'youtube' | 'openai' | 'transcript'
          endpoint: string
          quota_used?: number
          cost_estimate?: number
          response_status?: number | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          api_type?: 'youtube' | 'openai' | 'transcript'
          endpoint?: string
          quota_used?: number
          cost_estimate?: number
          response_status?: number | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          keywords: string[]
          color: string
          icon: string | null
          is_active: boolean
          sort_order: number
          settings: Json
          video_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          keywords?: string[]
          color?: string
          icon?: string | null
          is_active?: boolean
          sort_order?: number
          settings?: Json
          video_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          keywords?: string[]
          color?: string
          icon?: string | null
          is_active?: boolean
          sort_order?: number
          settings?: Json
          video_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          youtube_api_key_encrypted: string | null
          openai_api_key_encrypted: string | null
          encryption_key_salt: string | null
          encryption_iv: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          youtube_api_key_encrypted?: string | null
          openai_api_key_encrypted?: string | null
          encryption_key_salt?: string | null
          encryption_iv?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          youtube_api_key_encrypted?: string | null
          openai_api_key_encrypted?: string | null
          encryption_key_salt?: string | null
          encryption_iv?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_category_videos: {
        Row: {
          id: string
          user_id: string
          category_id: string
          video_id: string
          relevance_score: number
          ai_analysis: Json
          is_saved: boolean
          user_rating: number | null
          notes: string | null
          watch_status: 'unwatched' | 'watching' | 'completed'
          watch_progress: number
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          video_id: string
          relevance_score?: number
          ai_analysis?: Json
          is_saved?: boolean
          user_rating?: number | null
          notes?: string | null
          watch_status?: 'unwatched' | 'watching' | 'completed'
          watch_progress?: number
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          video_id?: string
          relevance_score?: number
          ai_analysis?: Json
          is_saved?: boolean
          user_rating?: number | null
          notes?: string | null
          watch_status?: 'unwatched' | 'watching' | 'completed'
          watch_progress?: number
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_videos_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_videos_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_videos_video_id_fkey"
            columns: ["video_id"]
            referencedRelation: "videos"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'premium' | 'enterprise'
          api_quota_used: number
          api_quota_limit: number
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium' | 'enterprise'
          api_quota_used?: number
          api_quota_limit?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium' | 'enterprise'
          api_quota_used?: number
          api_quota_limit?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_search_history: {
        Row: {
          id: string
          user_id: string
          query: string
          category_id: string | null
          results_count: number
          filters_applied: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          category_id?: string | null
          results_count?: number
          filters_applied?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          category_id?: string | null
          results_count?: number
          filters_applied?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_search_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_search_history_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      video_analysis_cache: {
        Row: {
          id: string
          video_id: string
          category_id: string | null
          analysis_type: 'transcript' | 'ai_summary' | 'relevance' | 'content_insights'
          analysis_data: Json
          confidence_level: number | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          category_id?: string | null
          analysis_type: 'transcript' | 'ai_summary' | 'relevance' | 'content_insights'
          analysis_data: Json
          confidence_level?: number | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          category_id?: string | null
          analysis_type?: 'transcript' | 'ai_summary' | 'relevance' | 'content_insights'
          analysis_data?: Json
          confidence_level?: number | null
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_analysis_cache_video_id_fkey"
            columns: ["video_id"]
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analysis_cache_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      videos: {
        Row: {
          id: string
          youtube_id: string
          title: string
          description: string | null
          channel_id: string
          channel_title: string
          thumbnail_url: string | null
          duration: string | null
          published_at: string | null
          view_count: number
          like_count: number
          comment_count: number
          category_id: string | null
          tags: string[]
          language: string
          quality_score: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          youtube_id: string
          title: string
          description?: string | null
          channel_id: string
          channel_title: string
          thumbnail_url?: string | null
          duration?: string | null
          published_at?: string | null
          view_count?: number
          like_count?: number
          comment_count?: number
          category_id?: string | null
          tags?: string[]
          language?: string
          quality_score?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          youtube_id?: string
          title?: string
          description?: string | null
          channel_id?: string
          channel_title?: string
          thumbnail_url?: string | null
          duration?: string | null
          published_at?: string | null
          view_count?: number
          like_count?: number
          comment_count?: number
          category_id?: string | null
          tags?: string[]
          language?: string
          quality_score?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_cache: {
        Args: {}
        Returns: undefined
      }
      handle_updated_at: {
        Args: {}
        Returns: unknown
      }
      update_category_video_count: {
        Args: {}
        Returns: unknown
      }
      update_user_api_quota: {
        Args: {}
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type UserCategoryVideo = Database['public']['Tables']['user_category_videos']['Row']
export type ApiUsageLog = Database['public']['Tables']['api_usage_logs']['Row']
export type VideoAnalysisCache = Database['public']['Tables']['video_analysis_cache']['Row']
export type UserSearchHistory = Database['public']['Tables']['user_search_history']['Row']
export type UserApiKeys = Database['public']['Tables']['user_api_keys']['Row']

// Insert types
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type VideoInsert = Database['public']['Tables']['videos']['Insert']
export type UserCategoryVideoInsert = Database['public']['Tables']['user_category_videos']['Insert']
export type ApiUsageLogInsert = Database['public']['Tables']['api_usage_logs']['Insert']
export type VideoAnalysisCacheInsert = Database['public']['Tables']['video_analysis_cache']['Insert']
export type UserSearchHistoryInsert = Database['public']['Tables']['user_search_history']['Insert']
export type UserApiKeysInsert = Database['public']['Tables']['user_api_keys']['Insert']

// Update types
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']
export type VideoUpdate = Database['public']['Tables']['videos']['Update']
export type UserCategoryVideoUpdate = Database['public']['Tables']['user_category_videos']['Update']
export type ApiUsageLogUpdate = Database['public']['Tables']['api_usage_logs']['Update']
export type VideoAnalysisCacheUpdate = Database['public']['Tables']['video_analysis_cache']['Update']
export type UserSearchHistoryUpdate = Database['public']['Tables']['user_search_history']['Update']
export type UserApiKeysUpdate = Database['public']['Tables']['user_api_keys']['Update']

// Supabase client type
export type SupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database>

// Auth types
export type AuthUser = import('@supabase/supabase-js').User
export type AuthSession = import('@supabase/supabase-js').Session

// Common query types
export interface DatabaseError {
  message: string
  details: string
  hint: string
  code: string
}

export interface DatabaseResponse<T> {
  data: T | null
  error: DatabaseError | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number | null
  error: DatabaseError | null
}

// Category settings type (matching JSONB structure)
export interface CategorySettings {
  relevance_threshold: number
  auto_assign: boolean
  notifications: boolean
  view_mode: 'grid' | 'list'
  show_in_navigation: boolean
  include_in_digest: boolean
  max_videos_in_feed: number
}

// AI analysis data structure (matching JSONB in user_category_videos)
export interface AIAnalysisData {
  summary?: string
  key_topics: string[]
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  confidence_level: number
  pros: string[]
  cons: string[]
  recommended_for: string[]
  content_warnings?: string[]
  prerequisites?: string[]
  estimated_learning_time?: number
  quality_indicators: {
    audio_quality: number
    video_quality: number
    content_depth: number
    presentation_clarity: number
  }
}

// User preferences structure (matching JSONB in user_profiles)
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  timezone?: string
  email_notifications?: boolean
  default_view_mode?: 'grid' | 'list'
  auto_play_previews?: boolean
  default_relevance_threshold?: number
  videos_per_page?: number
}

// Re-export for convenience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']; 
// Video UI Types - Interface matching VideoCard component expectations
// TASK_008_001: UI-compatible Video interface for seamless YouTube API integration

import type { 
  YouTubeVideo, 
  DetailedYouTubeVideo,
  ProcessedSearchResult 
} from './youtube';
import type { Category, CategoryId } from './index';

/**
 * UI-compatible Video interface that matches VideoCard component expectations
 * This interface standardizes video data for consistent UI rendering
 */
export interface VideoUI {
  /** Unique video identifier (YouTube video ID) */
  readonly id: string;
  
  /** Video title for display */
  title: string;
  
  /** Channel name that published the video */
  channelTitle: string;
  
  /** Thumbnail image URL for video preview */
  thumbnailUrl: string;
  
  /** Publication date in ISO string format */
  publishedAt: string;
  
  /** Total view count as number */
  viewCount: number;
  
  /** AI-calculated relevance score (0-100) */
  relevanceScore: number;
  
  /** Key learning points extracted from video */
  keyPoints: string[];
  
  /** Formatted duration string (e.g., "15:24") */
  duration: string;
  
  /** Optional fields for enhanced functionality */
  
  /** Video description */
  description?: string;
  
  /** Channel ID for linking */
  channelId?: string;
  
  /** Like count */
  likeCount?: number;
  
  /** Comment count */
  commentCount?: number;
  
  /** Video tags */
  tags?: string[];
  
  /** Categories this video has been assigned to */
  assignedCategories?: CategoryId[];
  
  /** Language of the video content */
  language?: string;
  
  /** Whether captions are available */
  hasCaptions?: boolean;
  
  /** Video quality indicator */
  quality?: 'low' | 'medium' | 'high' | 'excellent';
  
  /** Thumbnail images in different sizes */
  thumbnails?: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  
  /** Engagement metrics */
  engagement?: {
    likeToViewRatio: number;
    commentToViewRatio: number;
    engagementRate: number;
  };
  
  /** Source metadata */
  source: {
    platform: 'youtube';
    originalId: string;
    apiVersion: string;
    fetchedAt: Date;
  };
}

/**
 * Search result with category context
 */
export interface SearchResultWithCategory extends VideoUI {
  /** Category relevance scores if category-based search was performed */
  categoryRelevance?: Record<CategoryId, number>;
  
  /** Reasons why this video matched the selected category */
  matchReasons?: string[];
  
  /** Search rank within results */
  searchRank: number;
  
  /** Search query that found this video */
  searchQuery: string;
}

/**
 * Video transformation context for customizing output
 */
export interface VideoTransformContext {
  /** Categories available for relevance scoring */
  availableCategories?: Category[];
  
  /** Selected category for targeted relevance calculation */
  targetCategory?: Category;
  
  /** Whether to calculate engagement metrics */
  includeEngagement?: boolean;
  
  /** Whether to extract key points (requires AI analysis) */
  extractKeyPoints?: boolean;
  
  /** Default relevance score if AI analysis unavailable */
  defaultRelevanceScore?: number;
  
  /** Source information for tracking */
  source?: {
    searchQuery?: string;
    searchRank?: number;
    fetchedAt?: Date;
  };
}

/**
 * Transformation result with metadata
 */
export interface VideoTransformResult {
  /** Transformed video data */
  video: VideoUI;
  
  /** Transformation success status */
  success: boolean;
  
  /** Any warnings during transformation */
  warnings: string[];
  
  /** Missing data that could be enhanced */
  missingData: string[];
  
  /** Confidence score in the transformation (0-1) */
  confidence: number;
}

/**
 * Error types that can occur during video transformation
 */
export enum VideoTransformError {
  MISSING_REQUIRED_DATA = 'missing_required_data',
  INVALID_DURATION_FORMAT = 'invalid_duration_format',
  MISSING_THUMBNAIL = 'missing_thumbnail',
  INVALID_DATE_FORMAT = 'invalid_date_format',
  CATEGORY_MAPPING_FAILED = 'category_mapping_failed',
  RELEVANCE_CALCULATION_FAILED = 'relevance_calculation_failed',
}

/**
 * Video transformation error with details
 */
export interface VideoTransformErrorDetails {
  type: VideoTransformError;
  message: string;
  field?: string;
  originalValue?: unknown;
  suggestedFix?: string;
}

/**
 * Type guard to check if an object is a valid VideoUI
 */
export function isVideoUI(obj: unknown): obj is VideoUI {
  if (!obj || typeof obj !== 'object') return false;
  
  const video = obj as Record<string, unknown>;
  
  return (
    typeof video.id === 'string' &&
    typeof video.title === 'string' &&
    typeof video.channelTitle === 'string' &&
    typeof video.thumbnailUrl === 'string' &&
    typeof video.publishedAt === 'string' &&
    typeof video.viewCount === 'number' &&
    typeof video.relevanceScore === 'number' &&
    Array.isArray(video.keyPoints) &&
    typeof video.duration === 'string' &&
    video.source &&
    typeof video.source === 'object' &&
    (video.source as Record<string, unknown>).platform === 'youtube'
  );
}

/**
 * Type guard for SearchResultWithCategory
 */
export function isSearchResultWithCategory(obj: unknown): obj is SearchResultWithCategory {
  if (!isVideoUI(obj)) return false;
  
  const result = obj as SearchResultWithCategory;
  return (
    typeof result.searchRank === 'number' &&
    typeof result.searchQuery === 'string'
  );
}

/**
 * Default transformation context
 */
export const DEFAULT_TRANSFORM_CONTEXT: VideoTransformContext = {
  includeEngagement: true,
  extractKeyPoints: false, // Requires AI analysis (TASK_010)
  defaultRelevanceScore: 50,
};

/**
 * Default key points for videos when AI analysis is unavailable
 */
export const DEFAULT_KEY_POINTS = [
  'Educational content for skill development',
  'Practical examples and demonstrations', 
  'Clear explanations suitable for learning'
];

/**
 * Re-export YouTube types that might be needed for transformations
 */
export type { 
  YouTubeVideo, 
  DetailedYouTubeVideo, 
  ProcessedSearchResult 
} from './youtube'; 
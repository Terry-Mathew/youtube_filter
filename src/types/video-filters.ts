// Video Filtering Types - Advanced filtering and sorting for Learning Tube
// TASK_008_002: Advanced video filtering and sorting with Supabase integration

import type { CategoryId } from './index';
import type { VideoUI } from './video-ui';

/**
 * Duration filter presets for user convenience
 */
export type DurationPreset = 'any' | 'short' | 'medium' | 'long' | 'custom';

/**
 * Duration ranges in seconds
 */
export const DURATION_RANGES = {
  short: { min: 0, max: 240 }, // Up to 4 minutes
  medium: { min: 240, max: 1200 }, // 4-20 minutes
  long: { min: 1200, max: Infinity }, // 20+ minutes
} as const;

/**
 * Sort options for video results
 */
export type VideoSortField = 
  | 'relevance'
  | 'publishedAt'
  | 'viewCount'
  | 'duration'
  | 'title'
  | 'quality'
  | 'engagement';

export type SortOrder = 'asc' | 'desc';

/**
 * Video quality filter options
 */
export type VideoQualityFilter = 'low' | 'medium' | 'high' | 'excellent';

/**
 * Date range presets
 */
export type DatePreset = 'any' | 'today' | 'week' | 'month' | 'year' | 'custom';

/**
 * Date range configuration
 */
export interface DateRange {
  start?: Date;
  end?: Date;
}

/**
 * Duration range configuration
 */
export interface DurationRange {
  min?: number; // seconds
  max?: number; // seconds
}

/**
 * View count range configuration
 */
export interface ViewCountRange {
  min?: number;
  max?: number;
}

/**
 * Comprehensive video filter configuration
 */
export interface VideoFilters {
  /** Search query for title, description, channel */
  query?: string;
  
  /** Categories to filter by */
  categoryIds?: CategoryId[];
  
  /** Duration filtering */
  duration?: {
    preset: DurationPreset;
    range?: DurationRange;
  };
  
  /** Publication date filtering */
  publishedDate?: {
    preset: DatePreset;
    range?: DateRange;
  };
  
  /** View count filtering */
  viewCount?: ViewCountRange;
  
  /** Quality filtering */
  quality?: VideoQualityFilter[];
  
  /** Channel filtering */
  channelIds?: string[];
  
  /** Language filtering */
  languages?: string[];
  
  /** Caption availability */
  hasCaptions?: boolean;
  
  /** Minimum relevance score (0-100) */
  minRelevanceScore?: number;
  
  /** Minimum engagement rate */
  minEngagementRate?: number;
  
  /** Video tags */
  tags?: string[];
  
  /** Exclude already watched videos */
  excludeWatched?: boolean;
}

/**
 * Video sorting configuration
 */
export interface VideoSort {
  field: VideoSortField;
  order: SortOrder;
}

/**
 * Combined filter and sort configuration
 */
export interface VideoFilterAndSort {
  filters: VideoFilters;
  sort: VideoSort;
  limit?: number;
  offset?: number;
}

/**
 * Filter preset for common use cases
 */
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: VideoFilters;
  sort: VideoSort;
  createdAt: Date;
  isDefault?: boolean;
}

/**
 * Filter application result
 */
export interface FilterResult {
  videos: VideoUI[];
  totalCount: number;
  appliedFilters: VideoFilters;
  sort: VideoSort;
  processingTime: number;
}

/**
 * Filter statistics for UI insights
 */
export interface FilterStats {
  totalVideos: number;
  filteredVideos: number;
  averageRelevanceScore: number;
  durationDistribution: Record<DurationPreset, number>;
  qualityDistribution: Record<VideoQualityFilter, number>;
  dateDistribution: {
    today: number;
    week: number;
    month: number;
    year: number;
    older: number;
  };
}

/**
 * Advanced filter options for power users
 */
export interface AdvancedFilters extends VideoFilters {
  /** Custom filter expressions */
  customExpression?: string;
  
  /** Boost scores for specific criteria */
  scoreBoosts?: {
    recentVideos?: number;
    popularChannels?: number;
    highEngagement?: number;
  };
  
  /** Machine learning model preferences */
  mlModelPreferences?: {
    favoriteTopics?: string[];
    excludeTopics?: string[];
    personalizedScoring?: boolean;
  };
  
  /** A/B testing group */
  experimentGroup?: string;
}

/**
 * Filter validation result
 */
export interface FilterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Filter analytics for performance tracking
 */
export interface FilterAnalytics {
  filterId: string;
  userId: string;
  appliedAt: Date;
  executionTime: number;
  resultCount: number;
  userInteractions: {
    clickThroughRate: number;
    averageWatchTime: number;
    savedVideos: number;
  };
}

/**
 * Default filter presets
 */
export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'most-relevant',
    name: 'Most Relevant',
    description: 'Videos ranked by AI relevance to your selected categories',
    filters: { minRelevanceScore: 50 },
    sort: { field: 'relevance', order: 'desc' },
    createdAt: new Date(),
    isDefault: true,
  },
  {
    id: 'recent',
    name: 'Recently Published',
    description: 'Latest videos from the past month',
    filters: { 
      publishedDate: { 
        preset: 'month' as DatePreset,
      }
    },
    sort: { field: 'publishedAt', order: 'desc' },
    createdAt: new Date(),
  },
  {
    id: 'popular',
    name: 'Most Popular',
    description: 'Videos with highest view counts',
    filters: { viewCount: { min: 1000 } },
    sort: { field: 'viewCount', order: 'desc' },
    createdAt: new Date(),
  },
  {
    id: 'quick-watch',
    name: 'Quick Watch',
    description: 'Short videos under 10 minutes',
    filters: { 
      duration: { 
        preset: 'short' as DurationPreset,
      }
    },
    sort: { field: 'relevance', order: 'desc' },
    createdAt: new Date(),
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'Videos with excellent quality and captions',
    filters: { 
      quality: ['high', 'excellent'] as VideoQualityFilter[],
      hasCaptions: true,
      minEngagementRate: 0.02, // 2%
    },
    sort: { field: 'quality', order: 'desc' },
    createdAt: new Date(),
  },
];

/**
 * Filter utility functions
 */
export class VideoFilterUtils {
  /**
   * Convert duration preset to actual range
   */
  static getDurationRange(preset: DurationPreset): DurationRange | null {
    if (preset === 'any' || preset === 'custom') return null;
    return DURATION_RANGES[preset];
  }

  /**
   * Convert date preset to actual range
   */
  static getDateRange(preset: DatePreset): DateRange | null {
    if (preset === 'any' || preset === 'custom') return null;
    
    const now = new Date();
    const ranges: Record<Exclude<DatePreset, 'any' | 'custom'>, DateRange> = {
      today: {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: now,
      },
      week: {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now,
      },
      month: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      },
      year: {
        start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        end: now,
      },
    };
    
    return ranges[preset];
  }

  /**
   * Validate filter configuration
   */
  static validateFilters(filters: VideoFilters): FilterValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate duration range
    if (filters.duration?.range) {
      const { min, max } = filters.duration.range;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Duration minimum cannot be greater than maximum');
      }
      if (min !== undefined && min < 0) {
        errors.push('Duration minimum cannot be negative');
      }
    }

    // Validate view count range
    if (filters.viewCount) {
      const { min, max } = filters.viewCount;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('View count minimum cannot be greater than maximum');
      }
      if (min !== undefined && min < 0) {
        errors.push('View count minimum cannot be negative');
      }
    }

    // Validate date range
    if (filters.publishedDate?.range) {
      const { start, end } = filters.publishedDate.range;
      if (start && end && start > end) {
        errors.push('Start date cannot be after end date');
      }
      if (end && end > new Date()) {
        warnings.push('End date is in the future');
      }
    }

    // Validate relevance score
    if (filters.minRelevanceScore !== undefined) {
      if (filters.minRelevanceScore < 0 || filters.minRelevanceScore > 100) {
        errors.push('Relevance score must be between 0 and 100');
      }
      if (filters.minRelevanceScore > 90) {
        warnings.push('Very high relevance threshold may return few results');
      }
    }

    // Provide suggestions
    if (!filters.categoryIds?.length) {
      suggestions.push('Select categories for better relevance scoring');
    }
    
    if (filters.quality?.length === 1 && filters.quality[0] === 'excellent') {
      suggestions.push('Consider including "high" quality for more results');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Calculate filter complexity score for performance optimization
   */
  static calculateComplexity(filters: VideoFilters): number {
    let complexity = 0;
    
    if (filters.query) complexity += 2;
    if (filters.categoryIds?.length) complexity += 1;
    if (filters.duration) complexity += 1;
    if (filters.publishedDate) complexity += 1;
    if (filters.viewCount) complexity += 1;
    if (filters.quality?.length) complexity += 1;
    if (filters.channelIds?.length) complexity += 2;
    if (filters.languages?.length) complexity += 1;
    if (filters.hasCaptions !== undefined) complexity += 1;
    if (filters.minRelevanceScore !== undefined) complexity += 1;
    if (filters.minEngagementRate !== undefined) complexity += 1;
    if (filters.tags?.length) complexity += 2;
    if (filters.excludeWatched) complexity += 1;
    
    return complexity;
  }

  /**
   * Generate human-readable filter description
   */
  static describeFilters(filters: VideoFilters): string {
    const parts: string[] = [];
    
    if (filters.query) {
      parts.push(`containing "${filters.query}"`);
    }
    
    if (filters.categoryIds?.length) {
      parts.push(`in ${filters.categoryIds.length} categories`);
    }
    
    if (filters.duration?.preset && filters.duration.preset !== 'any') {
      parts.push(`${filters.duration.preset} duration`);
    }
    
    if (filters.publishedDate?.preset && filters.publishedDate.preset !== 'any') {
      parts.push(`from ${filters.publishedDate.preset}`);
    }
    
    if (filters.quality?.length) {
      parts.push(`${filters.quality.join(', ')} quality`);
    }
    
    if (filters.hasCaptions) {
      parts.push('with captions');
    }
    
    if (filters.minRelevanceScore) {
      parts.push(`relevance ${filters.minRelevanceScore}%+`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'All videos';
  }
}

/**
 * Export utility constants
 */
export const SORT_OPTIONS: Array<{ field: VideoSortField; label: string }> = [
  { field: 'relevance', label: 'Most Relevant' },
  { field: 'publishedAt', label: 'Recently Published' },
  { field: 'viewCount', label: 'Most Popular' },
  { field: 'duration', label: 'Duration' },
  { field: 'title', label: 'Title (A-Z)' },
  { field: 'quality', label: 'Quality' },
  { field: 'engagement', label: 'Engagement' },
];

export const DURATION_PRESET_OPTIONS: Array<{ value: DurationPreset; label: string }> = [
  { value: 'any', label: 'Any Duration' },
  { value: 'short', label: 'Short (< 4 min)' },
  { value: 'medium', label: 'Medium (4-20 min)' },
  { value: 'long', label: 'Long (20+ min)' },
  { value: 'custom', label: 'Custom Range' },
];

export const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: 'any', label: 'Any Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export const QUALITY_OPTIONS: Array<{ value: VideoQualityFilter; label: string }> = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]; 
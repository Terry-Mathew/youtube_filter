// Video Filter Service - Centralized filtering logic for Learning Tube
// TASK_008_002: Advanced video filtering and sorting with YouTube API integration

import type { VideoUI } from '../types/video-ui';
import type { 
  VideoFilters, 
  VideoSort, 
  FilterResult,
  FilterStats,
  FilterValidation,
  DurationRange,
  DateRange
} from '../types/video-filters';
import { VideoFilterUtils } from '../types/video-filters';
import { VideoService } from '../api/videos';
import type { CategoryFilteringOptions } from '../types/youtube';
import type { CategoryId } from '../types';

/**
 * Configuration for the video filter service
 */
export interface VideoFilterServiceConfig {
  /** YouTube API key for API-based filtering */
  youtubeApiKey?: string;
  /** Default maximum results per search */
  defaultMaxResults?: number;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Cache filter results */
  enableCaching?: boolean;
  /** Debug logging */
  enableDebugLogging?: boolean;
}

/**
 * Filter execution context
 */
export interface FilterExecutionContext {
  /** Source of videos being filtered */
  source: 'api' | 'local' | 'cache';
  /** Search query if applicable */
  query?: string;
  /** Selected categories */
  selectedCategories?: CategoryId[];
  /** User preferences */
  userPreferences?: any;
  /** Performance tracking */
  startTime: number;
}

/**
 * Filter execution result with metadata
 */
export interface FilterExecutionResult extends FilterResult {
  /** Execution context */
  context: FilterExecutionContext;
  /** Performance metrics */
  metrics: {
    totalExecutionTime: number;
    apiCallTime?: number;
    localFilterTime?: number;
    sortingTime?: number;
    validationTime?: number;
  };
  /** Cache information */
  cache?: {
    hit: boolean;
    key: string;
    ttl?: number;
  };
}

/**
 * Centralized video filtering service
 */
export class VideoFilterService {
  private config: VideoFilterServiceConfig;
  private videoService?: VideoService;
  private isInitialized = false;
  private filterCache = new Map<string, { result: FilterResult; timestamp: number; ttl: number }>();
  private performanceMetrics: Array<{ timestamp: number; executionTime: number; resultCount: number }> = [];

  constructor(config: VideoFilterServiceConfig = {}) {
    this.config = {
      defaultMaxResults: 50,
      enablePerformanceMonitoring: true,
      enableCaching: true,
      enableDebugLogging: false,
      ...config
    };
  }

  /**
   * Initialize the filter service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.config.youtubeApiKey) {
        this.videoService = new VideoService();
        await this.videoService.initialize();
        this.log('VideoService initialized successfully');
      }
      
      this.isInitialized = true;
      this.log('VideoFilterService initialized');
    } catch (error) {
      this.log('Failed to initialize VideoFilterService:', error);
      throw new Error('VideoFilterService initialization failed');
    }
  }

  /**
   * Apply filters to videos with intelligent routing
   */
  async applyFilters(
    videos: VideoUI[],
    filters: VideoFilters,
    sort: VideoSort,
    context: Partial<FilterExecutionContext> = {}
  ): Promise<FilterExecutionResult> {
    const executionContext: FilterExecutionContext = {
      source: 'local',
      startTime: Date.now(),
      ...context
    };

    // Validate filters first
    const validationStart = Date.now();
    const validation = this.validateFilters(filters);
    const validationTime = Date.now() - validationStart;

    if (!validation.isValid) {
      throw new Error(`Invalid filters: ${validation.errors.join(', ')}`);
    }

    // Check cache if enabled
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(filters, sort, context.query);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return {
          ...cached,
          context: { ...executionContext, source: 'cache' },
          metrics: {
            totalExecutionTime: Date.now() - executionContext.startTime,
            validationTime,
          },
          cache: { hit: true, key: cacheKey }
        };
      }
    }

    let result: FilterResult;
    let apiCallTime: number | undefined;
    let localFilterTime: number | undefined;

    // Determine filtering strategy
    if (this.shouldUseAPIFiltering(filters, context)) {
      // API-based filtering
      executionContext.source = 'api';
      const apiStart = Date.now();
      result = await this.applyAPIBasedFiltering(filters, sort, context);
      apiCallTime = Date.now() - apiStart;
    } else {
      // Local filtering
      executionContext.source = 'local';
      const localStart = Date.now();
      result = await this.applyLocalFiltering(videos, filters, sort);
      localFilterTime = Date.now() - localStart;
    }

    // Apply sorting
    const sortingStart = Date.now();
    result.videos = this.applySorting(result.videos, sort);
    const sortingTime = Date.now() - sortingStart;

    // Create execution result
    const executionResult: FilterExecutionResult = {
      ...result,
      context: executionContext,
      metrics: {
        totalExecutionTime: Date.now() - executionContext.startTime,
        apiCallTime,
        localFilterTime,
        sortingTime,
        validationTime,
      }
    };

    // Cache result if enabled
    if (this.config.enableCaching && context.query) {
      const cacheKey = this.generateCacheKey(filters, sort, context.query);
      this.setCachedResult(cacheKey, result);
      executionResult.cache = { hit: false, key: cacheKey, ttl: 300000 }; // 5 minutes
    }

    // Track performance metrics
    if (this.config.enablePerformanceMonitoring) {
      this.trackPerformanceMetrics(executionResult);
    }

    this.log(`Filtering completed: ${result.videos.length} results in ${executionResult.metrics.totalExecutionTime}ms`);

    return executionResult;
  }

  /**
   * Apply API-based filtering using VideoService
   */
  private async applyAPIBasedFiltering(
    filters: VideoFilters,
    sort: VideoSort,
    context: Partial<FilterExecutionContext>
  ): Promise<FilterResult> {
    if (!this.videoService) {
      throw new Error('VideoService not available for API filtering');
    }

    if (!context.query) {
      throw new Error('Query required for API-based filtering');
    }

    // Convert filters to YouTube API format
    const categoryFilteringOptions: CategoryFilteringOptions = {
      maxResults: this.config.defaultMaxResults,
      order: this.convertSortToAPIOrder(sort),
      autoMapCategories: true,
      confidenceThreshold: 0.6,
      categoryFilters: this.convertFiltersToAPIFormat(filters, context)
    };

    // Execute API search
    const searchResult = await this.videoService.searchVideosWithCategories(
      context.query,
      categoryFilteringOptions
    );

    // Convert API results to VideoUI format
    const convertedVideos: VideoUI[] = await this.convertAPIResultsToVideoUI(
      searchResult.videos,
      filters
    );

    // Apply additional local filtering for unsupported criteria
    const finalVideos = this.applyAdditionalLocalFiltering(convertedVideos, filters);

    return {
      videos: finalVideos,
      totalCount: searchResult.totalResults,
      appliedFilters: filters,
      sort: sort,
      processingTime: 0 // Will be set by caller
    };
  }

  /**
   * Apply local filtering to existing videos
   */
  private async applyLocalFiltering(
    videos: VideoUI[],
    filters: VideoFilters,
    sort: VideoSort
  ): Promise<FilterResult> {
    let filtered = [...videos];

    // Apply each filter
    filtered = this.applyQueryFilter(filtered, filters.query);
    filtered = this.applyDurationFilter(filtered, filters.duration);
    filtered = this.applyDateFilter(filtered, filters.publishedDate);
    filtered = this.applyViewCountFilter(filtered, filters.viewCount);
    filtered = this.applyQualityFilter(filtered, filters.quality);
    filtered = this.applyCaptionFilter(filtered, filters.hasCaptions);
    filtered = this.applyRelevanceFilter(filtered, filters.minRelevanceScore);
    filtered = this.applyEngagementFilter(filtered, filters.minEngagementRate);
    filtered = this.applyLanguageFilter(filtered, filters.languages);
    filtered = this.applyTagFilter(filtered, filters.tags);
    filtered = this.applyCategoryFilter(filtered, filters.categoryIds);
    filtered = this.applyChannelFilter(filtered, filters.channelIds);

    return {
      videos: filtered,
      totalCount: filtered.length,
      appliedFilters: filters,
      sort: sort,
      processingTime: 0
    };
  }

  /**
   * Apply sorting to videos
   */
  private applySorting(videos: VideoUI[], sort: VideoSort): VideoUI[] {
    return videos.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'publishedAt':
          comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          break;
        case 'viewCount':
          comparison = a.viewCount - b.viewCount;
          break;
        case 'duration':
          comparison = this.parseDuration(a.duration) - this.parseDuration(b.duration);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'quality':
          const qualityOrder = { excellent: 4, high: 3, medium: 2, low: 1 };
          comparison = (qualityOrder[a.quality || 'medium'] || 2) - (qualityOrder[b.quality || 'medium'] || 2);
          break;
        case 'engagement':
          const aEngagement = a.engagement?.engagementRate || 0;
          const bEngagement = b.engagement?.engagementRate || 0;
          comparison = aEngagement - bEngagement;
          break;
        default:
          comparison = 0;
      }
      
      return sort.order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Individual filter application methods
   */
  private applyQueryFilter(videos: VideoUI[], query?: string): VideoUI[] {
    if (!query) return videos;
    
    const searchTerm = query.toLowerCase();
    return videos.filter(video => 
      video.title.toLowerCase().includes(searchTerm) ||
      video.description?.toLowerCase().includes(searchTerm) ||
      video.channelTitle.toLowerCase().includes(searchTerm)
    );
  }

  private applyDurationFilter(videos: VideoUI[], duration?: VideoFilters['duration']): VideoUI[] {
    if (!duration) return videos;
    
    const range = VideoFilterUtils.getDurationRange(duration.preset) || duration.range;
    if (!range) return videos;

    return videos.filter(video => {
      if (!video.duration) return false;
      const durationInSeconds = this.parseDuration(video.duration);
      const min = range.min || 0;
      const max = range.max || Infinity;
      return durationInSeconds >= min && durationInSeconds <= max;
    });
  }

  private applyDateFilter(videos: VideoUI[], publishedDate?: VideoFilters['publishedDate']): VideoUI[] {
    if (!publishedDate) return videos;
    
    const range = VideoFilterUtils.getDateRange(publishedDate.preset) || publishedDate.range;
    if (!range) return videos;

    return videos.filter(video => {
      const publishedAt = new Date(video.publishedAt);
      const start = range.start || new Date(0);
      const end = range.end || new Date();
      return publishedAt >= start && publishedAt <= end;
    });
  }

  private applyViewCountFilter(videos: VideoUI[], viewCount?: VideoFilters['viewCount']): VideoUI[] {
    if (!viewCount) return videos;
    
    return videos.filter(video => {
      const min = viewCount.min || 0;
      const max = viewCount.max || Infinity;
      return video.viewCount >= min && video.viewCount <= max;
    });
  }

  private applyQualityFilter(videos: VideoUI[], quality?: VideoFilters['quality']): VideoUI[] {
    if (!quality?.length) return videos;
    
    return videos.filter(video => 
      video.quality && quality.includes(video.quality)
    );
  }

  private applyCaptionFilter(videos: VideoUI[], hasCaptions?: boolean): VideoUI[] {
    if (hasCaptions === undefined) return videos;
    
    return videos.filter(video => 
      Boolean(video.hasCaptions) === hasCaptions
    );
  }

  private applyRelevanceFilter(videos: VideoUI[], minRelevanceScore?: number): VideoUI[] {
    if (minRelevanceScore === undefined) return videos;
    
    return videos.filter(video => 
      video.relevanceScore >= minRelevanceScore
    );
  }

  private applyEngagementFilter(videos: VideoUI[], minEngagementRate?: number): VideoUI[] {
    if (minEngagementRate === undefined) return videos;
    
    return videos.filter(video => 
      video.engagement && video.engagement.engagementRate >= minEngagementRate
    );
  }

  private applyLanguageFilter(videos: VideoUI[], languages?: string[]): VideoUI[] {
    if (!languages?.length) return videos;
    
    return videos.filter(video => 
      video.language && languages.includes(video.language)
    );
  }

  private applyTagFilter(videos: VideoUI[], tags?: string[]): VideoUI[] {
    if (!tags?.length) return videos;
    
    return videos.filter(video => 
      video.tags && tags.some(tag => 
        video.tags!.some(videoTag => 
          videoTag.toLowerCase().includes(tag.toLowerCase())
        )
      )
    );
  }

  private applyCategoryFilter(videos: VideoUI[], categoryIds?: CategoryId[]): VideoUI[] {
    if (!categoryIds?.length) return videos;
    
    return videos.filter(video => 
      video.categories && video.categories.some(catId => categoryIds.includes(catId))
    );
  }

  private applyChannelFilter(videos: VideoUI[], channelIds?: string[]): VideoUI[] {
    if (!channelIds?.length) return videos;
    
    return videos.filter(video => 
      channelIds.includes(video.channel_id)
    );
  }

  /**
   * Calculate filter statistics
   */
  calculateFilterStats(allVideos: VideoUI[], filteredVideos: VideoUI[]): FilterStats {
    return {
      totalVideos: allVideos.length,
      filteredVideos: filteredVideos.length,
      averageRelevanceScore: filteredVideos.length > 0 
        ? filteredVideos.reduce((sum, v) => sum + v.relevanceScore, 0) / filteredVideos.length 
        : 0,
      durationDistribution: {
        any: allVideos.length,
        short: allVideos.filter(v => v.duration && this.parseDuration(v.duration) < 240).length,
        medium: allVideos.filter(v => v.duration && this.parseDuration(v.duration) >= 240 && this.parseDuration(v.duration) < 1200).length,
        long: allVideos.filter(v => v.duration && this.parseDuration(v.duration) >= 1200).length,
        custom: 0,
      },
      qualityDistribution: {
        excellent: allVideos.filter(v => v.quality === 'excellent').length,
        high: allVideos.filter(v => v.quality === 'high').length,
        medium: allVideos.filter(v => v.quality === 'medium').length,
        low: allVideos.filter(v => v.quality === 'low').length,
      },
      dateDistribution: {
        today: this.getVideosFromPeriod(allVideos, 'today').length,
        week: this.getVideosFromPeriod(allVideos, 'week').length,
        month: this.getVideosFromPeriod(allVideos, 'month').length,
        year: this.getVideosFromPeriod(allVideos, 'year').length,
        older: this.getVideosFromPeriod(allVideos, 'older').length,
      },
    };
  }

  /**
   * Validate filters
   */
  validateFilters(filters: VideoFilters): FilterValidation {
    return VideoFilterUtils.validateFilters(filters);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Array<{ timestamp: number; executionTime: number; resultCount: number }> {
    return [...this.performanceMetrics];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.filterCache.clear();
    this.log('Filter cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; totalRequests: number } {
    // Implementation would track cache hits/misses
    return {
      size: this.filterCache.size,
      hitRate: 0, // Would be calculated from actual usage
      totalRequests: 0
    };
  }

  // Private helper methods

  private shouldUseAPIFiltering(filters: VideoFilters, context: Partial<FilterExecutionContext>): boolean {
    return !!(
      this.videoService && 
      context.query && 
      this.config.youtubeApiKey &&
      this.isInitialized
    );
  }

  private convertSortToAPIOrder(sort: VideoSort): 'relevance' | 'date' | 'viewCount' | 'rating' {
    switch (sort.field) {
      case 'publishedAt': return 'date';
      case 'viewCount': return 'viewCount';
      case 'relevance': return 'relevance';
      default: return 'relevance';
    }
  }

  private convertFiltersToAPIFormat(filters: VideoFilters, context: Partial<FilterExecutionContext>): any {
    return {
      learningTubeCategories: context.selectedCategories || filters.categoryIds,
      duration: filters.duration ? {
        min: filters.duration.range?.min,
        max: filters.duration.range?.max,
        youtubeDuration: filters.duration.preset === 'short' ? 'short' :
                        filters.duration.preset === 'medium' ? 'medium' :
                        filters.duration.preset === 'long' ? 'long' : 'any'
      } : undefined,
      uploadDate: filters.publishedDate ? {
        after: filters.publishedDate.range?.start,
        before: filters.publishedDate.range?.end,
        period: filters.publishedDate.preset === 'today' ? 'today' :
                filters.publishedDate.preset === 'week' ? 'week' :
                filters.publishedDate.preset === 'month' ? 'month' :
                filters.publishedDate.preset === 'year' ? 'year' : undefined
      } : undefined,
      quality: {
        definition: filters.quality?.includes('high') ? 'high' : 'any',
        caption: filters.hasCaptions ? 'closedCaption' : 'any',
      },
      engagement: {
        minViews: filters.viewCount?.min,
        engagementRate: filters.minEngagementRate,
      },
      safeSearch: 'moderate',
      relevanceLanguage: filters.languages?.[0] || 'en',
    };
  }

  private async convertAPIResultsToVideoUI(apiResults: any[], filters: VideoFilters): Promise<VideoUI[]> {
    return apiResults.map((video, index) => {
      const baseRelevance = Math.max(95 - (index * 2), 50);
      const categoryBoost = video.categoryMapping?.suggestedLearningTubeCategories?.length ? 10 : 0;
      const relevanceScore = Math.min(baseRelevance + categoryBoost, 100);

      return {
        id: video.id?.videoId || '',
        youtube_id: video.id?.videoId || '',
        title: video.snippet?.title || '',
        channelTitle: video.snippet?.channelTitle || '',
        channel_id: video.snippet?.channelId || '',
        thumbnailUrl: video.snippet?.thumbnails?.high?.url || 
                     video.snippet?.thumbnails?.medium?.url || '',
        publishedAt: video.snippet?.publishedAt || new Date().toISOString(),
        description: video.snippet?.description || '',
        viewCount: 0, // Would need detailed video info
        duration: '', // Would need detailed video info
        language: video.snippet?.defaultLanguage || 'en',
        relevanceScore,
        keyPoints: [],
        quality: 'high' as const,
        categories: video.categoryMapping?.suggestedLearningTubeCategories?.map((c: any) => c.categoryId) || [],
        tags: video.snippet?.tags || [],
        hasCaptions: false, // Would need detailed video info
        engagement: {
          engagementRate: Math.random() * 5,
          likeRatio: Math.random(),
          commentRate: Math.random() * 2,
        },
        aiInsights: {
          difficulty: video.categoryMapping?.confidence && video.categoryMapping.confidence > 0.8 ? 'intermediate' : 'beginner',
          topics: video.categoryMapping?.suggestedLearningTubeCategories?.map((c: any) => c.categoryId) || [],
          sentiment: 'positive',
          keyTerms: video.snippet?.tags?.slice(0, 5) || [],
        }
      };
    });
  }

  private applyAdditionalLocalFiltering(videos: VideoUI[], filters: VideoFilters): VideoUI[] {
    let filtered = videos;

    if (filters.minRelevanceScore !== undefined) {
      filtered = filtered.filter(v => v.relevanceScore >= (filters.minRelevanceScore || 0));
    }
    
    if (filters.tags?.length) {
      filtered = filtered.filter(video => 
        video.tags && filters.tags!.some(tag => 
          video.tags!.some(videoTag => 
            videoTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    return filtered;
  }

  private parseDuration(duration: string): number {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }

  private getVideosFromPeriod(videos: VideoUI[], period: 'today' | 'week' | 'month' | 'year' | 'older'): VideoUI[] {
    const now = new Date();
    const cutoffs = {
      today: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };

    return videos.filter(video => {
      const publishedAt = new Date(video.publishedAt);
      
      switch (period) {
        case 'today':
          return publishedAt >= cutoffs.today;
        case 'week':
          return publishedAt >= cutoffs.week && publishedAt < cutoffs.today;
        case 'month':
          return publishedAt >= cutoffs.month && publishedAt < cutoffs.week;
        case 'year':
          return publishedAt >= cutoffs.year && publishedAt < cutoffs.month;
        case 'older':
          return publishedAt < cutoffs.year;
        default:
          return false;
      }
    });
  }

  private generateCacheKey(filters: VideoFilters, sort: VideoSort, query?: string): string {
    return JSON.stringify({ filters, sort, query });
  }

  private getCachedResult(key: string): FilterResult | null {
    const cached = this.filterCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }
    if (cached) {
      this.filterCache.delete(key); // Remove expired entry
    }
    return null;
  }

  private setCachedResult(key: string, result: FilterResult, ttl: number = 300000): void {
    this.filterCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });
  }

  private trackPerformanceMetrics(result: FilterExecutionResult): void {
    this.performanceMetrics.push({
      timestamp: Date.now(),
      executionTime: result.metrics.totalExecutionTime,
      resultCount: result.videos.length
    });

    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.enableDebugLogging) {
      console.log(`[VideoFilterService] ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const videoFilterService = new VideoFilterService(); 
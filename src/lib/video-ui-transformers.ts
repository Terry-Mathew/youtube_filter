// Video UI Transformers - Convert YouTube API data to UI-compatible format
// TASK_008_001: Transformation utilities for YouTube API to VideoUI conversion

import type { 
  YouTubeVideo, 
  DetailedYouTubeVideo, 
  ProcessedSearchResult,
  YouTubeVideoId,
  YouTubeChannelId
} from '../types/youtube';
import type { 
  VideoUI, 
  SearchResultWithCategory,
  VideoTransformContext,
  VideoTransformResult,
  VideoTransformError,
  VideoTransformErrorDetails
} from '../types/video-ui';
import { 
  DEFAULT_TRANSFORM_CONTEXT,
  DEFAULT_KEY_POINTS
} from '../types/video-ui';
import type { Category, CategoryId } from '../types';
import { createVideoId, createChannelId } from '../types/youtube';

/**
 * Core transformer class for converting YouTube API data to UI format
 */
export class VideoUITransformer {
  /**
   * Transform a YouTube video to UI format
   */
  static transformToUI(
    youtubeVideo: YouTubeVideo | DetailedYouTubeVideo,
    context: VideoTransformContext = DEFAULT_TRANSFORM_CONTEXT
  ): VideoTransformResult {
    const warnings: string[] = [];
    const missingData: string[] = [];
    let confidence = 1.0;

    try {
      // Extract required fields with validation
      const id = youtubeVideo.id;
      if (!id) {
        throw new Error('Video ID is required');
      }

      const title = youtubeVideo.snippet?.title || 'Untitled Video';
      if (!youtubeVideo.snippet?.title) {
        warnings.push('Missing video title');
        confidence -= 0.1;
      }

      const channelTitle = youtubeVideo.snippet?.channelTitle || 'Unknown Channel';
      if (!youtubeVideo.snippet?.channelTitle) {
        warnings.push('Missing channel title');
        confidence -= 0.1;
      }

      // Get best thumbnail
      const thumbnailUrl = this.getBestThumbnail(youtubeVideo.snippet?.thumbnails);
      if (!thumbnailUrl) {
        missingData.push('thumbnail');
        confidence -= 0.2;
      }

      // Parse and validate date
      const publishedAt = youtubeVideo.snippet?.publishedAt || new Date().toISOString();
      if (!youtubeVideo.snippet?.publishedAt) {
        warnings.push('Missing publication date');
        confidence -= 0.1;
      }

      // Parse view count
      const viewCount = parseInt(youtubeVideo.statistics?.viewCount || '0');

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(youtubeVideo, context);
      if (relevanceScore === context.defaultRelevanceScore) {
        missingData.push('ai_analysis');
      }

      // Extract or generate key points
      const keyPoints = this.extractKeyPoints(youtubeVideo, context);
      if (keyPoints === DEFAULT_KEY_POINTS) {
        missingData.push('ai_key_points');
        confidence -= 0.3;
      }

      // Format duration
      const duration = this.formatDuration(youtubeVideo.contentDetails?.duration);
      if (!youtubeVideo.contentDetails?.duration) {
        warnings.push('Missing duration information');
        confidence -= 0.1;
      }

      // Build engagement metrics if requested
      const engagement = context.includeEngagement ? 
        this.calculateEngagementMetrics(youtubeVideo) : undefined;

      // Construct VideoUI object
      const videoUI: VideoUI = {
        id,
        title,
        channelTitle,
        thumbnailUrl: thumbnailUrl || '/placeholder-thumbnail.jpg',
        publishedAt,
        viewCount,
        relevanceScore,
        keyPoints,
        duration,
        
        // Optional fields
        description: youtubeVideo.snippet?.description,
        channelId: youtubeVideo.snippet?.channelId,
        likeCount: parseInt(youtubeVideo.statistics?.likeCount || '0'),
        commentCount: parseInt(youtubeVideo.statistics?.commentCount || '0'),
        tags: youtubeVideo.snippet?.tags,
        language: youtubeVideo.snippet?.defaultLanguage,
        hasCaptions: youtubeVideo.contentDetails?.caption === 'true',
        quality: this.determineVideoQuality(youtubeVideo),
        thumbnails: youtubeVideo.snippet?.thumbnails,
        engagement,
        
        // Source metadata
        source: {
          platform: 'youtube',
          originalId: id,
          apiVersion: 'v3',
          fetchedAt: context.source?.fetchedAt || new Date(),
        },
      };

      return {
        video: videoUI,
        success: true,
        warnings,
        missingData,
        confidence: Math.max(confidence, 0),
      };

    } catch (error) {
      return {
        video: this.createFallbackVideo(youtubeVideo.id, error as Error),
        success: false,
        warnings: [],
        missingData: ['all'],
        confidence: 0,
      };
    }
  }

  /**
   * Transform search results to UI format with search context
   */
  static transformSearchResults(
    searchResults: ProcessedSearchResult[],
    searchQuery: string,
    context: VideoTransformContext = DEFAULT_TRANSFORM_CONTEXT
  ): SearchResultWithCategory[] {
    return searchResults.map((result, index) => {
      // Convert ProcessedSearchResult to basic YouTubeVideo format for transformation
      const youtubeVideo: YouTubeVideo = {
        kind: 'youtube#video',
        etag: '',
        id: createVideoId(result.id),
        snippet: {
          publishedAt: result.publishedAt?.toISOString() || new Date().toISOString(),
          channelId: result.channelId ? createChannelId(result.channelId) : createChannelId('unknown'),
          title: result.title,
          description: result.description,
          thumbnails: result.thumbnails || {},
          channelTitle: result.channelTitle || 'Unknown Channel',
          tags: result.tags,
          categoryId: '',
          liveBroadcastContent: 'none',
        },
      };

      const transformResult = this.transformToUI(youtubeVideo, {
        ...context,
        source: {
          searchQuery,
          searchRank: index + 1,
          fetchedAt: new Date(),
        },
      });

      const searchResultUI: SearchResultWithCategory = {
        ...transformResult.video,
        searchRank: index + 1,
        searchQuery,
        matchReasons: this.generateMatchReasons(result, searchQuery, context),
      };

      // Add category relevance if target category provided
      if (context.targetCategory) {
        searchResultUI.categoryRelevance = {
          [context.targetCategory.id]: this.calculateCategoryRelevance(
            result, 
            context.targetCategory
          ),
        };
      }

      return searchResultUI;
    });
  }

  /**
   * Transform multiple videos in batch
   */
  static transformBatch(
    youtubeVideos: (YouTubeVideo | DetailedYouTubeVideo)[],
    context: VideoTransformContext = DEFAULT_TRANSFORM_CONTEXT
  ): VideoTransformResult[] {
    return youtubeVideos.map(video => this.transformToUI(video, context));
  }

  // Helper Methods

  /**
   * Get the best quality thumbnail URL
   */
  private static getBestThumbnail(thumbnails?: any): string {
    if (!thumbnails) return '';
    
    return thumbnails.maxres?.url || 
           thumbnails.high?.url || 
           thumbnails.medium?.url || 
           thumbnails.default?.url || 
           '';
  }

  /**
   * Calculate relevance score based on context
   */
  private static calculateRelevanceScore(
    video: YouTubeVideo | DetailedYouTubeVideo,
    context: VideoTransformContext
  ): number {
    // If AI analysis is available (TASK_010), use it
    // For now, use simple heuristics or default score
    
    if (context.targetCategory) {
      return this.calculateCategoryRelevance(video, context.targetCategory);
    }
    
    // Use view count and engagement as basic relevance indicators
    const viewCount = parseInt(video.statistics?.viewCount || '0');
    const likeCount = parseInt(video.statistics?.likeCount || '0');
    const commentCount = parseInt(video.statistics?.commentCount || '0');
    
    if (viewCount === 0) return context.defaultRelevanceScore || 50;
    
    const engagementRate = (likeCount + commentCount) / viewCount;
    const popularityScore = Math.min(Math.log10(viewCount) * 10, 50);
    const engagementScore = Math.min(engagementRate * 1000, 50);
    
    return Math.round(popularityScore + engagementScore);
  }

  /**
   * Calculate relevance to a specific category
   */
  private static calculateCategoryRelevance(
    video: YouTubeVideo | DetailedYouTubeVideo | ProcessedSearchResult,
    category: Category
  ): number {
    const title = 'title' in video ? video.title : video.snippet?.title || '';
    const description = 'description' in video ? video.description : video.snippet?.description || '';
    const tags = 'tags' in video ? video.tags : video.snippet?.tags || [];
    
    const criteria = category.criteria.toLowerCase();
    const categoryTags = category.tags || [];
    
    let score = 0;
    
    // Title matching (40% weight)
    if (title.toLowerCase().includes(criteria)) {
      score += 40;
    }
    
    // Description matching (30% weight)
    if (description.toLowerCase().includes(criteria)) {
      score += 30;
    }
    
    // Tag matching (30% weight)
    const matchingTags = tags.filter(tag => 
      categoryTags.some(catTag => 
        tag.toLowerCase().includes(catTag.toLowerCase()) ||
        catTag.toLowerCase().includes(tag.toLowerCase())
      )
    );
    
    if (matchingTags.length > 0) {
      score += Math.min(matchingTags.length * 10, 30);
    }
    
    return Math.min(score, 100);
  }

  /**
   * Extract or generate key points
   */
  private static extractKeyPoints(
    video: YouTubeVideo | DetailedYouTubeVideo,
    context: VideoTransformContext
  ): string[] {
    // If AI analysis is available and requested, use it
    if (context.extractKeyPoints) {
      // TODO: Integrate with AI analysis from TASK_010
      // For now, return default key points
    }
    
    // Generate simple key points from title and description
    const title = video.snippet?.title || '';
    const description = video.snippet?.description || '';
    
    const keyPoints: string[] = [];
    
    // Extract learning indicators from title
    if (title.toLowerCase().includes('tutorial')) {
      keyPoints.push('Step-by-step tutorial format');
    }
    if (title.toLowerCase().includes('beginner')) {
      keyPoints.push('Suitable for beginners');
    }
    if (title.toLowerCase().includes('advanced')) {
      keyPoints.push('Advanced concepts covered');
    }
    
    // Extract from description length
    if (description.length > 500) {
      keyPoints.push('Comprehensive content with detailed explanation');
    }
    
    // Return generated points or defaults
    return keyPoints.length > 0 ? keyPoints : [...DEFAULT_KEY_POINTS];
  }

  /**
   * Format ISO 8601 duration to human readable format
   */
  private static formatDuration(duration?: string): string {
    if (!duration) return '0:00';
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate engagement metrics
   */
  private static calculateEngagementMetrics(
    video: YouTubeVideo | DetailedYouTubeVideo
  ) {
    const viewCount = parseInt(video.statistics?.viewCount || '0');
    const likeCount = parseInt(video.statistics?.likeCount || '0');
    const commentCount = parseInt(video.statistics?.commentCount || '0');
    
    if (viewCount === 0) {
      return {
        likeToViewRatio: 0,
        commentToViewRatio: 0,
        engagementRate: 0,
      };
    }
    
    return {
      likeToViewRatio: (likeCount / viewCount) * 100,
      commentToViewRatio: (commentCount / viewCount) * 100,
      engagementRate: ((likeCount + commentCount) / viewCount) * 100,
    };
  }

  /**
   * Determine video quality
   */
  private static determineVideoQuality(
    video: YouTubeVideo | DetailedYouTubeVideo
  ): 'low' | 'medium' | 'high' | 'excellent' {
    const definition = video.contentDetails?.definition;
    const caption = video.contentDetails?.caption;
    
    if (definition === 'hd' && caption === 'true') return 'excellent';
    if (definition === 'hd') return 'high';
    if (caption === 'true') return 'medium';
    
    return 'medium';
  }

  /**
   * Generate match reasons for search results
   */
  private static generateMatchReasons(
    result: ProcessedSearchResult,
    searchQuery: string,
    context: VideoTransformContext
  ): string[] {
    const reasons: string[] = [];
    const query = searchQuery.toLowerCase();
    
    if (result.title.toLowerCase().includes(query)) {
      reasons.push('Title matches search query');
    }
    
    if (result.description.toLowerCase().includes(query)) {
      reasons.push('Description contains relevant keywords');
    }
    
    if (result.channelTitle && result.channelTitle.toLowerCase().includes(query)) {
      reasons.push('Channel specializes in this topic');
    }
    
    if (context.targetCategory) {
      const relevance = this.calculateCategoryRelevance(result, context.targetCategory);
      if (relevance > 70) {
        reasons.push(`Highly relevant to ${context.targetCategory.name} category`);
      } else if (relevance > 40) {
        reasons.push(`Relevant to ${context.targetCategory.name} category`);
      }
    }
    
    return reasons.length > 0 ? reasons : ['Matches search criteria'];
  }

  /**
   * Create fallback video for error cases
   */
  private static createFallbackVideo(id: string, error: Error): VideoUI {
    return {
      id: id || 'unknown',
      title: 'Video Unavailable',
      channelTitle: 'Unknown Channel',
      thumbnailUrl: '/placeholder-thumbnail.jpg',
      publishedAt: new Date().toISOString(),
      viewCount: 0,
      relevanceScore: 0,
      keyPoints: ['Video data could not be loaded'],
      duration: '0:00',
      source: {
        platform: 'youtube',
        originalId: id || 'unknown',
        apiVersion: 'v3',
        fetchedAt: new Date(),
      },
    };
  }
}

/**
 * Convenience functions for common transformation operations
 */

/**
 * Quick transform a single YouTube video to UI format
 */
export function transformYouTubeVideoToUI(
  video: YouTubeVideo | DetailedYouTubeVideo,
  context?: VideoTransformContext
): VideoUI {
  const result = VideoUITransformer.transformToUI(video, context);
  return result.video;
}

/**
 * Quick transform search results to UI format
 */
export function transformSearchResultsToUI(
  results: ProcessedSearchResult[],
  searchQuery: string,
  context?: VideoTransformContext
): SearchResultWithCategory[] {
  return VideoUITransformer.transformSearchResults(results, searchQuery, context);
}

/**
 * Transform with category filtering context
 */
export function transformWithCategoryContext(
  video: YouTubeVideo | DetailedYouTubeVideo,
  category: Category,
  searchQuery?: string
): SearchResultWithCategory {
  const context: VideoTransformContext = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    targetCategory: category,
    source: searchQuery ? { searchQuery, searchRank: 1, fetchedAt: new Date() } : undefined,
  };
  
  const result = VideoUITransformer.transformToUI(video, context);
  
  return {
    ...result.video,
    searchRank: 1,
    searchQuery: searchQuery || '',
    categoryRelevance: {
      [category.id]: VideoUITransformer['calculateCategoryRelevance'](video, category),
    },
    matchReasons: searchQuery ? 
      VideoUITransformer['generateMatchReasons'](
        { 
          id: video.id, 
          title: video.snippet?.title || '', 
          description: video.snippet?.description || '',
          channelTitle: video.snippet?.channelTitle,
        } as ProcessedSearchResult, 
        searchQuery, 
        context
      ) : [],
  };
} 
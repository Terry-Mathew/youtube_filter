// YouTube Data Transformation Utilities for TASK_007_008
// Converts YouTube API responses to application-specific formats with type safety

import type {
  YouTubeVideo,
  YouTubeChannel,
  YouTubePlaylist,
  YouTubeSearchResponse,
  YouTubeVideoResponse,
  YouTubeChannelResponse,
  YouTubePlaylistResponse,
  DetailedYouTubeVideo,
  EnhancedVideoStatistics,
  EnhancedContentDetails,
  YouTubeVideoId,
  YouTubeChannelId,
  YouTubePlaylistId,
  ProcessedSearchResult,
  VideoAnalytics,
  ValidationResult,
} from '../types/youtube';

import type {
  Video,
  Category,
  CategoryId,
  VideoMetadata,
} from '../types';

/**
 * Core transformation utilities
 */
export class YouTubeDataTransformer {
  /**
   * Transform YouTube video to application Video format
   */
  static transformYouTubeVideoToApp(
    youtubeVideo: YouTubeVideo | DetailedYouTubeVideo,
    categoryMapping?: Map<string, CategoryId>
  ): Video {
    const baseVideo: Video = {
      id: `youtube_${youtubeVideo.id}`,
      title: youtubeVideo.snippet?.title || 'Untitled',
      description: youtubeVideo.snippet?.description || '',
      url: `https://www.youtube.com/watch?v=${youtubeVideo.id}`,
      thumbnailUrl: this.getBestThumbnail(youtubeVideo.snippet?.thumbnails),
      duration: this.parseDuration(youtubeVideo.contentDetails?.duration),
      uploadDate: youtubeVideo.snippet?.publishedAt ? new Date(youtubeVideo.snippet.publishedAt) : new Date(),
      viewCount: parseInt(youtubeVideo.statistics?.viewCount || '0'),
      likeCount: parseInt(youtubeVideo.statistics?.likeCount || '0'),
      commentCount: parseInt(youtubeVideo.statistics?.commentCount || '0'),
      channelId: youtubeVideo.snippet?.channelId || '',
      channelName: youtubeVideo.snippet?.channelTitle || '',
      tags: youtubeVideo.snippet?.tags || [],
      categoryId: this.mapYouTubeCategoryToApp(
        youtubeVideo.snippet?.categoryId,
        categoryMapping
      ),
      language: youtubeVideo.snippet?.defaultLanguage || 'en',
      isLive: youtubeVideo.snippet?.liveBroadcastContent === 'live',
      quality: this.determineVideoQuality(youtubeVideo.contentDetails),
      platform: 'youtube',
      metadata: this.extractVideoMetadata(youtubeVideo),
    };

    return baseVideo;
  }

  /**
   * Transform YouTube search results to application format
   */
  static transformSearchResults(
    searchResponse: YouTubeSearchResponse,
    categoryMapping?: Map<string, CategoryId>
  ): ProcessedSearchResult[] {
    return searchResponse.items.map(item => {
      const baseResult: ProcessedSearchResult = {
        id: item.id?.videoId || item.id?.channelId || item.id?.playlistId || '',
        type: item.id?.kind === 'youtube#video' ? 'video' : 
              item.id?.kind === 'youtube#channel' ? 'channel' : 'playlist',
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        thumbnailUrl: this.getBestThumbnail(item.snippet?.thumbnails),
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : new Date(),
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
        relevanceScore: this.calculateRelevanceScore(item),
        tags: [],
        categoryId: this.mapYouTubeCategoryToApp(
          item.snippet?.categoryId,
          categoryMapping
        ),
        platform: 'youtube',
        url: this.generateUrl(item),
        metadata: {
          originalItem: item,
          searchRank: searchResponse.items.indexOf(item) + 1,
          etag: item.etag,
        },
      };

      return baseResult;
    });
  }

  /**
   * Transform YouTube channel to application format
   */
  static transformYouTubeChannelToApp(youtubeChannel: YouTubeChannel): {
    id: string;
    name: string;
    description: string;
    thumbnailUrl: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    customUrl?: string;
    country?: string;
    keywords?: string[];
    publishedAt: Date;
  } {
    return {
      id: youtubeChannel.id || '',
      name: youtubeChannel.snippet?.title || '',
      description: youtubeChannel.snippet?.description || '',
      thumbnailUrl: this.getBestThumbnail(youtubeChannel.snippet?.thumbnails),
      subscriberCount: parseInt(youtubeChannel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(youtubeChannel.statistics?.videoCount || '0'),
      viewCount: parseInt(youtubeChannel.statistics?.viewCount || '0'),
      customUrl: youtubeChannel.snippet?.customUrl,
      country: youtubeChannel.snippet?.country,
      keywords: youtubeChannel.brandingSettings?.channel?.keywords?.split(',') || [],
      publishedAt: youtubeChannel.snippet?.publishedAt 
        ? new Date(youtubeChannel.snippet.publishedAt) 
        : new Date(),
    };
  }

  /**
   * Transform YouTube playlist to application format
   */
  static transformYouTubePlaylistToApp(youtubePlaylist: YouTubePlaylist): {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    itemCount: number;
    channelId: string;
    channelTitle: string;
    publishedAt: Date;
    tags?: string[];
    privacy: 'public' | 'private' | 'unlisted';
  } {
    return {
      id: youtubePlaylist.id || '',
      title: youtubePlaylist.snippet?.title || '',
      description: youtubePlaylist.snippet?.description || '',
      thumbnailUrl: this.getBestThumbnail(youtubePlaylist.snippet?.thumbnails),
      itemCount: youtubePlaylist.contentDetails?.itemCount || 0,
      channelId: youtubePlaylist.snippet?.channelId || '',
      channelTitle: youtubePlaylist.snippet?.channelTitle || '',
      publishedAt: youtubePlaylist.snippet?.publishedAt 
        ? new Date(youtubePlaylist.snippet.publishedAt) 
        : new Date(),
      tags: youtubePlaylist.snippet?.tags,
      privacy: this.mapPrivacyStatus(youtubePlaylist.status?.privacyStatus),
    };
  }

  /**
   * Enhanced statistics transformer with calculated metrics
   */
  static transformVideoStatistics(
    statistics: any,
    contentDetails?: any
  ): EnhancedVideoStatistics {
    const viewCount = parseInt(statistics?.viewCount || '0');
    const likeCount = parseInt(statistics?.likeCount || '0');
    const commentCount = parseInt(statistics?.commentCount || '0');
    const duration = this.parseDuration(contentDetails?.duration);

    return {
      viewCount: statistics?.viewCount || '0',
      likeCount: statistics?.likeCount,
      dislikeCount: statistics?.dislikeCount,
      favoriteCount: statistics?.favoriteCount,
      commentCount: statistics?.commentCount,
      viewCountNumber: viewCount,
      likeCountNumber: likeCount,
      commentCountNumber: commentCount,
      engagementRate: viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0,
      likeToViewRatio: viewCount > 0 ? (likeCount / viewCount) * 100 : 0,
      engagementPerMinute: duration > 0 ? (likeCount + commentCount) / (duration / 60) : 0,
      virality: this.calculateViralityScore(viewCount, likeCount, commentCount),
      popularityTier: this.determinePopularityTier(viewCount),
    };
  }

  /**
   * Advanced content details transformer
   */
  static transformContentDetails(contentDetails: any): EnhancedContentDetails {
    const duration = this.parseDuration(contentDetails?.duration);
    
    return {
      duration: contentDetails?.duration || 'PT0S',
      dimension: contentDetails?.dimension || '2d',
      definition: contentDetails?.definition || 'sd',
      caption: contentDetails?.caption || 'false',
      licensedContent: contentDetails?.licensedContent || false,
      contentRating: contentDetails?.contentRating || {},
      projection: contentDetails?.projection || 'rectangular',
      // Enhanced fields
      durationSeconds: duration,
      durationFormatted: this.formatDuration(duration),
      isShort: duration <= 60,
      isMedium: duration > 60 && duration <= 600,
      isLong: duration > 600,
      aspectRatio: this.calculateAspectRatio(contentDetails?.dimension),
      qualityScore: this.calculateQualityScore(contentDetails),
      accessibilityFeatures: this.extractAccessibilityFeatures(contentDetails),
    };
  }

  /**
   * Video analytics transformer
   */
  static transformToVideoAnalytics(
    video: DetailedYouTubeVideo,
    historicalData?: any[]
  ): VideoAnalytics {
    const stats = video.statistics;
    const contentDetails = video.contentDetails;
    
    return {
      videoId: video.id,
      metrics: {
        views: parseInt(stats?.viewCount || '0'),
        likes: parseInt(stats?.likeCount || '0'),
        comments: parseInt(stats?.commentCount || '0'),
        shares: 0, // YouTube API doesn't provide this
        clickThroughRate: 0, // Requires YouTube Analytics API
        averageViewDuration: 0, // Requires YouTube Analytics API
        impressions: 0, // Requires YouTube Analytics API
      },
      engagement: {
        likeRate: this.calculateLikeRate(stats),
        commentRate: this.calculateCommentRate(stats),
        engagementRate: this.calculateEngagementRate(stats),
        retentionRate: 0, // Requires YouTube Analytics API
      },
      performance: {
        performanceScore: this.calculatePerformanceScore(video),
        trendingPotential: this.calculateTrendingPotential(video),
        virality: this.calculateViralityScore(
          parseInt(stats?.viewCount || '0'),
          parseInt(stats?.likeCount || '0'),
          parseInt(stats?.commentCount || '0')
        ),
        qualityIndicators: this.extractQualityIndicators(video),
      },
      demographics: {
        // These would come from YouTube Analytics API
        topCountries: [],
        ageGroups: [],
        genderDistribution: { male: 50, female: 50, other: 0 },
      },
      temporal: {
        publishedAt: new Date(video.snippet?.publishedAt || ''),
        peakViewingHours: [],
        seasonalTrends: [],
        growthRate: historicalData ? this.calculateGrowthRate(historicalData) : 0,
      },
      comparison: {
        channelAverage: 0, // Requires channel-wide analysis
        categoryAverage: 0, // Requires category analysis
        similarVideos: [], // Requires similarity analysis
      },
    };
  }

  // Helper Methods

  /**
   * Get the best quality thumbnail
   */
  private static getBestThumbnail(thumbnails?: any): string {
    if (!thumbnails) return '';
    
    // Priority order: maxres, high, medium, default
    return thumbnails.maxres?.url || 
           thumbnails.high?.url || 
           thumbnails.medium?.url || 
           thumbnails.default?.url || 
           '';
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private static parseDuration(duration?: string): number {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format duration in human-readable format
   */
  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Map YouTube category to application category
   */
  private static mapYouTubeCategoryToApp(
    youtubeCategoryId?: string,
    categoryMapping?: Map<string, CategoryId>
  ): CategoryId | undefined {
    if (!youtubeCategoryId) return undefined;
    
    if (categoryMapping) {
      return categoryMapping.get(youtubeCategoryId);
    }
    
    // Default mapping for common categories
    const defaultMapping: Record<string, CategoryId> = {
      '1': 'film-animation' as CategoryId,
      '2': 'autos-vehicles' as CategoryId,
      '10': 'music' as CategoryId,
      '15': 'pets-animals' as CategoryId,
      '17': 'sports' as CategoryId,
      '19': 'travel-events' as CategoryId,
      '20': 'gaming' as CategoryId,
      '22': 'people-blogs' as CategoryId,
      '23': 'comedy' as CategoryId,
      '24': 'entertainment' as CategoryId,
      '25': 'news-politics' as CategoryId,
      '26': 'how-to-style' as CategoryId,
      '27': 'education' as CategoryId,
      '28': 'science-technology' as CategoryId,
    };
    
    return defaultMapping[youtubeCategoryId];
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevanceScore(item: any): number {
    // Basic relevance calculation based on position and engagement hints
    const position = 1; // Would need to be passed from search context
    const baseScore = Math.max(0, 1 - (position - 1) * 0.1);
    
    // Could be enhanced with more sophisticated relevance algorithms
    return Math.round(baseScore * 100) / 100;
  }

  /**
   * Generate appropriate URL for different item types
   */
  private static generateUrl(item: any): string {
    if (item.id?.videoId) {
      return `https://www.youtube.com/watch?v=${item.id.videoId}`;
    } else if (item.id?.channelId) {
      return `https://www.youtube.com/channel/${item.id.channelId}`;
    } else if (item.id?.playlistId) {
      return `https://www.youtube.com/playlist?list=${item.id.playlistId}`;
    }
    return '';
  }

  /**
   * Extract comprehensive video metadata
   */
  private static extractVideoMetadata(video: YouTubeVideo | DetailedYouTubeVideo): VideoMetadata {
    return {
      youtubeId: video.id,
      etag: video.etag,
      publishedAt: video.snippet?.publishedAt || '',
      categoryId: video.snippet?.categoryId,
      defaultLanguage: video.snippet?.defaultLanguage,
      localized: video.snippet?.localized,
      liveBroadcastContent: video.snippet?.liveBroadcastContent,
      defaultAudioLanguage: video.snippet?.defaultAudioLanguage,
      contentRating: video.contentDetails?.contentRating,
      topicDetails: (video as any).topicDetails,
      recordingDetails: (video as any).recordingDetails,
      processingDetails: (video as any).processingDetails,
      suggestions: (video as any).suggestions,
    };
  }

  /**
   * Determine video quality based on content details
   */
  private static determineVideoQuality(contentDetails?: any): 'low' | 'medium' | 'high' | 'ultra' {
    if (!contentDetails) return 'medium';
    
    const definition = contentDetails.definition;
    const dimension = contentDetails.dimension;
    
    if (definition === 'hd' && dimension === '2d') return 'high';
    if (definition === 'hd' && dimension === '3d') return 'ultra';
    if (definition === 'sd') return 'medium';
    
    return 'medium';
  }

  /**
   * Map YouTube privacy status to application format
   */
  private static mapPrivacyStatus(privacyStatus?: string): 'public' | 'private' | 'unlisted' {
    switch (privacyStatus) {
      case 'public': return 'public';
      case 'private': return 'private';
      case 'unlisted': return 'unlisted';
      default: return 'public';
    }
  }

  /**
   * Calculate engagement metrics
   */
  private static calculateLikeRate(statistics?: any): number {
    const views = parseInt(statistics?.viewCount || '0');
    const likes = parseInt(statistics?.likeCount || '0');
    return views > 0 ? (likes / views) * 100 : 0;
  }

  private static calculateCommentRate(statistics?: any): number {
    const views = parseInt(statistics?.viewCount || '0');
    const comments = parseInt(statistics?.commentCount || '0');
    return views > 0 ? (comments / views) * 100 : 0;
  }

  private static calculateEngagementRate(statistics?: any): number {
    const views = parseInt(statistics?.viewCount || '0');
    const likes = parseInt(statistics?.likeCount || '0');
    const comments = parseInt(statistics?.commentCount || '0');
    return views > 0 ? ((likes + comments) / views) * 100 : 0;
  }

  /**
   * Calculate performance and virality scores
   */
  private static calculatePerformanceScore(video: DetailedYouTubeVideo): number {
    const views = parseInt(video.statistics?.viewCount || '0');
    const likes = parseInt(video.statistics?.likeCount || '0');
    const comments = parseInt(video.statistics?.commentCount || '0');
    const duration = this.parseDuration(video.contentDetails?.duration);
    
    // Complex algorithm considering multiple factors
    const engagementScore = (likes + comments) / Math.max(views, 1);
    const durationScore = Math.min(duration / 600, 1); // Optimal around 10 minutes
    const qualityScore = video.contentDetails?.definition === 'hd' ? 1 : 0.8;
    
    return Math.round((engagementScore * 40 + durationScore * 30 + qualityScore * 30) * 100) / 100;
  }

  private static calculateTrendingPotential(video: DetailedYouTubeVideo): number {
    const publishedAt = new Date(video.snippet?.publishedAt || '');
    const now = new Date();
    const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
    
    const views = parseInt(video.statistics?.viewCount || '0');
    const viewsPerHour = ageInHours > 0 ? views / ageInHours : 0;
    
    // Trending potential based on view velocity
    return Math.min(viewsPerHour / 1000, 100); // Normalized to 0-100
  }

  private static calculateViralityScore(views: number, likes: number, comments: number): number {
    const engagement = likes + comments;
    const engagementRate = views > 0 ? engagement / views : 0;
    const scale = Math.log10(Math.max(views, 1));
    
    return Math.round(engagementRate * scale * 10 * 100) / 100;
  }

  private static determinePopularityTier(views: number): 'low' | 'medium' | 'high' | 'viral' {
    if (views >= 1000000) return 'viral';
    if (views >= 100000) return 'high';
    if (views >= 10000) return 'medium';
    return 'low';
  }

  private static calculateAspectRatio(dimension?: string): string {
    return dimension === '3d' ? '16:9-3D' : '16:9';
  }

  private static calculateQualityScore(contentDetails?: any): number {
    let score = 50; // Base score
    
    if (contentDetails?.definition === 'hd') score += 30;
    if (contentDetails?.caption === 'true') score += 10;
    if (contentDetails?.licensedContent) score += 10;
    
    return Math.min(score, 100);
  }

  private static extractAccessibilityFeatures(contentDetails?: any): string[] {
    const features: string[] = [];
    
    if (contentDetails?.caption === 'true') features.push('captions');
    if (contentDetails?.audioDescription) features.push('audio-description');
    
    return features;
  }

  private static extractQualityIndicators(video: DetailedYouTubeVideo): string[] {
    const indicators: string[] = [];
    
    if (video.contentDetails?.definition === 'hd') indicators.push('hd-quality');
    if (video.contentDetails?.caption === 'true') indicators.push('captions-available');
    if (video.snippet?.tags && video.snippet.tags.length > 5) indicators.push('well-tagged');
    if (video.snippet?.description && video.snippet.description.length > 100) indicators.push('detailed-description');
    
    return indicators;
  }

  private static calculateGrowthRate(historicalData: any[]): number {
    if (historicalData.length < 2) return 0;
    
    const latest = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];
    
    const latestViews = latest.views || 0;
    const previousViews = previous.views || 0;
    
    return previousViews > 0 ? ((latestViews - previousViews) / previousViews) * 100 : 0;
  }
}

/**
 * Validation utilities
 */
export class YouTubeDataValidator {
  /**
   * Validate YouTube video data
   */
  static validateVideoData(video: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!video.id) errors.push('Video ID is required');
    if (!video.snippet?.title) errors.push('Video title is required');
    if (!video.snippet?.channelId) errors.push('Channel ID is required');
    
    if (!video.statistics?.viewCount) warnings.push('View count is missing');
    if (!video.contentDetails?.duration) warnings.push('Duration is missing');
    if (!video.snippet?.description) warnings.push('Description is missing');
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(video),
    };
  }

  /**
   * Validate search result data
   */
  static validateSearchResult(item: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!item.id) errors.push('Item ID is required');
    if (!item.snippet?.title) errors.push('Item title is required');
    
    if (!item.snippet?.description) warnings.push('Description is missing');
    if (!item.snippet?.thumbnails) warnings.push('Thumbnails are missing');
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(item),
    };
  }

  /**
   * Calculate validation score (0-100)
   */
  private static calculateValidationScore(data: any): number {
    let score = 100;
    
    // Deduct points for missing required fields
    if (!data.id) score -= 20;
    if (!data.snippet?.title) score -= 15;
    if (!data.snippet?.description) score -= 10;
    if (!data.snippet?.thumbnails) score -= 10;
    if (!data.statistics) score -= 15;
    if (!data.contentDetails) score -= 10;
    
    return Math.max(score, 0);
  }
}

/**
 * Batch transformation utilities
 */
export class YouTubeBatchTransformer {
  /**
   * Transform multiple videos in batch
   */
  static async transformVideoBatch(
    videos: (YouTubeVideo | DetailedYouTubeVideo)[],
    categoryMapping?: Map<string, CategoryId>,
    concurrency: number = 10
  ): Promise<Video[]> {
    const results: Video[] = [];
    
    for (let i = 0; i < videos.length; i += concurrency) {
      const batch = videos.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(video => 
          Promise.resolve(YouTubeDataTransformer.transformYouTubeVideoToApp(video, categoryMapping))
        )
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Transform search results with pagination
   */
  static transformSearchBatch(
    searchResponses: YouTubeSearchResponse[],
    categoryMapping?: Map<string, CategoryId>
  ): {
    results: ProcessedSearchResult[];
    totalResults: number;
    hasMore: boolean;
  } {
    const allResults: ProcessedSearchResult[] = [];
    let totalResults = 0;
    let hasMore = false;
    
    for (const response of searchResponses) {
      const transformedResults = YouTubeDataTransformer.transformSearchResults(response, categoryMapping);
      allResults.push(...transformedResults);
      
      if (response.pageInfo) {
        totalResults = response.pageInfo.totalResults || 0;
        hasMore = !!response.nextPageToken;
      }
    }
    
    return {
      results: allResults,
      totalResults,
      hasMore,
    };
  }
} 
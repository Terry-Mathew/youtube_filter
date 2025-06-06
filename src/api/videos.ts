import { supabase, supabaseService } from '../lib/supabase';
import type { 
  Video, 
  VideoId, 
  VideoAnalysis, 
  CategoryId,
  UserId,
  ApiResponse,
  PaginatedResponse,
  DifficultyLevel,
  VideoQuality 
} from '../types';
import { YouTubeApiClient } from '../lib/youtube-api';
import type {
  YouTubeVideoId,
  YouTubeVideo,
  DetailedYouTubeVideo,
  YouTubeCategory,
  YouTubeCategoryMapping,
  CategoryBasedVideoFilters,
  CategoryFilteringOptions,
  CategoryMappingResult,
  VideoClassificationResult,
  CategoryAnalytics,
  CategorySyncStatus,
  CategorySyncOperation,
  VideoCategoryBatchJob,
  CategoryAwareSearchRequest,
  SearchOptions,
  ProcessedSearchResult,
} from '../types/youtube';
import { transcriptExtractor } from '../lib/transcript-extractor';
import { transcriptProcessor } from '../lib/transcript-processor';
import type {
  RawTranscriptData,
  TranscriptForAnalysis,
  TranscriptAvailability,
  TranscriptExtractionOptions,
  TranscriptMetadata
} from '../types/transcript';
import type {
  AnalysisRequest,
  AnalysisDepth
} from '../types/analysis';

// =============================================================================
// Request/Response Types
// =============================================================================

export interface SearchVideosRequest {
  query: string;
  categories?: CategoryId[];
  maxResults?: number;
  relevanceThreshold?: number;
  difficultyLevel?: DifficultyLevel;
  duration?: 'short' | 'medium' | 'long';
  publishedAfter?: Date;
  publishedBefore?: Date;
  sortBy?: 'relevance' | 'publishedAt' | 'viewCount' | 'rating';
}

export interface GetVideosRequest {
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'publishedAt' | 'viewCount' | 'duration';
  sortOrder?: 'asc' | 'desc';
  categories?: CategoryId[];
  includeAnalysis?: boolean;
  qualityFilter?: VideoQuality[];
  hasTranscript?: boolean;
}

export interface VideoFilters {
  categories?: CategoryId[];
  channels?: string[];
  durationRange?: {
    min: number; // in seconds
    max: number; // in seconds
  };
  viewCountRange?: {
    min: number;
    max: number;
  };
  publishedDateRange?: {
    start: Date;
    end: Date;
  };
  hasAnalysis?: boolean;
  qualityThreshold?: number; // 0-1
  languages?: string[];
}

export interface AnalyzeVideoRequest {
  videoId: VideoId;
  categoryId?: CategoryId;
  forceReAnalysis?: boolean;
  analysisType?: 'quick' | 'detailed' | 'comprehensive';
}

export interface GetTranscriptRequest {
  videoId: VideoId;
  language?: string;
  format?: 'text' | 'vtt' | 'srt';
}

export interface TranscriptResponse {
  videoId: VideoId;
  language: string;
  transcript: string;
  segments?: {
    start: number;
    end: number;
    text: string;
  }[];
  confidence?: number;
  source: 'youtube' | 'generated' | 'manual';
}

// =============================================================================
// Videos API Service
// =============================================================================

export class VideosApi {
  private static instance: VideosApi;
  
  private constructor() {}
  
  public static getInstance(): VideosApi {
    if (!VideosApi.instance) {
      VideosApi.instance = new VideosApi();
    }
    return VideosApi.instance;
  }
  
  /**
   * Search for videos using YouTube API
   * This will integrate with TASK_007 (YouTube Data API v3 integration)
   */
  async searchVideos(request: SearchVideosRequest): Promise<ApiResponse<Video[]>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual YouTube API integration in TASK_007
      // This will call the YouTube Data API v3 with user's API key
      // const youtubeApiResponse = await fetch('/api/videos/search', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(request),
      // });
      
      // Placeholder response - will be replaced with actual YouTube API call
      return {
        success: true,
        data: [],
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search videos',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get videos from the local database
   */
  async getVideos(request: GetVideosRequest = {}): Promise<PaginatedResponse<Video>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_012
      // let query = supabase
      //   .from('videos')
      //   .select(`
      //     *,
      //     ${request.includeAnalysis ? 'video_analyses (*)' : ''}
      //   `, { count: 'exact' })
      //   .eq('user_id', user.id);
      
      // Apply filters
      // if (request.categories?.length) {
      //   query = query.in('category_ids', request.categories);
      // }
      
      // if (request.qualityFilter?.length) {
      //   query = query.in('quality', request.qualityFilter);
      // }
      
      // if (request.hasTranscript !== undefined) {
      //   query = query.eq('has_captions', request.hasTranscript);
      // }
      
      // Apply sorting and pagination
      // const { data, error, count } = await query
      //   .order(request.sortBy || 'published_at', { ascending: request.sortOrder !== 'desc' })
      //   .range((request.page || 0) * (request.limit || 20), ((request.page || 0) + 1) * (request.limit || 20) - 1);
      
      // Placeholder response - will be replaced with actual database query
      const mockVideos: Video[] = [];
      const total = 0;
      const page = request.page || 0;
      const limit = request.limit || 20;
      
      return {
        success: true,
        data: mockVideos,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: (page + 1) * limit < total,
          hasPrevious: page > 0,
        },
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch videos',
        timestamp: new Date(),
        pagination: {
          page: 0,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }
  
  /**
   * Get a single video by ID
   */
  async getVideo(videoId: VideoId, includeAnalysis: boolean = false): Promise<ApiResponse<Video>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_012
      // const { data, error } = await supabase
      //   .from('videos')
      //   .select(`
      //     *,
      //     ${includeAnalysis ? 'video_analyses (*)' : ''}
      //   `)
      //   .eq('youtube_id', videoId)
      //   .eq('user_id', user.id)
      //   .single();
      
      // Placeholder - will be replaced with actual database query
      throw new Error('Video not found');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch video',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Save or update a video in the database
   */
  async saveVideo(video: Omit<Video, 'cached_at'>): Promise<ApiResponse<Video>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase upsert in TASK_012
      // const videoData = {
      //   ...video,
      //   user_id: user.id,
      //   cached_at: new Date().toISOString(),
      //   updated_at: new Date().toISOString(),
      // };
      
      // const { data, error } = await supabase
      //   .from('videos')
      //   .upsert(videoData, { onConflict: 'youtube_id,user_id' })
      //   .select()
      //   .single();
      
      // Placeholder response - will be replaced with actual database upsert
      const savedVideo: Video = {
        ...video,
        cached_at: new Date(),
      };
      
      return {
        success: true,
        data: savedVideo,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save video',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Delete a video from the database
   */
  async deleteVideo(videoId: VideoId): Promise<ApiResponse<void>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase deletion in TASK_012
      // const { error } = await supabase
      //   .from('videos')
      //   .delete()
      //   .eq('youtube_id', videoId)
      //   .eq('user_id', user.id);
      
      // Placeholder - will be replaced with actual database deletion
      return {
        success: true,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete video',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get video transcript
   * Implemented with TASK_009 transcript extraction service
   */
  async getTranscript(request: GetTranscriptRequest): Promise<ApiResponse<TranscriptResponse>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Extract transcript using TASK_009 implementation
      const result = await transcriptExtractor.extractTranscript(request.videoId, {
        language: request.language || 'en',
        fallbackLanguages: ['en-US', 'en-GB'],
        maxRetries: 3
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to extract transcript',
          timestamp: new Date(),
        };
      }

      const transcript = result.data;
      
      // Format response based on requested format
      let formattedTranscript = transcript.fullText;
      let segments;

      if (request.format === 'vtt' || request.format === 'srt') {
        formattedTranscript = this.formatTranscriptForSubtitles(transcript, request.format);
      }

      if (request.format !== 'text') {
        segments = transcript.segments.map(seg => ({
          start: seg.start,
          end: seg.start + seg.duration,
          text: seg.text
        }));
      }

      return {
        success: true,
        data: {
          videoId: request.videoId,
          language: transcript.language,
          transcript: formattedTranscript,
          segments,
          confidence: transcript.quality === 'high' ? 0.9 : transcript.quality === 'medium' ? 0.7 : 0.5,
          source: 'youtube'
        },
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transcript',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get processed transcript optimized for AI analysis
   */
  async getProcessedTranscript(
    videoId: VideoId,
    options: TranscriptExtractionOptions = {}
  ): Promise<ApiResponse<TranscriptForAnalysis>> {
    try {
      // Get raw transcript
      const rawResult = await transcriptExtractor.extractTranscript(videoId, options);
      
      if (!rawResult.success || !rawResult.data) {
        return {
          success: false,
          error: rawResult.error || 'Failed to extract transcript',
          timestamp: new Date(),
        };
      }

      // Process for analysis
      const processed = transcriptProcessor.processForAnalysis(rawResult.data, {
        cleanText: true,
        mergeShortSegments: true,
        removeMusic: true,
        removeSoundEffects: true
      });

      return {
        success: true,
        data: processed,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process transcript',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check transcript availability for multiple videos
   */
  async checkTranscriptAvailability(
    videoIds: VideoId[]
  ): Promise<ApiResponse<Record<VideoId, TranscriptAvailability>>> {
    try {
      const results: Record<VideoId, TranscriptAvailability> = {};

      // Process in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (videoId) => {
          try {
            const hasTranscript = await transcriptExtractor.hasTranscript(videoId);
            const languages = hasTranscript 
              ? await transcriptExtractor.getAvailableLanguagesForVideo(videoId)
              : [];

            return {
              videoId,
              availability: {
                available: hasTranscript,
                source: hasTranscript ? 'youtube' as const : 'none' as const,
                languages: languages.map(lang => ({
                  code: lang.language,
                  name: lang.languageName || lang.language,
                  isAutoGenerated: lang.isAutoGenerated
                })),
                quality: this.assessTranscriptQuality(languages)
              }
            };
          } catch (error) {
            console.warn(`Failed to check transcript availability for ${videoId}:`, error);
            return {
              videoId,
              availability: {
                available: false,
                source: 'none' as const,
                languages: [],
                quality: 'unknown' as const,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results[result.value.videoId] = result.value.availability;
          }
        });
      }

      return {
        success: true,
        data: results,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check transcript availability',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Format transcript for subtitle formats (VTT/SRT)
   */
  private formatTranscriptForSubtitles(transcript: RawTranscriptData, format: 'vtt' | 'srt'): string {
    if (format === 'vtt') {
      let vtt = 'WEBVTT\n\n';
      transcript.segments.forEach((segment, index) => {
        const start = this.formatTime(segment.start);
        const end = this.formatTime(segment.start + segment.duration);
        vtt += `${start} --> ${end}\n${segment.text}\n\n`;
      });
      return vtt;
    } else if (format === 'srt') {
      let srt = '';
      transcript.segments.forEach((segment, index) => {
        const start = this.formatTimeForSRT(segment.start);
        const end = this.formatTimeForSRT(segment.start + segment.duration);
        srt += `${index + 1}\n${start} --> ${end}\n${segment.text}\n\n`;
      });
      return srt;
    }
    return transcript.fullText;
  }

  /**
   * Format time for VTT format (HH:MM:SS.mmm)
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Format time for SRT format (HH:MM:SS,mmm)
   */
  private formatTimeForSRT(seconds: number): string {
    return this.formatTime(seconds).replace('.', ',');
  }

  /**
   * Assess transcript quality from language info
   */
  private assessTranscriptQuality(languages: any[]): 'high' | 'medium' | 'low' | 'unknown' {
    if (languages.length === 0) return 'unknown';
    
    // Prefer manual captions over auto-generated
    const hasManual = languages.some(lang => !lang.isAutoGenerated);
    if (hasManual) return 'high';
    
    // Auto-generated captions are medium quality
    return 'medium';
  }
  
  /**
   * Analyze video content using AI
   * Implemented with TASK_010 OpenAI API integration
   */
  async analyzeVideo(request: AnalyzeVideoRequest): Promise<ApiResponse<VideoAnalysis>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get processed transcript for analysis
      const transcriptResult = await this.getProcessedTranscript(request.videoId);
      
      if (!transcriptResult.success || !transcriptResult.data) {
        return {
          success: false,
          error: 'Failed to get transcript for analysis',
          timestamp: new Date(),
        };
      }

      const transcript = transcriptResult.data;

      // Get user's categories for analysis (placeholder - will be from TASK_012)
      const userCategories = await this.getUserCategories(user.id);

      // Determine analysis depth based on request type
      const analysisDepth = this.getAnalysisDepth(request.analysisType || 'quick');

      // Prepare analysis request
      const analysisRequest: AnalysisRequest = {
        videoId: request.videoId,
        transcript: transcript.text,
        categories: userCategories,
        depth: analysisDepth,
        options: {
          includeInsights: true,
          includeCategoryAnalysis: true,
          maxCost: 0.10 // Per-video cost limit
        }
      };

      // Perform AI analysis
      const { openAIAnalysis } = await import('../lib/openai-analysis');
      const analysisResult = await openAIAnalysis.analyzeVideo(analysisRequest);

      // Convert to VideoAnalysis format
      const videoAnalysis: VideoAnalysis = {
        id: crypto.randomUUID() as any, // TODO: Fix type in TASK_012
        video_id: request.videoId,
        category_id: request.categoryId || null,
        user_id: user.id,
        relevance_score: this.calculateOverallRelevance(analysisResult.relevanceScores),
        content_insights: {
          summary: analysisResult.insights.summary,
          difficulty: analysisResult.insights.difficulty,
          topics: analysisResult.insights.mainTopics,
          learning_objectives: analysisResult.insights.learningObjectives,
          estimated_duration: analysisResult.insights.estimatedLearningTime,
          quality_score: this.calculateQualityScore(analysisResult.insights.contentQuality)
        },
        category_suggestions: analysisResult.categoryAnalysis.categoryMatches.map(match => ({
          category_id: match.categoryId,
          relevance_score: match.relevanceScore,
          confidence: match.confidence,
          matched_keywords: match.matchedKeywords
        })),
        processing_metadata: {
          model_used: analysisResult.insights.modelUsed,
          tokens_used: analysisResult.insights.tokensUsed,
          cost: analysisResult.insights.estimatedCost,
          processing_time: analysisResult.processingTime,
          analysis_version: analysisResult.insights.analysisVersion,
          cache_key: analysisResult.cacheKey
        },
        confidence_score: analysisResult.insights.confidence,
        analyzed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      // TODO: Save to database in TASK_012
      // await this.saveVideoAnalysis(videoAnalysis);

      return {
        success: true,
        data: videoAnalysis,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze video',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user's categories for analysis (placeholder for TASK_012)
   */
  private async getUserCategories(userId: string): Promise<Array<{
    id: string;
    name: string;
    keywords: string[];
  }>> {
    // TODO: Replace with actual Supabase query in TASK_012
    // For now, return some default categories
    return [
      {
        id: 'programming',
        name: 'Programming',
        keywords: ['code', 'programming', 'development', 'software', 'javascript', 'python', 'react']
      },
      {
        id: 'tutorial',
        name: 'Tutorial',
        keywords: ['tutorial', 'how to', 'guide', 'step by step', 'learn', 'beginner']
      },
      {
        id: 'technology',
        name: 'Technology',
        keywords: ['tech', 'technology', 'innovation', 'digital', 'computer', 'AI', 'machine learning']
      }
    ];
  }

  /**
   * Get analysis depth based on request type
   */
  private getAnalysisDepth(analysisType: 'quick' | 'detailed' | 'comprehensive'): AnalysisDepth {
    switch (analysisType) {
      case 'quick': return 'basic';
      case 'detailed': return 'standard';
      case 'comprehensive': return 'deep';
      default: return 'basic';
    }
  }

  /**
   * Calculate overall relevance score
   */
  private calculateOverallRelevance(relevanceScores: Record<string, number>): number {
    const scores = Object.values(relevanceScores);
    if (scores.length === 0) return 0;
    
    // Return the highest relevance score
    return Math.max(...scores);
  }

  /**
   * Calculate quality score from content quality metrics
   */
  private calculateQualityScore(contentQuality: {
    clarity: number;
    completeness: number;
    practicalValue: number;
  }): number {
    return Math.round((contentQuality.clarity + contentQuality.completeness + contentQuality.practicalValue) / 3);
  }
  
  /**
   * Get video analysis by ID
   */
  async getVideoAnalysis(videoId: VideoId, categoryId?: CategoryId): Promise<ApiResponse<VideoAnalysis>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_012
      // let query = supabase
      //   .from('video_analyses')
      //   .select('*')
      //   .eq('video_id', videoId)
      //   .eq('user_id', user.id);
      
      // if (categoryId) {
      //   query = query.eq('category_id', categoryId);
      // }
      
      // const { data, error } = await query.single();
      
      // Placeholder - will be replaced with actual database query
      throw new Error('Video analysis not found');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch video analysis',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Search videos with advanced filters
   */
  async searchVideosWithFilters(
    query: string, 
    filters: VideoFilters = {}
  ): Promise<ApiResponse<Video[]>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase search query in TASK_012
      // Implement full-text search with advanced filters
      
      // Placeholder - will be replaced with actual search implementation
      return {
        success: true,
        data: [],
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search videos',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get videos by category
   */
  async getVideosByCategory(
    categoryId: CategoryId, 
    options: GetVideosRequest = {}
  ): Promise<PaginatedResponse<Video>> {
    try {
      // Filter videos by category
      const modifiedRequest = {
        ...options,
        categories: [categoryId],
      };
      
      return await this.getVideos(modifiedRequest);
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch videos by category',
        timestamp: new Date(),
        pagination: {
          page: 0,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }
  
  /**
   * Bulk operations for videos
   */
  async bulkUpdateVideos(
    videoIds: VideoId[], 
    updates: Partial<Video>
  ): Promise<ApiResponse<Video[]>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase bulk update in TASK_012
      // const { data, error } = await supabase
      //   .from('videos')
      //   .update(updates)
      //   .in('youtube_id', videoIds)
      //   .eq('user_id', user.id)
      //   .select();
      
      // Placeholder - will be replaced with actual bulk update
      return {
        success: true,
        data: [],
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update videos',
        timestamp: new Date(),
      };
    }
  }
}

// Export singleton instance
export const videosApi = VideosApi.getInstance();

// Export convenience functions
export const {
  searchVideos,
  getVideos,
  getVideo,
  saveVideo,
  deleteVideo,
  getTranscript,
  analyzeVideo,
  getVideoAnalysis,
  searchVideosWithFilters,
  getVideosByCategory,
  bulkUpdateVideos,
} = videosApi;

// Video API Service for TASK_007_004
// Category-based video filtering and YouTube integration

/**
 * Default YouTube category mappings for Learning Tube
 * Based on YouTube's official video categories
 */
const DEFAULT_YOUTUBE_CATEGORY_MAPPINGS: Record<string, string[]> = {
  // Education & Learning
  '27': ['Education', 'Academic', 'Tutorial'], // Education
  '26': ['HowTo', 'Tutorial', 'Skill'], // Howto & Style
  '24': ['Entertainment', 'Gaming'], // Entertainment
  '22': ['Vlog', 'Lifestyle', 'Personal'], // People & Blogs
  '28': ['Technology', 'Science'], // Science & Technology
  
  // News & Information
  '25': ['News', 'Current Events'], // News & Politics
  '23': ['Comedy', 'Entertainment'], // Comedy
  '2': ['Automotive', 'Transportation'], // Autos & Vehicles
  '19': ['Travel', 'Adventure'], // Travel & Events
  '17': ['Sports', 'Fitness'], // Sports
  
  // Creative Content
  '1': ['Film', 'Cinema', 'Movies'], // Film & Animation
  '10': ['Music', 'Audio'], // Music
  '15': ['Animals', 'Nature'], // Pets & Animals
  '20': ['Gaming', 'Interactive'], // Gaming
  '29': ['Nonprofit', 'Social'], // Nonprofits & Activism
};

/**
 * Enhanced video API service with category integration
 */
export class VideoService {
  private youtubeClient?: YouTubeApiClient;
  private categoryMappings: Map<string, YouTubeCategoryMapping> = new Map();
  private syncStatus: CategorySyncStatus;

  constructor() {
    this.syncStatus = {
      lastSync: new Date(0),
      youtubeCategories: { total: 0, mapped: 0, unmapped: 0 },
      learningTubeCategories: { total: 0, withMappings: 0, withoutMappings: 0 },
      syncHealth: 'needs_attention',
      pendingUpdates: 0,
    };
  }

  /**
   * Initialize the video service with YouTube API client
   */
  async initialize(): Promise<void> {
    try {
      this.youtubeClient = new YouTubeApiClient();
      await this.youtubeClient.initialize();
      await this.syncYouTubeCategories();
    } catch (error) {
      console.error('Failed to initialize VideoService:', error);
      throw new Error('VideoService initialization failed');
    }
  }

  /**
   * Search videos with category-based filtering
   */
  async searchVideosWithCategories(
    query: string,
    options?: CategoryFilteringOptions
  ): Promise<{
    videos: ProcessedSearchResult[];
    categoryMappings: CategoryMappingResult[];
    totalResults: number;
    appliedFilters: CategoryBasedVideoFilters;
  }> {
    if (!this.youtubeClient) {
      throw new Error('VideoService not initialized');
    }

    // Build search request with category filters
    const searchRequest = this.buildCategoryAwareSearchRequest(query, options);
    
    // Execute search
    const searchResults = await this.youtubeClient.search(query, {
      maxResults: options?.maxResults || 25,
      order: options?.order || 'relevance',
      type: options?.type || 'video',
      ...this.convertCategoryFiltersToYouTubeParams(options?.categoryFilters),
    });

    // Process results and map categories
    const categoryMappings: CategoryMappingResult[] = [];
    const processedVideos: ProcessedSearchResult[] = [];

    for (const item of searchResults.items) {
      if (item.id?.kind === 'youtube#video' && item.id?.videoId) {
        const videoId = item.id.videoId as YouTubeVideoId;
        
        // Map categories if requested
        if (options?.autoMapCategories) {
          const mapping = await this.mapVideoToCategories(videoId, options);
          categoryMappings.push(mapping);
        }

        processedVideos.push({
          ...item,
          categoryMapping: options?.autoMapCategories ? 
            categoryMappings.find(m => m.videoId === videoId) : undefined,
        });
      }
    }

    return {
      videos: processedVideos,
      categoryMappings,
      totalResults: searchResults.pagination.totalResults || 0,
      appliedFilters: options?.categoryFilters || {},
    };
  }

  /**
   * Get detailed video information with category analysis
   */
  async getVideoWithCategoryAnalysis(
    videoId: YouTubeVideoId,
    options?: {
      includeMapping?: boolean;
      includeClassification?: boolean;
      learningTubeCategories?: CategoryId[];
    }
  ): Promise<{
    video: DetailedYouTubeVideo;
    categoryMapping?: CategoryMappingResult;
    classification?: VideoClassificationResult;
  }> {
    if (!this.youtubeClient) {
      throw new Error('VideoService not initialized');
    }

    // Get detailed video information
    const videos = await this.youtubeClient.getDetailedVideoInfo([videoId], {
      includeStatistics: true,
      includeContentDetails: true,
      includeTopicDetails: true,
      processMetadata: true,
    });

    if (videos.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const video = videos[0];
    const result: {
      video: DetailedYouTubeVideo;
      categoryMapping?: CategoryMappingResult;
      classification?: VideoClassificationResult;
    } = { video };

    // Add category mapping if requested
    if (options?.includeMapping) {
      result.categoryMapping = await this.mapVideoToCategories(videoId, {
        learningTubeCategories: options.learningTubeCategories,
        autoMapCategories: true,
      });
    }

    // Add classification if requested
    if (options?.includeClassification) {
      result.classification = await this.classifyVideo(video);
    }

    return result;
  }

  /**
   * Filter videos by Learning Tube categories
   */
  async filterVideosByCategories(
    videos: YouTubeVideo[],
    categoryIds: CategoryId[],
    options?: {
      mode?: 'strict' | 'fuzzy' | 'related';
      confidenceThreshold?: number;
    }
  ): Promise<{
    filtered: YouTubeVideo[];
    mappings: CategoryMappingResult[];
    confidence: number;
  }> {
    const mappings: CategoryMappingResult[] = [];
    const filtered: YouTubeVideo[] = [];
    
    for (const video of videos) {
      const videoId = video.id as YouTubeVideoId;
      const mapping = await this.mapVideoToCategories(videoId, {
        learningTubeCategories: categoryIds,
        confidenceThreshold: options?.confidenceThreshold || 0.5,
      });
      
      mappings.push(mapping);
      
      // Check if video matches any of the target categories
      const hasMatch = mapping.suggestedLearningTubeCategories.some(
        suggestion => categoryIds.includes(suggestion.categoryId) &&
        suggestion.confidence >= (options?.confidenceThreshold || 0.5)
      );
      
      if (hasMatch) {
        filtered.push(video);
      }
    }

    const averageConfidence = mappings.reduce(
      (sum, mapping) => sum + (mapping.suggestedLearningTubeCategories[0]?.confidence || 0),
      0
    ) / mappings.length;

    return {
      filtered,
      mappings,
      confidence: averageConfidence,
    };
  }

  /**
   * Get category analytics and insights
   */
  async getCategoryAnalytics(categoryId: CategoryId): Promise<CategoryAnalytics> {
    // This would typically integrate with analytics storage
    // For now, return mock analytics structure
    return {
      categoryId,
      youtubeMapping: {
        mappedYouTubeCategories: [],
        videoCount: 0,
        totalViews: 0,
        averageEngagement: 0,
      },
      performance: {
        searchFrequency: 0,
        clickThroughRate: 0,
        userSatisfaction: 0,
        popularKeywords: [],
      },
      trends: {
        growthRate: 0,
        seasonality: [],
        emergingTopics: [],
      },
      recommendations: {
        suggestedMappings: [],
        optimizationTips: [],
        relatedCategories: [],
      },
    };
  }

  /**
   * Sync YouTube categories and update mappings
   */
  async syncYouTubeCategories(regionCode: string = 'US'): Promise<CategorySyncOperation> {
    const operation: CategorySyncOperation = {
      operation: 'fetch_youtube_categories',
      status: 'running',
      progress: 0,
      startTime: new Date(),
      details: `Syncing YouTube categories for region: ${regionCode}`,
    };

    try {
      if (!this.youtubeClient) {
        throw new Error('YouTube client not initialized');
      }

      // Fetch YouTube categories
      operation.progress = 25;
      const categories = await this.fetchYouTubeCategories(regionCode);
      
      // Update mappings
      operation.progress = 50;
      await this.updateCategoryMappings(categories);
      
      // Update sync status
      operation.progress = 75;
      this.syncStatus = {
        lastSync: new Date(),
        youtubeCategories: {
          total: categories.length,
          mapped: this.categoryMappings.size,
          unmapped: Math.max(0, categories.length - this.categoryMappings.size),
        },
        learningTubeCategories: {
          total: 0, // Would be populated from store
          withMappings: 0,
          withoutMappings: 0,
        },
        syncHealth: 'healthy',
        pendingUpdates: 0,
      };

      operation.progress = 100;
      operation.status = 'completed';
      operation.endTime = new Date();
      operation.details = `Successfully synced ${categories.length} YouTube categories`;

    } catch (error) {
      operation.status = 'failed';
      operation.endTime = new Date();
      operation.errors = [error instanceof Error ? error.message : String(error)];
    }

    return operation;
  }

  /**
   * Get current category sync status
   */
  getCategorySyncStatus(): CategorySyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Batch process videos for category mapping
   */
  async batchProcessVideos(
    videoIds: YouTubeVideoId[],
    operations: ('classify' | 'map_categories' | 'extract_metadata')[]
  ): Promise<VideoCategoryBatchJob> {
    const job: VideoCategoryBatchJob = {
      id: this.generateJobId(),
      videoIds,
      operations,
      status: 'processing',
      progress: {
        total: videoIds.length,
        processed: 0,
        failed: 0,
        percentage: 0,
      },
      results: [],
      createdAt: new Date(),
    };

    // Process videos in batches
    const batchSize = 10;
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      
      for (const videoId of batch) {
        try {
          if (operations.includes('map_categories')) {
            const mapping = await this.mapVideoToCategories(videoId);
            job.results.push(mapping);
          }
          
          job.progress.processed++;
        } catch (error) {
          job.progress.failed++;
          console.error(`Failed to process video ${videoId}:`, error);
        }
        
        job.progress.percentage = (job.progress.processed / job.progress.total) * 100;
      }
    }

    job.status = job.progress.failed === 0 ? 'completed' : 'completed';
    job.completedAt = new Date();

    return job;
  }

  // Private helper methods

  private buildCategoryAwareSearchRequest(
    query: string,
    options?: CategoryFilteringOptions
  ): CategoryAwareSearchRequest {
    return {
      q: query,
      part: ['snippet', 'id'],
      maxResults: options?.maxResults || 25,
      order: options?.order || 'relevance',
      type: options?.type || 'video',
      learningTubeCategoryIds: options?.categoryFilters?.learningTubeCategories,
      categoryFilterMode: 'fuzzy',
      youtubeCategoryId: options?.categoryFilters?.youtubeCategoryIds?.[0],
    };
  }

  private convertCategoryFiltersToYouTubeParams(
    filters?: CategoryBasedVideoFilters
  ): Partial<SearchOptions> {
    if (!filters) return {};

    const params: Partial<SearchOptions> = {};

    // Duration filtering
    if (filters.duration?.youtubeDuration) {
      params.videoDuration = filters.duration.youtubeDuration;
    }

    // Quality filtering
    if (filters.quality?.definition) {
      params.videoDefinition = filters.quality.definition;
    }
    if (filters.quality?.dimension) {
      params.videoDimension = filters.quality.dimension;
    }
    if (filters.quality?.caption) {
      params.videoCaption = filters.quality.caption;
    }
    if (filters.quality?.license) {
      params.videoLicense = filters.quality.license;
    }

    // Safety filtering
    if (filters.safeSearch) {
      params.safeSearch = filters.safeSearch;
    }

    // Geographic filtering
    if (filters.regionCode) {
      params.regionCode = filters.regionCode;
    }
    if (filters.relevanceLanguage) {
      params.relevanceLanguage = filters.relevanceLanguage;
    }

    // Date filtering
    if (filters.uploadDate?.after) {
      params.publishedAfter = filters.uploadDate.after.toISOString();
    }
    if (filters.uploadDate?.before) {
      params.publishedBefore = filters.uploadDate.before.toISOString();
    }

    return params;
  }

  private async mapVideoToCategories(
    videoId: YouTubeVideoId,
    options?: {
      learningTubeCategories?: CategoryId[];
      confidenceThreshold?: number;
    }
  ): Promise<CategoryMappingResult> {
    // This would integrate with AI classification service
    // For now, return a basic mapping structure
    return {
      videoId,
      youtubeCategory: {
        id: '27', // Education
        name: 'Education',
      },
      suggestedLearningTubeCategories: [],
      mappingQuality: 'medium',
    };
  }

  private async classifyVideo(video: DetailedYouTubeVideo): Promise<VideoClassificationResult> {
    // This would integrate with AI classification service
    return {
      videoId: video.id as YouTubeVideoId,
      classifications: {
        youtubeCategory: video.snippet?.categoryId || 'Unknown',
        learningTubeCategories: [],
        topics: [],
        keywords: [],
        educationalLevel: 'intermediate',
        contentType: 'tutorial',
      },
      confidence: {
        overall: 0.8,
        categoryMapping: 0.7,
        topicExtraction: 0.9,
        levelAssignment: 0.6,
      },
      processingMetadata: {
        timestamp: new Date(),
        version: '1.0.0',
        processingTime: 150,
      },
    };
  }

  private async fetchYouTubeCategories(regionCode: string): Promise<YouTubeCategory[]> {
    if (!this.youtubeClient) {
      throw new Error('YouTube client not initialized');
    }

    // This would call the actual YouTube API
    // For now, return mock categories based on the official list
    const mockCategories: YouTubeCategory[] = Object.keys(DEFAULT_YOUTUBE_CATEGORY_MAPPINGS).map(id => ({
      kind: 'youtube#videoCategory' as const,
      etag: `etag_${id}`,
      id,
      snippet: {
        channelId: 'UCBR8-60-B28hp2BmDPdntcQ',
        title: DEFAULT_YOUTUBE_CATEGORY_MAPPINGS[id][0],
        assignable: true,
      },
    }));

    return mockCategories;
  }

  private async updateCategoryMappings(categories: YouTubeCategory[]): Promise<void> {
    this.categoryMappings.clear();
    
    for (const category of categories) {
      const mapping: YouTubeCategoryMapping = {
        youtubeId: category.id,
        youtubeName: category.snippet.title,
        learningTubeCategories: [],
        isAssignable: category.snippet.assignable,
        description: `YouTube category: ${category.snippet.title}`,
        mappingConfidence: 0.8,
        lastUpdated: new Date(),
      };
      
      this.categoryMappings.set(category.id, mapping);
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const videoService = new VideoService(); 
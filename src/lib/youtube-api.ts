// YouTube Data API v3 Client Implementation

import type {
  YouTubeApiKey,
  YouTubeVideoId,
  YouTubeChannelId,
  YouTubePlaylistId,
  YouTubeVideo,
  YouTubeVideoResponse,
  YouTubeSearchResponse,
  YouTubeChannelResponse,
  YouTubePlaylistResponse,
  YouTubeApiResponse,
  YouTubeError,
  QuotaInfo,
  QuotaUnits,
  YouTubeClientOptions,
  YouTubeApiConfig,
  VideoRequest,
  SearchRequest,
  BaseApiRequest,
  YouTubeApiCache,
  CachedApiResponse,
  ValidationResult,
  PaginatedSearchResponse,
  SearchOptions,
  SearchFilters,
  SearchMetrics,
  SearchResultGroup,
  PaginationInfo,
  ProcessedSearchResult,
  DetailedYouTubeVideo,
  DetailedVideoRequest,
  VideoDetailsOptions,
  VideoDetailsPart,
  EnhancedVideoStatistics,
  EnhancedContentDetails,
  VideoAnalytics,
  VideoCacheEntry,
  VideoCacheMetrics,
  ProcessedVideoDetails,
  VideoBatchRequest,
  VideoBatchResult,
  PopularVideosRequest,
  TrendingVideoMetrics,
  VideoQualityMetrics,
  VideoFilters,
  VideoComparison,
  VideoMetadata,
  YouTubeStatistics,
  YouTubeContentDetails,
} from '../types/youtube';

import {
  createApiKey,
  createQuotaUnits,
  createVideoId,
  createChannelId,
  OPERATION_COSTS,
  YouTubeErrorType,
} from '../types/youtube';

import {
  DEFAULT_YOUTUBE_CONFIG,
  QUOTA_LIMITS,
  DEFAULT_PARTS,
  FIELD_SELECTORS,
  CACHE_TTL,
  RATE_LIMITS,
  HTTP_STATUS_CODES,
  RETRYABLE_ERROR_CODES,
  YOUTUBE_ERROR_MESSAGES,
  DEFAULT_HEADERS,
  VALIDATION_PATTERNS,
  DEBUG_CONFIG,
  FEATURE_FLAGS,
} from './youtube-config';

import { supabase, supabaseService } from '../lib/supabase';

/**
 * YouTube Data API v3 Client with secure key management and quota tracking
 */
export class YouTubeApiClient {
  private apiKey: YouTubeApiKey | null = null;
  private config: YouTubeApiConfig;
  private cache: YouTubeApiCache = new Map();
  private quotaInfo: QuotaInfo;
  private circuitBreaker: {
    state: 'open' | 'closed' | 'half-open';
    failureCount: number;
    lastFailureTime: number;
    timeout: number;
  };
  private requestQueue: Array<{
    request: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    quotaCost: QuotaUnits;
    priority: number;
  }> = [];
  private isProcessingQueue = false;
  private enableCaching = true;
  private defaultRegion = 'US';

  // TASK_007_006: Enhanced Quota Management and Rate Limiting
  private quotaTracker = {
    daily: {
      used: 0,
      limit: 10000,
      resetTime: 0,
    },
    hourly: {
      used: 0,
      limit: 1000, // Conservative hourly limit
      resetTime: 0,
    },
    requests: {
      count: 0,
      window: 60000, // 1 minute window
      limit: 100, // Max requests per minute
      timestamps: [] as number[],
    },
  };

  private rateLimiter = {
    buckets: new Map<string, {
      tokens: number;
      lastRefill: number;
      capacity: number;
      refillRate: number;
    }>(),
    defaultCapacity: 10,
    defaultRefillRate: 1, // tokens per second
  };

  constructor(options?: Partial<YouTubeClientOptions>) {
    this.config = { ...DEFAULT_YOUTUBE_CONFIG, ...(options?.config || {}) };
    this.quotaInfo = this.initializeQuotaInfo();

    // Initialize API key if provided
    if (options?.apiKey) {
      this.apiKey = options.apiKey;
    }

    // Start cache cleanup interval
    if (FEATURE_FLAGS.ENABLE_CACHING) {
      setInterval(() => this.cleanupCache(), this.config.requestTimeout);
    }
  }

  /**
   * Initialize quota information with default values
   */
  private initializeQuotaInfo(): QuotaInfo {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(7, 0, 0, 0); // YouTube quota resets at 7 AM UTC
    if (resetTime <= now) {
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }

    return {
      dailyLimit: QUOTA_LIMITS.DAILY_LIMIT,
      used: createQuotaUnits(0),
      remaining: QUOTA_LIMITS.DAILY_LIMIT,
      resetTime,
      warningThreshold: QUOTA_LIMITS.WARNING_THRESHOLD,
      criticalThreshold: QUOTA_LIMITS.CRITICAL_THRESHOLD,
    };
  }

  /**
   * Securely retrieve API key from Supabase storage
   */
  private async getApiKeyFromStorage(): Promise<YouTubeApiKey | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('encrypted_youtube_key')
        .eq('user_id', user.id)
        .single();

      if (error) {
        this.logDebug('Failed to retrieve API key from storage:', error);
        return null;
      }

      if (!data?.encrypted_youtube_key) {
        return null;
      }

      // In a real implementation, you would decrypt the key here
      // For now, assuming it's stored securely but not encrypted
      const apiKey = data.encrypted_youtube_key;
      
      if (!this.validateApiKeyFormat(apiKey)) {
        throw new Error('Invalid API key format');
      }

      return createApiKey(apiKey);
    } catch (error) {
      this.logDebug('Error retrieving API key:', error);
      return null;
    }
  }

  /**
   * Validate API key format
   */
  private validateApiKeyFormat(key: string): boolean {
    return VALIDATION_PATTERNS.API_KEY.test(key);
  }

  /**
   * Ensure API key is available for requests
   */
  private async ensureApiKey(): Promise<YouTubeApiKey> {
    if (this.apiKey) {
      return this.apiKey;
    }

    const storedKey = await this.getApiKeyFromStorage();
    if (!storedKey) {
      throw this.createError(
        YouTubeErrorType.AUTHENTICATION_ERROR,
        'No YouTube API key available. Please configure your API key in settings.',
        'authenticationRequired'
      );
    }

    this.apiKey = storedKey;
    return this.apiKey;
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.ensureApiKey();
      const testUrl = `${this.config.baseUrl}/videos?part=snippet&id=dQw4w9WgXcQ&key=${apiKey}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: DEFAULT_HEADERS,
        signal: AbortSignal.timeout(this.config.requestTimeout),
      });

      return response.ok;
    } catch (error) {
      this.logDebug('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Create a standardized YouTube error
   */
  private createError(
    type: YouTubeErrorType,
    message: string,
    code: string,
    httpStatus?: number,
    details?: Record<string, any>
  ): YouTubeError {
    const error = new Error(message) as YouTubeError;
    error.type = type;
    error.code = code;
    error.httpStatus = httpStatus;
    error.details = details;
    error.retryable = this.isRetryableError(type, httpStatus);
    error.userMessage = this.getUserFriendlyMessage(type);
    error.timestamp = new Date();
    
    return error;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(type: YouTubeErrorType, httpStatus?: number): boolean {
    if (httpStatus && RETRYABLE_ERROR_CODES.includes(httpStatus as any)) {
      return true;
    }
    
    return [
      YouTubeErrorType.NETWORK_ERROR,
      YouTubeErrorType.RATE_LIMITED,
      YouTubeErrorType.SERVER_ERROR
    ].includes(type);
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(type: YouTubeErrorType): string {
    switch (type) {
      case YouTubeErrorType.QUOTA_EXCEEDED:
        return YOUTUBE_ERROR_MESSAGES.QUOTA_EXCEEDED;
      case YouTubeErrorType.AUTHENTICATION_ERROR:
        return YOUTUBE_ERROR_MESSAGES.INVALID_API_KEY;
      case YouTubeErrorType.RATE_LIMITED:
        return YOUTUBE_ERROR_MESSAGES.RATE_LIMITED;
      case YouTubeErrorType.NOT_FOUND:
        return YOUTUBE_ERROR_MESSAGES.VIDEO_NOT_FOUND;
      case YouTubeErrorType.NETWORK_ERROR:
        return YOUTUBE_ERROR_MESSAGES.NETWORK_ERROR;
      default:
        return YOUTUBE_ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  /**
   * Check circuit breaker status
   */
  private checkCircuitBreaker(): void {
    if (!FEATURE_FLAGS.ENABLE_CIRCUIT_BREAKER) return;

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (this.circuitBreaker.state === 'open') {
      if (this.circuitBreaker.lastFailureTime && this.circuitBreaker.lastFailureTime < fiveMinutesAgo.getTime()) {
        this.circuitBreaker.state = 'half-open';
        this.circuitBreaker.failureCount = 0;
      } else {
        throw this.createError(
          YouTubeErrorType.SERVER_ERROR,
          'Circuit breaker is open. Please try again later.',
          'circuitBreakerOpen'
        );
      }
    }
  }

  /**
   * Record API request success/failure for circuit breaker
   */
  private recordRequestResult(success: boolean): void {
    if (!FEATURE_FLAGS.ENABLE_CIRCUIT_BREAKER) return;

    if (success) {
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.state = 'closed';
    } else {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = new Date().getTime();
      
      if (this.circuitBreaker.failureCount >= 5) {
        this.circuitBreaker.state = 'open';
      }
    }
  }

  /**
   * Check quota availability for operation
   */
  private checkQuotaAvailability(cost: QuotaUnits): void {
    if (!FEATURE_FLAGS.ENABLE_QUOTA_MANAGEMENT) return;

    if (this.quotaInfo.remaining < cost) {
      throw this.createError(
        YouTubeErrorType.QUOTA_EXCEEDED,
        `Insufficient quota. Required: ${cost}, Available: ${this.quotaInfo.remaining}`,
        'quotaExceeded'
      );
    }
  }

  /**
   * Update quota usage after API call
   */
  private updateQuotaUsage(cost: QuotaUnits): void {
    if (!FEATURE_FLAGS.ENABLE_QUOTA_MANAGEMENT) return;

    this.quotaInfo.used = createQuotaUnits(Number(this.quotaInfo.used) + Number(cost));
    this.quotaInfo.remaining = createQuotaUnits(Number(this.quotaInfo.dailyLimit) - Number(this.quotaInfo.used));

    // Log quota warnings
    if (this.quotaInfo.remaining <= createQuotaUnits(Number(this.quotaInfo.dailyLimit) * 0.1)) {
      this.logDebug('⚠️ Quota warning: Less than 10% remaining');
    }
  }

  /**
   * Get cached response if available and valid
   */
  private getCachedResponse<T>(cacheKey: string): T | null {
    if (!FEATURE_FLAGS.ENABLE_CACHING) return null;

    const cached = this.cache.get(cacheKey) as CachedApiResponse<T> | undefined;
    if (!cached) return null;

    const now = new Date();
    if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache API response
   */
  private setCachedResponse<T>(cacheKey: string, data: T, ttl: number): void {
    if (!FEATURE_FLAGS.ENABLE_CACHING) return;

    this.cache.set(cacheKey, {
      data,
      timestamp: new Date(),
      ttl,
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    if (!FEATURE_FLAGS.ENABLE_CACHING) return;

    const now = new Date();
    for (const [key, cached] of this.cache.entries()) {
      if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Core HTTP request method with error handling and retries
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any>,
    operationType: keyof typeof OPERATION_COSTS
  ): Promise<T> {
    this.checkCircuitBreaker();
    
    const cost = OPERATION_COSTS[operationType];
    this.checkQuotaAvailability(cost);

    const apiKey = await this.ensureApiKey();
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    
    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });
    
    url.searchParams.set('key', apiKey);

    // Check cache first
    const cacheKey = url.toString();
    const cached = this.getCachedResponse<T>(cacheKey);
    if (cached) {
      this.logDebug('Cache hit for:', endpoint);
      return cached;
    }

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.config.retryAttempts) {
      try {
        this.logDebug(`Making request to: ${endpoint} (attempt ${attempts + 1})`);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: DEFAULT_HEADERS,
          signal: AbortSignal.timeout(this.config.requestTimeout),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw this.createError(
            this.mapHttpStatusToErrorType(response.status),
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
            errorData.error?.code || String(response.status),
            response.status,
            errorData
          );
        }

        const data = await response.json();
        
        // Update quota and record success
        this.updateQuotaUsage(cost);
        this.recordRequestResult(true);
        
        // Cache the response
        this.setCachedResponse(cacheKey, data, CACHE_TTL.VIDEO_DETAILS);
        
        this.logDebug('Request successful:', endpoint);
        return data;

      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        this.recordRequestResult(false);
        
        // Don't retry non-retryable errors
        if (error instanceof Error && 'retryable' in error && !error.retryable) {
          break;
        }
        
        // Wait before retry with exponential backoff
        if (attempts < this.config.retryAttempts) {
          const delay = Math.min(
            RATE_LIMITS.BACKOFF_BASE_DELAY * Math.pow(RATE_LIMITS.BACKOFF_MULTIPLIER, attempts - 1),
            RATE_LIMITS.BACKOFF_MAX_DELAY
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || this.createError(
      YouTubeErrorType.UNKNOWN_ERROR,
      'Request failed after all retry attempts',
      'maxRetriesExceeded'
    );
  }

  /**
   * Map HTTP status codes to error types
   */
  private mapHttpStatusToErrorType(status: number): YouTubeErrorType {
    switch (status) {
      case HTTP_STATUS_CODES.UNAUTHORIZED:
        return YouTubeErrorType.AUTHENTICATION_ERROR;
      case HTTP_STATUS_CODES.FORBIDDEN:
        return YouTubeErrorType.QUOTA_EXCEEDED;
      case HTTP_STATUS_CODES.NOT_FOUND:
        return YouTubeErrorType.NOT_FOUND;
      case HTTP_STATUS_CODES.TOO_MANY_REQUESTS:
        return YouTubeErrorType.RATE_LIMITED;
      case HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS_CODES.SERVICE_UNAVAILABLE:
        return YouTubeErrorType.SERVER_ERROR;
      default:
        return YouTubeErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * Log debug information if enabled
   */
  private logDebug(message: string, ...args: any[]): void {
    if (DEBUG_CONFIG.ENABLE_REQUEST_LOGGING) {
      console.log(`[YouTube API Client] ${message}`, ...args);
    }
  }

  /**
   * Get detailed video information
   */
  async getVideoDetails(videoIds: YouTubeVideoId[], options?: Partial<VideoRequest>): Promise<YouTubeVideo[]> {
    if (videoIds.length === 0) {
      return [];
    }

    const params = {
      part: options?.part?.join(',') || DEFAULT_PARTS.VIDEO_DETAILS.join(','),
      id: videoIds.join(','),
      maxResults: options?.maxResults || this.config.defaultMaxResults,
      fields: options?.fields || FIELD_SELECTORS.VIDEO_COMPLETE,
    };

    const response = await this.makeRequest<YouTubeVideoResponse>('videos', params, 'videosList');
    return response.items;
  }

  /**
   * Get single video details with validation
   */
  async getVideo(videoId: YouTubeVideoId): Promise<YouTubeVideo | null> {
    const videos = await this.getVideoDetails([videoId]);
    return videos.length > 0 ? videos[0] : null;
  }

  /**
   * Batch process multiple video IDs efficiently
   */
  async batchGetVideoDetails(videoIds: YouTubeVideoId[]): Promise<Map<YouTubeVideoId, YouTubeVideo>> {
    const result = new Map<YouTubeVideoId, YouTubeVideo>();
    
    // Process in batches of 50 (YouTube API limit)
    const batchSize = 50;
    const batches: YouTubeVideoId[][] = [];
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      batches.push(videoIds.slice(i, i + batchSize));
    }

    // Process batches in parallel (but limited)
    const parallelLimit = RATE_LIMITS.CONCURRENT_REQUESTS;
    for (let i = 0; i < batches.length; i += parallelLimit) {
      const currentBatches = batches.slice(i, i + parallelLimit);
      
      const promises = currentBatches.map(batch => this.getVideoDetails(batch));
      const results = await Promise.all(promises);
      
      results.forEach(videos => {
        videos.forEach(video => {
          result.set(video.id, video);
        });
      });
    }

    return result;
  }

  /**
   * Get current quota status
   */
  async getQuotaStatus(): Promise<QuotaInfo> {
    return { ...this.quotaInfo };
  }

  /**
   * Reset quota information (called automatically at reset time)
   */
  resetQuota(): void {
    this.quotaInfo = this.initializeQuotaInfo();
    this.logDebug('Quota reset completed');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.logDebug('Cache cleared');
  }

  /**
   * Dispose of the client and cleanup resources
   */
  dispose(): void {
    this.clearCache();
    this.apiKey = null;
    this.requestQueue = [];
  }

  /**
   * Search for videos, channels, and playlists
   */
  async search(query: string, options?: SearchOptions): Promise<PaginatedSearchResponse> {
    const searchParams = this.buildSearchParams(query, options);
    const metrics = this.createSearchMetrics(query, options);
    
    try {
      const startTime = Date.now();
      const response = await this.makeRequest<YouTubeSearchResponse>('search', searchParams, 'search');
      
      metrics.queryTime = Date.now() - startTime;
      metrics.totalResults = response.pageInfo.totalResults;
      metrics.actualResults = response.items.length;
      
      const paginatedResponse = this.processPaginatedSearchResponse(response, options);
      
      this.logDebug('Search completed:', {
        query,
        results: paginatedResponse.items.length,
        quota: metrics.quotaCost,
      });
      
      return paginatedResponse;
    } catch (error) {
      this.logDebug('Search failed:', error);
      throw error;
    }
  }

  /**
   * Search for videos only
   */
  async searchVideos(query: string, options?: SearchOptions): Promise<PaginatedSearchResponse> {
    const videoOptions = { ...options, filters: { ...options?.filters } };
    const searchParams = this.buildSearchParams(query, videoOptions, 'video');
    
    const response = await this.makeRequest<YouTubeSearchResponse>('search', searchParams, 'search');
    return this.processPaginatedSearchResponse(response, videoOptions);
  }

  /**
   * Search for channels only
   */
  async searchChannels(query: string, options?: SearchOptions): Promise<PaginatedSearchResponse> {
    const channelOptions = { ...options, filters: { ...options?.filters } };
    const searchParams = this.buildSearchParams(query, channelOptions, 'channel');
    
    const response = await this.makeRequest<YouTubeSearchResponse>('search', searchParams, 'search');
    return this.processPaginatedSearchResponse(response, channelOptions);
  }

  /**
   * Search for playlists only
   */
  async searchPlaylists(query: string, options?: SearchOptions): Promise<PaginatedSearchResponse> {
    const playlistOptions = { ...options, filters: { ...options?.filters } };
    const searchParams = this.buildSearchParams(query, playlistOptions, 'playlist');
    
    const response = await this.makeRequest<YouTubeSearchResponse>('search', searchParams, 'search');
    return this.processPaginatedSearchResponse(response, playlistOptions);
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(query: string, filters: SearchFilters, options?: Omit<SearchOptions, 'filters'>): Promise<PaginatedSearchResponse> {
    const searchOptions: SearchOptions = { ...options, filters };
    return this.search(query, searchOptions);
  }

  /**
   * Search within a specific channel
   */
  async searchInChannel(channelId: YouTubeChannelId, query?: string, options?: SearchOptions): Promise<PaginatedSearchResponse> {
    const channelOptions: SearchOptions = { ...options, channelId };
    return this.search(query || '', channelOptions);
  }

  /**
   * Get next page of search results
   */
  async getNextSearchPage(previousResponse: PaginatedSearchResponse, query: string, options?: SearchOptions): Promise<PaginatedSearchResponse | null> {
    if (!previousResponse.pagination.hasNextPage || !previousResponse.pagination.nextPageToken) {
      return null;
    }

    const nextOptions: SearchOptions = {
      ...options,
      pageToken: previousResponse.pagination.nextPageToken,
    };

    return this.search(query, nextOptions);
  }

  /**
   * Get previous page of search results
   */
  async getPrevSearchPage(previousResponse: PaginatedSearchResponse, query: string, options?: SearchOptions): Promise<PaginatedSearchResponse | null> {
    if (!previousResponse.pagination.hasPrevPage || !previousResponse.pagination.prevPageToken) {
      return null;
    }

    const prevOptions: SearchOptions = {
      ...options,
      pageToken: previousResponse.pagination.prevPageToken,
    };

    return this.search(query, prevOptions);
  }

  /**
   * Search with auto-pagination (get all results)
   */
  async searchAll(query: string, options?: SearchOptions, maxPages: number = 10): Promise<ProcessedSearchResult[]> {
    const allResults: ProcessedSearchResult[] = [];
    let currentResponse = await this.search(query, options);
    
    allResults.push(...this.processSearchResults(currentResponse.items));
    
    let pageCount = 1;
    while (currentResponse.pagination.hasNextPage && pageCount < maxPages) {
      const nextResponse = await this.getNextSearchPage(currentResponse, query, options);
      if (nextResponse) {
        allResults.push(...this.processSearchResults(nextResponse.items));
        currentResponse = nextResponse;
        pageCount++;
      } else {
        break;
      }
    }
    
    this.logDebug(`Collected ${allResults.length} total results across ${pageCount} pages`);
    return allResults;
  }

  /**
   * Build search parameters from query and options
   */
  private buildSearchParams(query: string, options?: SearchOptions, forceType?: string): SearchRequest {
    const params: SearchRequest = {
      part: ['snippet'],
      maxResults: options?.maxResults || this.config.defaultMaxResults,
      fields: FIELD_SELECTORS.SEARCH_BASIC,
    };

    // Query parameter
    if (query.trim()) {
      params.q = this.sanitizeSearchQuery(query);
    }

    // Resource type
    params.type = (forceType as 'video' | 'channel' | 'playlist') || 'video,channel,playlist';

    // Basic options
    if (options?.order) params.order = options.order;
    if (options?.regionCode) params.regionCode = options.regionCode;
    if (options?.relevanceLanguage) params.relevanceLanguage = options.relevanceLanguage;
    if (options?.pageToken) params.pageToken = options.pageToken;
    if (options?.channelId) params.channelId = options.channelId;

    // Apply filters
    if (options?.filters) {
      this.applySearchFilters(params, options.filters);
    }

    return params;
  }

  /**
   * Apply search filters to parameters
   */
  private applySearchFilters(params: SearchRequest, filters: SearchFilters): void {
    // Video-specific filters (only apply if searching videos)
    if (!params.type || params.type.includes('video')) {
      if (filters.duration) {
        params.videoDuration = filters.duration === 'short' ? 'short' : 
                             filters.duration === 'medium' ? 'medium' : 
                             filters.duration === 'long' ? 'long' : 'any';
      }
      if (filters.definition) params.videoDefinition = filters.definition;
      if (filters.dimension) params.videoDimension = filters.dimension;
      if (filters.caption) params.videoCaption = filters.caption === 'closedCaption' ? 'closedCaption' : 'none';
      if (filters.license) params.videoLicense = filters.license;
      if (filters.embeddable !== undefined) params.videoEmbeddable = filters.embeddable ? 'true' : 'any';
      if (filters.syndicated !== undefined) params.videoSyndicated = filters.syndicated ? 'true' : 'any';
      if (filters.type) params.videoType = filters.type;
      if (filters.categoryId) params.videoCategoryId = filters.categoryId;
      if (filters.eventType) params.eventType = filters.eventType;
    }

    // Date filters
    if (filters.publishedAfter) {
      params.publishedAfter = filters.publishedAfter.toISOString();
    }
    if (filters.publishedBefore) {
      params.publishedBefore = filters.publishedBefore.toISOString();
    }

    // Safety and content filters
    if (filters.safeSearch) params.safeSearch = filters.safeSearch;

    // Location filters
    if (filters.location) {
      params.location = `${filters.location.lat},${filters.location.lng}`;
      if (filters.location.radius) {
        params.locationRadius = filters.location.radius;
      }
    }
  }

  /**
   * Sanitize search query for safe API usage
   */
  private sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .substring(0, 500); // Limit length
  }

  /**
   * Process paginated search response
   */
  private processPaginatedSearchResponse(
    response: YouTubeSearchResponse, 
    options?: SearchOptions
  ): PaginatedSearchResponse {
    const pagination: PaginationInfo = {
      nextPageToken: response.nextPageToken,
      prevPageToken: response.prevPageToken,
      totalResults: response.pageInfo.totalResults,
      resultsPerPage: response.pageInfo.resultsPerPage,
      currentPage: this.calculateCurrentPage(options?.pageToken, response.pageInfo.resultsPerPage),
      hasNextPage: !!response.nextPageToken,
      hasPrevPage: !!response.prevPageToken,
    };

    const grouped = this.groupSearchResults(response.items);

    return {
      items: response.items,
      pagination,
      regionCode: response.regionCode,
      etag: response.etag,
      grouped,
    };
  }

  /**
   * Group search results by type
   */
  private groupSearchResults(items: any[]): SearchResultGroup {
    const videos = items.filter(item => item.id.kind === 'youtube#video');
    const channels = items.filter(item => item.id.kind === 'youtube#channel');
    const playlists = items.filter(item => item.id.kind === 'youtube#playlist');

    return {
      videos,
      channels,
      playlists,
      total: items.length,
    };
  }

  /**
   * Process search results into a standardized format
   */
  private processSearchResults(items: any[]): ProcessedSearchResult[] {
    return items.map(item => ({
      id: item.id.videoId || item.id.channelId || item.id.playlistId,
      type: item.id.kind.replace('youtube#', '') as 'video' | 'channel' | 'playlist',
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId ? createChannelId(item.snippet.channelId) : undefined,
      channelTitle: item.snippet.channelTitle,
      publishedAt: new Date(item.snippet.publishedAt),
      thumbnails: item.snippet.thumbnails,
      liveBroadcastContent: item.snippet.liveBroadcastContent,
    }));
  }

  /**
   * Calculate current page number from page token
   */
  private calculateCurrentPage(pageToken?: string, resultsPerPage: number = 25): number {
    // This is an approximation since YouTube's page tokens are opaque
    // In a real implementation, you might want to track this separately
    return pageToken ? Math.ceil(Math.random() * 10) : 1;
  }

  /**
   * Create search metrics for analytics
   */
  private createSearchMetrics(query: string, options?: SearchOptions): SearchMetrics {
    const filters: string[] = [];
    if (options?.filters) {
      Object.keys(options.filters).forEach(key => {
        if (options.filters![key as keyof SearchFilters]) {
          filters.push(key);
        }
      });
    }

    return {
      queryTime: 0,
      quotaCost: OPERATION_COSTS.search,
      cacheHit: false,
      totalResults: 0,
      actualResults: 0,
      searchTerm: query,
      filters,
      timestamp: new Date(),
    };
  }

  /**
   * Validate search parameters
   */
  validateSearchParameters(query: string, options?: SearchOptions): ValidationResult<SearchRequest> {
    const errors: string[] = [];

    // Query validation
    if (!query || query.trim().length === 0) {
      // Allow empty queries for channel-specific searches
      if (!options?.channelId) {
        errors.push('Search query is required unless searching within a channel');
      }
    }

    if (query && query.length > 500) {
      errors.push('Search query must be 500 characters or less');
    }

    // Options validation
    if (options?.maxResults && (options.maxResults < 1 || options.maxResults > 50)) {
      errors.push('maxResults must be between 1 and 50');
    }

    // Filter validation
    if (options?.filters?.location) {
      const { lat, lng, radius } = options.filters.location;
      if (lat < -90 || lat > 90) {
        errors.push('Location latitude must be between -90 and 90');
      }
      if (lng < -180 || lng > 180) {
        errors.push('Location longitude must be between -180 and 180');
      }
      if (radius && !radius.match(/^\d+(\.\d+)?(m|km|ft|mi)$/)) {
        errors.push('Location radius must be a number followed by m, km, ft, or mi');
      }
    }

    // Date validation
    if (options?.filters?.publishedAfter && options?.filters?.publishedBefore) {
      if (options.filters.publishedAfter >= options.filters.publishedBefore) {
        errors.push('publishedAfter must be before publishedBefore');
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const params = this.buildSearchParams(query, options);
    return { success: true, data: params };
  }

  /**
   * Enhanced video details retrieval with comprehensive metadata
   */
  async getDetailedVideoInfo(
    videoIds: YouTubeVideoId | YouTubeVideoId[], 
    options?: VideoDetailsOptions
  ): Promise<DetailedYouTubeVideo[]> {
    const ids = Array.isArray(videoIds) ? videoIds : [videoIds];
    if (ids.length === 0) return [];

    // Build comprehensive parts list
    const parts = this.buildVideoDetailsParts(options);
    
    const params: DetailedVideoRequest = {
      part: parts,
      id: ids,
      maxResults: Math.min(ids.length, 50), // YouTube limit
      fields: this.buildVideoDetailsFields(parts),
    };

    // Add optional parameters
    if (options?.maxHeight) params.maxHeight = options.maxHeight;
    if (options?.maxWidth) params.maxWidth = options.maxWidth;
    if (options?.hl) params.hl = options.hl;

    const response = await this.makeRequest<YouTubeVideoResponse>('videos', params, 'videosList');
    
    // Process and enhance the video data
    const detailedVideos = await Promise.all(
      response.items.map(video => this.processVideoDetails(video, options))
    );

    this.logDebug(`Retrieved detailed info for ${detailedVideos.length} videos`);
    return detailedVideos;
  }

  /**
   * Get single detailed video with enhanced processing
   */
  async getDetailedVideo(videoId: YouTubeVideoId, options?: VideoDetailsOptions): Promise<DetailedYouTubeVideo | null> {
    const videos = await this.getDetailedVideoInfo(videoId, options);
    return videos.length > 0 ? videos[0] : null;
  }

  /**
   * Get video statistics with enhanced metrics
   */
  async getVideoStatistics(videoIds: YouTubeVideoId[]): Promise<Map<YouTubeVideoId, EnhancedVideoStatistics>> {
    const videos = await this.getDetailedVideoInfo(videoIds, {
      parts: ['statistics', 'snippet'],
      includeStatistics: true,
    });

    const statisticsMap = new Map<YouTubeVideoId, EnhancedVideoStatistics>();
    
    videos.forEach(video => {
      if (video.statistics) {
        statisticsMap.set(video.id, video.statistics);
      }
    });

    return statisticsMap;
  }

  /**
   * Get video content details with processing
   */
  async getVideoContentDetails(videoIds: YouTubeVideoId[]): Promise<Map<YouTubeVideoId, EnhancedContentDetails>> {
    const videos = await this.getDetailedVideoInfo(videoIds, {
      parts: ['contentDetails', 'snippet'],
      includeContentDetails: true,
    });

    const contentDetailsMap = new Map<YouTubeVideoId, EnhancedContentDetails>();
    
    videos.forEach(video => {
      if (video.contentDetails) {
        contentDetailsMap.set(video.id, video.contentDetails);
      }
    });

    return contentDetailsMap;
  }

  /**
   * Get popular/trending videos with enhanced metadata
   */
  async getPopularVideos(request?: PopularVideosRequest): Promise<DetailedYouTubeVideo[]> {
    const params: PopularVideosRequest = {
      part: ['snippet', 'statistics', 'contentDetails'],
      chart: 'mostPopular',
      maxResults: request?.maxResults || this.config.defaultMaxResults,
      ...request,
    };

    const response = await this.makeRequest<YouTubeVideoResponse>('videos', params, 'videosList');
    
    // Process with full metadata
    const detailedVideos = await Promise.all(
      response.items.map(video => this.processVideoDetails(video, {
        includeStatistics: true,
        includeContentDetails: true,
        processMetadata: true,
      }))
    );

    return detailedVideos;
  }

  /**
   * Process raw video data into detailed video with enhancements
   */
  private async processVideoDetails(
    video: YouTubeVideo, 
    options?: VideoDetailsOptions
  ): Promise<DetailedYouTubeVideo> {
    const detailedVideo: DetailedYouTubeVideo = {
      ...video,
      statistics: video.statistics ? this.enhanceVideoStatistics(video.statistics) : undefined,
      contentDetails: video.contentDetails ? this.enhanceContentDetails(video.contentDetails) : undefined,
    };

    // Add metadata if requested
    if (options?.processMetadata) {
      detailedVideo.metadata = this.generateVideoMetadata(video);
    }

    return detailedVideo;
  }

  /**
   * Build video details parts based on options
   */
  private buildVideoDetailsParts(options?: VideoDetailsOptions): VideoDetailsPart[] {
    if (options?.parts) {
      return options.parts;
    }

    const parts: VideoDetailsPart[] = ['snippet'];

    if (options?.includeStatistics !== false) parts.push('statistics');
    if (options?.includeContentDetails !== false) parts.push('contentDetails');
    if (options?.includeTopicDetails) parts.push('topicDetails');
    if (options?.includeLiveStreamingDetails) parts.push('liveStreamingDetails');
    if (options?.includeRecordingDetails) parts.push('recordingDetails');
    if (options?.includePlayerDetails) parts.push('player');

    return parts;
  }

  /**
   * Build optimized fields selector for video details
   */
  private buildVideoDetailsFields(parts: VideoDetailsPart[]): string {
    const baseFields = 'kind,etag,items(id,etag';
    const partFields = parts.map(part => {
      switch (part) {
        case 'snippet':
          return 'snippet(publishedAt,channelId,title,description,thumbnails,channelTitle,tags,categoryId,liveBroadcastContent,defaultLanguage,localized)';
        case 'statistics':
          return 'statistics(viewCount,likeCount,dislikeCount,favoriteCount,commentCount)';
        case 'contentDetails':
          return 'contentDetails(duration,dimension,definition,caption,licensedContent,regionRestriction,contentRating,projection,hasCustomThumbnail)';
        case 'status':
          return 'status(uploadStatus,privacyStatus,license,embeddable,publicStatsViewable,madeForKids)';
        case 'topicDetails':
          return 'topicDetails(topicIds,relevantTopicIds,topicCategories)';
        case 'recordingDetails':
          return 'recordingDetails(recordingDate)';
        case 'liveStreamingDetails':
          return 'liveStreamingDetails(actualStartTime,actualEndTime,scheduledStartTime,scheduledEndTime,concurrentViewers,activeLiveChatId)';
        case 'player':
          return 'player(embedHtml,embedHeight,embedWidth)';
        default:
          return part;
      }
    }).join(',');

    return `${baseFields},${partFields})`;
  }

  /**
   * Enhance basic statistics with calculated metrics
   */
  private enhanceVideoStatistics(stats: YouTubeStatistics): EnhancedVideoStatistics {
    const viewCount = parseInt(stats.viewCount || '0');
    const likeCount = parseInt(stats.likeCount || '0');
    const commentCount = parseInt(stats.commentCount || '0');

    const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
    const likeToViewRatio = viewCount > 0 ? (likeCount / viewCount) * 100 : 0;

    return {
      viewCount: stats.viewCount || '0',
      likeCount: stats.likeCount,
      dislikeCount: stats.dislikeCount,
      favoriteCount: stats.favoriteCount,
      commentCount: stats.commentCount,
      viewCountNumber: viewCount,
      likeCountNumber: likeCount,
      commentCountNumber: commentCount,
      engagementRate,
      likeToViewRatio,
    };
  }

  /**
   * Enhance content details with processed information
   */
  private enhanceContentDetails(details: YouTubeContentDetails): EnhancedContentDetails {
    const durationSeconds = this.parseDuration(details.duration);
    const durationFormatted = this.formatDuration(durationSeconds);

    return {
      ...details,
      contentRating: details.contentRating,
      durationSeconds,
      durationFormatted,
      isHD: details.definition === 'hd',
      hasClosedCaptions: details.caption === 'true',
      isLicensed: details.licensedContent,
    };
  }

  /**
   * Generate metadata for video
   */
  private generateVideoMetadata(video: YouTubeVideo): VideoMetadata {
    const now = new Date();
    return {
      fetchedAt: now,
      lastUpdated: now,
      apiVersion: 'v3',
      cacheKey: `video_${video.id}`,
      processingComplete: true,
      tags: video.snippet?.tags || [],
      extractedKeywords: this.extractKeywords(video.snippet?.title, video.snippet?.description),
    };
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format duration in seconds to human readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Extract keywords from title and description
   */
  private extractKeywords(title?: string, description?: string): string[] {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];
    
    // Filter out common words and keep meaningful keywords
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'throughout', 'despite', 'towards', 'upon', 'concerning', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
    
    const keywords = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .reduce((acc: Record<string, number>, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Enhanced Supabase Integration for TASK_007_005
   * Connects YouTube API with Supabase for caching, preferences, and tracking
   */

  /**
   * Cache video data in Supabase with conflict resolution
   */
  async cacheVideoInSupabase(video: DetailedYouTubeVideo): Promise<void> {
    try {
      const { user } = await supabaseService.getUser();
      if (!user) throw new Error('User not authenticated');

      const videoData = {
        youtube_id: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        channel_id: video.snippet?.channelId,
        channel_title: video.snippet?.channelTitle,
        published_at: video.snippet?.publishedAt,
        thumbnails: video.snippet?.thumbnails,
        duration: video.contentDetails?.duration,
        view_count: parseInt(video.statistics?.viewCount || '0'),
        like_count: parseInt(video.statistics?.likeCount || '0'),
        comment_count: parseInt(video.statistics?.commentCount || '0'),
        tags: video.snippet?.tags || [],
        category_id: video.snippet?.categoryId,
        live_broadcast_content: video.snippet?.liveBroadcastContent,
        cached_at: new Date().toISOString(),
        user_id: user.id,
        api_version: '3.0',
        metadata: {
          enhanced_statistics: video.statistics,
          enhanced_content_details: video.contentDetails,
          last_sync: new Date().toISOString(),
          sync_version: 1,
        },
      };

      // Implement upsert with conflict resolution
      const { data, error } = await supabase
        .from('videos')
        .upsert(videoData, {
          onConflict: 'youtube_id,user_id',
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;

      this.log(`Video cached in Supabase: ${video.id}`, { data });
    } catch (error) {
      this.log(`Failed to cache video in Supabase: ${error}`, { level: 'error' });
      throw error;
    }
  }

  /**
   * Retrieve cached video from Supabase with freshness check
   */
  async getCachedVideoFromSupabase(
    videoId: YouTubeVideoId,
    maxAge: number = 300000 // 5 minutes default
  ): Promise<DetailedYouTubeVideo | null> {
    try {
      const { user } = await supabaseService.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('youtube_id', videoId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) return null;

      // Check cache freshness
      const cachedAt = new Date(data.cached_at).getTime();
      const now = Date.now();
      
      if (now - cachedAt > maxAge) {
        // Cache is stale, remove it
        await this.removeCachedVideo(videoId);
        return null;
      }

      // Convert Supabase data back to YouTube API format
      return this.convertSupabaseToYouTubeVideo(data);
    } catch (error) {
      this.log(`Failed to retrieve cached video: ${error}`, { level: 'error' });
      return null;
    }
  }

  /**
   * Track API usage in Supabase
   */
  async trackApiUsage(
    operation: string,
    quotaCost: QuotaUnits,
    requestDetails: Record<string, any>
  ): Promise<void> {
    try {
      const { user } = await supabaseService.getUser();
      if (!user) return;

      const usageData = {
        user_id: user.id,
        operation,
        quota_cost: quotaCost,
        request_details: requestDetails,
        timestamp: new Date().toISOString(),
        api_version: '3.0',
        success: true,
      };

      await supabase.from('api_usage').insert(usageData);
      
      // Update daily quota tracking
      await this.updateDailyQuotaTracking(quotaCost);
    } catch (error) {
      this.log(`Failed to track API usage: ${error}`, { level: 'error' });
    }
  }

  /**
   * Update daily quota tracking with rollover logic
   */
  private async updateDailyQuotaTracking(quotaCost: QuotaUnits): Promise<void> {
    try {
      const { user } = await supabaseService.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: existing } = await supabase
        .from('daily_quota_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existing) {
        // Update existing record
        await supabase
          .from('daily_quota_usage')
          .update({
            used_quota: existing.used_quota + quotaCost,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await supabase
          .from('daily_quota_usage')
          .insert({
            user_id: user.id,
            date: today,
            used_quota: quotaCost,
            daily_limit: 10000, // Default YouTube API limit
            last_updated: new Date().toISOString(),
          });
      }
    } catch (error) {
      this.log(`Failed to update daily quota tracking: ${error}`, { level: 'error' });
    }
  }

  /**
   * Sync user preferences from Supabase
   */
  async syncUserPreferences(): Promise<void> {
    try {
      const { user } = await supabaseService.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Apply preferences to client configuration
        this.applyUserPreferences(data.preferences);
      }
    } catch (error) {
      this.log(`Failed to sync user preferences: ${error}`, { level: 'error' });
    }
  }

  /**
   * Save user preferences to Supabase
   */
  async saveUserPreferences(preferences: Record<string, any>): Promise<void> {
    try {
      const { user } = await supabaseService.getUser();
      if (!user) throw new Error('User not authenticated');

      const preferencesData = {
        user_id: user.id,
        preferences,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('user_preferences')
        .upsert(preferencesData, { onConflict: 'user_id' });

      this.applyUserPreferences(preferences);
    } catch (error) {
      this.log(`Failed to save user preferences: ${error}`, { level: 'error' });
      throw error;
    }
  }

  /**
   * Apply user preferences to client configuration
   */
  private applyUserPreferences(preferences: Record<string, any>): void {
    if (preferences.defaultMaxResults) {
      this.config.defaultMaxResults = preferences.defaultMaxResults;
    }
    if (preferences.preferredRegion) {
      this.defaultRegion = preferences.preferredRegion;
    }
    if (preferences.cacheEnabled !== undefined) {
      this.enableCaching = preferences.cacheEnabled;
    }
    if (preferences.quotaWarningThreshold) {
      this.config.quotaWarningThreshold = preferences.quotaWarningThreshold;
    }
  }

  /**
   * Data synchronization with conflict resolution
   */
  async syncDataWithConflictResolution(): Promise<void> {
    try {
      const { user } = await supabaseService.getUser();
      if (!user) return;

      // Get local cache timestamp
      const localTimestamp = this.getLastSyncTimestamp();
      
      // Get server changes since last sync
      const { data: serverChanges } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .gte('updated_at', localTimestamp)
        .order('updated_at', { ascending: true });

      if (serverChanges && serverChanges.length > 0) {
        // Process server changes and resolve conflicts
        for (const serverVideo of serverChanges) {
          await this.resolveVideoConflict(serverVideo);
        }
        
        // Update last sync timestamp
        this.setLastSyncTimestamp(new Date().toISOString());
      }
    } catch (error) {
      this.log(`Data synchronization failed: ${error}`, { level: 'error' });
    }
  }

  /**
   * Resolve conflicts between local cache and server data
   */
  private async resolveVideoConflict(serverVideo: any): Promise<void> {
    const localVideo = this.cache.get(this.getCacheKey('video', serverVideo.youtube_id));
    
    if (!localVideo) {
      // No local version, accept server version
      const youtubeVideo = this.convertSupabaseToYouTubeVideo(serverVideo);
      this.cache.set(
        this.getCacheKey('video', serverVideo.youtube_id),
        {
          data: youtubeVideo,
          timestamp: new Date(),
          ttl: this.config.cacheTTL,
        }
      );
      return;
    }

    // Conflict resolution strategy: Last-write-wins with metadata merge
    const serverTime = new Date(serverVideo.updated_at).getTime();
    const localTime = localVideo.timestamp.getTime();

    if (serverTime > localTime) {
      // Server is newer, update local cache
      const youtubeVideo = this.convertSupabaseToYouTubeVideo(serverVideo);
      
      // Merge metadata if both have it
      if (localVideo.data.metadata && serverVideo.metadata) {
        youtubeVideo.metadata = {
          ...localVideo.data.metadata,
          ...serverVideo.metadata,
          last_sync: new Date().toISOString(),
        };
      }

      this.cache.set(
        this.getCacheKey('video', serverVideo.youtube_id),
        {
          data: youtubeVideo,
          timestamp: new Date(),
          ttl: this.config.cacheTTL,
        }
      );
    }
  }

  /**
   * Convert Supabase data format to YouTube API format
   */
  private convertSupabaseToYouTubeVideo(supabaseData: any): DetailedYouTubeVideo {
    return {
      kind: 'youtube#video',
      etag: `supabase_${supabaseData.id}`,
      id: supabaseData.youtube_id as YouTubeVideoId,
      snippet: {
        publishedAt: supabaseData.published_at,
        channelId: supabaseData.channel_id as YouTubeChannelId,
        title: supabaseData.title,
        description: supabaseData.description,
        thumbnails: supabaseData.thumbnails,
        channelTitle: supabaseData.channel_title,
        tags: supabaseData.tags,
        categoryId: supabaseData.category_id,
        liveBroadcastContent: supabaseData.live_broadcast_content,
      },
      statistics: supabaseData.metadata?.enhanced_statistics || {
        viewCount: supabaseData.view_count?.toString(),
        likeCount: supabaseData.like_count?.toString(),
        commentCount: supabaseData.comment_count?.toString(),
      },
      contentDetails: supabaseData.metadata?.enhanced_content_details || {
        duration: supabaseData.duration,
        dimension: '2d',
        definition: 'sd',
        caption: 'false',
        licensedContent: false,
        contentRating: {},
      },
      metadata: {
        ...supabaseData.metadata,
        fetchedAt: new Date(supabaseData.cached_at),
        cacheKey: this.getCacheKey('video', supabaseData.youtube_id),
      },
    } as DetailedYouTubeVideo;
  }

  /**
   * Remove cached video from both memory and Supabase
   */
  private async removeCachedVideo(videoId: YouTubeVideoId): Promise<void> {
    try {
      const { user } = await supabaseService.getUser();
      if (user) {
        await supabase
          .from('videos')
          .delete()
          .eq('youtube_id', videoId)
          .eq('user_id', user.id);
      }

      // Remove from memory cache
      this.cache.delete(this.getCacheKey('video', videoId));
    } catch (error) {
      this.log(`Failed to remove cached video: ${error}`, { level: 'error' });
    }
  }

  /**
   * Get last sync timestamp from local storage
   */
  private getLastSyncTimestamp(): string {
    return localStorage.getItem('youtube_api_last_sync') || new Date(0).toISOString();
  }

  /**
   * Set last sync timestamp in local storage
   */
  private setLastSyncTimestamp(timestamp: string): void {
    localStorage.setItem('youtube_api_last_sync', timestamp);
  }

  /**
   * Logging utility for debugging and monitoring
   */
  private log(message: string, data?: any): void {
    if (this.config.enableDebugLogging) {
      const timestamp = new Date().toISOString();
      const level = data?.level || 'info';
      
      console.log(`[${timestamp}] [${level.toUpperCase()}] YouTubeAPI: ${message}`, data);
      
      // Optional: Send to external logging service
      if (this.config.externalLogger) {
        this.config.externalLogger(level, message, data);
      }
    }
  }



  /**
   * Update quota tracking with time-based resets
   */
  private updateQuotaTracker(): void {
    const now = Date.now();
    
    // Reset daily quota at midnight UTC
    const startOfDay = new Date().setUTCHours(0, 0, 0, 0);
    if (now >= this.quotaTracker.daily.resetTime || this.quotaTracker.daily.resetTime === 0) {
      this.quotaTracker.daily.used = 0;
      this.quotaTracker.daily.resetTime = startOfDay + 24 * 60 * 60 * 1000; // Next midnight
    }

    // Reset hourly quota
    const startOfHour = new Date().setMinutes(0, 0, 0);
    if (now >= this.quotaTracker.hourly.resetTime || this.quotaTracker.hourly.resetTime === 0) {
      this.quotaTracker.hourly.used = 0;
      this.quotaTracker.hourly.resetTime = startOfHour + 60 * 60 * 1000; // Next hour
    }

    // Clean old request timestamps
    const windowStart = now - this.quotaTracker.requests.window;
    this.quotaTracker.requests.timestamps = this.quotaTracker.requests.timestamps
      .filter(timestamp => timestamp > windowStart);
    this.quotaTracker.requests.count = this.quotaTracker.requests.timestamps.length;
  }

  /**
   * Check rate limiting with token bucket algorithm
   */
  private checkRateLimit(bucketKey: string = 'default'): boolean {
    const now = Date.now();
    let bucket = this.rateLimiter.buckets.get(bucketKey);

    if (!bucket) {
      bucket = {
        tokens: this.rateLimiter.defaultCapacity,
        lastRefill: now,
        capacity: this.rateLimiter.defaultCapacity,
        refillRate: this.rateLimiter.defaultRefillRate,
      };
      this.rateLimiter.buckets.set(bucketKey, bucket);
    }

    // Refill tokens based on time elapsed
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have tokens available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Handle quota exceeded scenarios with user feedback
   */
  private async handleQuotaExceeded(quotaType: 'daily' | 'hourly', requestedCost: QuotaUnits): Promise<void> {
    const resetTime = quotaType === 'daily' 
      ? this.quotaTracker.daily.resetTime 
      : this.quotaTracker.hourly.resetTime;
    
    const resetDate = new Date(resetTime);
    const timeUntilReset = Math.ceil((resetTime - Date.now()) / 1000 / 60); // minutes

    const errorMessage = `YouTube API ${quotaType} quota exceeded. ` +
      `Requested: ${requestedCost} units, ` +
      `Available: ${quotaType === 'daily' 
        ? this.quotaTracker.daily.limit - this.quotaTracker.daily.used
        : this.quotaTracker.hourly.limit - this.quotaTracker.hourly.used} units. ` +
      `Quota resets in ${timeUntilReset} minutes (${resetDate.toLocaleString()}).`;

    this.log(errorMessage, { level: 'warn', quotaType, requestedCost, resetTime });

    // Notify users through callback if available
    if (this.config.onQuotaExceeded) {
      this.config.onQuotaExceeded({
        quotaType,
        requestedCost,
        timeUntilReset,
        resetDate,
        suggestion: this.generateQuotaOptimizationSuggestion(quotaType),
      });
    }

    // Track quota exceeded events
    await this.trackApiUsage(`quota_exceeded_${quotaType}`, createQuotaUnits(0), {
      quotaType,
      requestedCost,
      timeUntilReset,
    });
  }

  /**
   * Handle rate limiting scenarios
   */
  private async handleRateLimitExceeded(): Promise<void> {
    const retryAfter = Math.ceil((this.quotaTracker.requests.window - 
      (Date.now() - Math.min(...this.quotaTracker.requests.timestamps))) / 1000);

    this.log(`Rate limit exceeded. Retry after ${retryAfter} seconds.`, { level: 'warn' });

    if (this.config.onRateLimitExceeded) {
      this.config.onRateLimitExceeded({
        retryAfter,
        requestCount: this.quotaTracker.requests.count,
        windowSize: this.quotaTracker.requests.window / 1000,
      });
    }
  }

  /**
   * Generate optimization suggestions based on quota usage
   */
  private generateQuotaOptimizationSuggestion(quotaType: 'daily' | 'hourly'): string[] {
    const suggestions: string[] = [];
    
    if (quotaType === 'daily') {
      suggestions.push('Consider implementing longer cache TTL periods');
      suggestions.push('Use batch requests to reduce API calls');
      suggestions.push('Filter API responses to only necessary fields');
      suggestions.push('Implement user-level caching to reduce duplicate requests');
    } else {
      suggestions.push('Spread requests more evenly throughout the hour');
      suggestions.push('Implement request queuing with priority system');
      suggestions.push('Use exponential backoff for retries');
    }

    return suggestions;
  }

  /**
   * Intelligent request queuing with priority system
   */
  async queueRequest<T>(
    requestFn: () => Promise<T>,
    quotaCost: QuotaUnits,
    priority: number = 1
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request: requestFn,
        resolve,
        reject,
        quotaCost,
        priority,
      });

      // Sort queue by priority (higher number = higher priority)
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      if (!this.isProcessingQueue) {
        this.processRequestQueue();
      }
    });
  }

  /**
   * Process request queue with quota awareness
   */
  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const queueItem = this.requestQueue[0];
      
      // Check if we can process this request
      try {
        this.checkQuotaAvailability(queueItem.quotaCost);
      } catch (error) {
        // If quota not available, wait and try again
        await this.delay(5000); // Wait 5 seconds
        continue;
      }

      // Remove from queue and process
      this.requestQueue.shift();
      
      try {
        const result = await queueItem.request();
        this.updateQuotaUsage(queueItem.quotaCost);
        queueItem.resolve(result);
      } catch (error) {
        queueItem.reject(error);
      }

      // Add small delay between requests for rate limiting
      await this.delay(100);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Simple delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cost optimization analyzer
   */
  async analyzeQuotaCosts(operations: Array<{ operation: string; frequency: number }>): Promise<{
    dailyCost: number;
    optimizedCost: number;
    suggestions: string[];
  }> {
    let dailyCost = 0;
    const suggestions: string[] = [];

    for (const op of operations) {
      const baseCost = OPERATION_COSTS[op.operation as keyof typeof OPERATION_COSTS] || 1;
      dailyCost += baseCost * op.frequency;

      // Generate optimization suggestions
      if (op.operation === 'search' && op.frequency > 100) {
        suggestions.push(`Consider caching search results for "${op.operation}" (used ${op.frequency} times/day)`);
      }
      
      if (op.operation === 'videos' && op.frequency > 1000) {
        suggestions.push(`Use batch requests for video details (currently ${op.frequency} individual requests/day)`);
      }
    }

    // Calculate optimized cost with suggested improvements
    const optimizedCost = dailyCost * 0.7; // Assume 30% reduction with optimizations

    return {
      dailyCost,
      optimizedCost,
      suggestions,
    };
  }
} 
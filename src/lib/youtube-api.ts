// YouTube Data API v3 Client Implementation

import type {
  YouTubeApiKey,
  YouTubeVideoId,
  YouTubeVideo,
  YouTubeVideoResponse,
  YouTubeApiResponse,
  YouTubeError,
  QuotaInfo,
  QuotaUnits,
  YouTubeClientOptions,
  YouTubeApiConfig,
  VideoRequest,
  BaseApiRequest,
  YouTubeApiCache,
  CachedApiResponse,
  ValidationResult,
} from '../types/youtube';

import {
  createApiKey,
  createQuotaUnits,
  createVideoId,
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

import { supabase } from './supabase';

/**
 * YouTube Data API v3 Client with secure key management and quota tracking
 */
export class YouTubeApiClient {
  private apiKey: YouTubeApiKey | null = null;
  private config: YouTubeApiConfig;
  private cache: YouTubeApiCache;
  private quotaInfo: QuotaInfo;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime: Date | null = null;

  constructor(options?: Partial<YouTubeClientOptions>) {
    this.config = { ...DEFAULT_YOUTUBE_CONFIG, ...(options?.config || {}) };
    this.cache = new Map();
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

    if (this.circuitBreakerState === 'open') {
      if (this.lastFailureTime && this.lastFailureTime < fiveMinutesAgo) {
        this.circuitBreakerState = 'half-open';
        this.failureCount = 0;
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
      this.failureCount = 0;
      this.circuitBreakerState = 'closed';
    } else {
      this.failureCount++;
      this.lastFailureTime = new Date();
      
      if (this.failureCount >= 5) {
        this.circuitBreakerState = 'open';
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
} 
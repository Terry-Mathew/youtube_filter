// YouTube Data API v3 Configuration

import type { YouTubeApiConfig, QuotaUnits } from '../types/youtube';
import { createQuotaUnits } from '../types/youtube';

// YouTube Data API v3 Base Configuration
export const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3' as const;
export const YOUTUBE_API_VERSION = 'v3' as const;

// Default Configuration
export const DEFAULT_YOUTUBE_CONFIG: YouTubeApiConfig = {
  baseUrl: YOUTUBE_API_BASE_URL,
  version: YOUTUBE_API_VERSION,
  defaultMaxResults: 25,
  requestTimeout: 10000, // 10 seconds
  retryAttempts: 3,
  quotaWarningThreshold: 0.8, // 80% of quota
  quotaCriticalThreshold: 0.95, // 95% of quota
};

// Quota Management Constants
export const QUOTA_LIMITS = {
  DAILY_LIMIT: createQuotaUnits(10000), // Default daily quota
  WARNING_THRESHOLD: createQuotaUnits(8000), // 80% warning
  CRITICAL_THRESHOLD: createQuotaUnits(9500), // 95% critical
} as const;

// Default API Parts for Different Operations
export const DEFAULT_PARTS = {
  VIDEO_DETAILS: ['snippet', 'contentDetails', 'statistics', 'status'],
  VIDEO_BASIC: ['snippet'],
  SEARCH_RESULTS: ['snippet'],
  CHANNEL_INFO: ['snippet', 'statistics', 'contentDetails'],
  PLAYLIST_INFO: ['snippet', 'contentDetails'],
} as const;

// Field Selectors for Optimized Responses
export const FIELD_SELECTORS = {
  VIDEO_ESSENTIAL: 'items(id,snippet(title,channelTitle,publishedAt,thumbnails),contentDetails(duration),statistics(viewCount))',
  VIDEO_COMPLETE: 'items(id,snippet,contentDetails,statistics,status)',
  SEARCH_BASIC: 'items(id,snippet(title,channelTitle,publishedAt,thumbnails)),nextPageToken,pageInfo',
  QUOTA_EFFICIENT: 'items(id,snippet(title,channelTitle)),pageInfo(totalResults)',
} as const;

// Cache TTL Configuration (in milliseconds)
export const CACHE_TTL = {
  VIDEO_DETAILS: 5 * 60 * 1000, // 5 minutes
  SEARCH_RESULTS: 2 * 60 * 1000, // 2 minutes
  CHANNEL_INFO: 10 * 60 * 1000, // 10 minutes
  QUOTA_INFO: 1 * 60 * 1000, // 1 minute
} as const;

// Rate Limiting Configuration
export const RATE_LIMITS = {
  REQUESTS_PER_SECOND: 10,
  REQUESTS_PER_MINUTE: 600,
  CONCURRENT_REQUESTS: 5,
  BACKOFF_BASE_DELAY: 1000, // 1 second
  BACKOFF_MAX_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// HTTP Status Codes and Error Mapping
export const HTTP_STATUS_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Retryable Error Codes
export const RETRYABLE_ERROR_CODES = [
  HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
  HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  HTTP_STATUS_CODES.SERVICE_UNAVAILABLE,
] as const;

// YouTube API Error Messages
export const YOUTUBE_ERROR_MESSAGES = {
  QUOTA_EXCEEDED: 'Daily quota limit exceeded. Please try again tomorrow.',
  INVALID_API_KEY: 'Invalid or missing YouTube API key. Please check your configuration.',
  RATE_LIMITED: 'Rate limit exceeded. Please slow down your requests.',
  VIDEO_NOT_FOUND: 'The requested video could not be found or is private.',
  CHANNEL_NOT_FOUND: 'The requested channel could not be found.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Default Request Headers
export const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Learning-Tube/1.0',
} as const;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  VIDEO_ID: /^[a-zA-Z0-9_-]{11}$/,
  CHANNEL_ID: /^UC[a-zA-Z0-9_-]{22}$/,
  PLAYLIST_ID: /^PL[a-zA-Z0-9_-]{32}$|^UU[a-zA-Z0-9_-]{22}$/,
  API_KEY: /^AIza[0-9A-Za-z_-]{35}$/,
} as const;

// Environment Variable Keys
export const ENV_KEYS = {
  YOUTUBE_API_KEY: 'VITE_YOUTUBE_API_KEY',
  YOUTUBE_QUOTA_LIMIT: 'VITE_YOUTUBE_QUOTA_LIMIT',
  YOUTUBE_ENABLE_CACHING: 'VITE_YOUTUBE_ENABLE_CACHING',
} as const;

// Performance Optimization Settings
export const PERFORMANCE_CONFIG = {
  BATCH_SIZE: 50, // Maximum videos per batch request
  PARALLEL_REQUESTS: 3, // Maximum parallel API requests
  MEMORY_CACHE_SIZE: 1000, // Maximum cached items
  CACHE_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;

// Development and Debug Configuration
export const DEBUG_CONFIG = {
  ENABLE_REQUEST_LOGGING: import.meta.env.DEV,
  ENABLE_RESPONSE_LOGGING: import.meta.env.DEV,
  ENABLE_ERROR_STACK_TRACE: import.meta.env.DEV,
  ENABLE_QUOTA_WARNINGS: true,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_CACHING: true,
  ENABLE_QUOTA_MANAGEMENT: true,
  ENABLE_RETRY_LOGIC: true,
  ENABLE_CIRCUIT_BREAKER: true,
  ENABLE_BATCH_PROCESSING: true,
} as const; 
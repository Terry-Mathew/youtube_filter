// YouTube Data API v3 Type Definitions with Branded Types

// Branded types for enhanced type safety
declare const __brand: unique symbol;
type Brand<T, K> = T & { readonly [__brand]: K };

export type YouTubeVideoId = Brand<string, 'YouTubeVideoId'>;
export type YouTubeChannelId = Brand<string, 'YouTubeChannelId'>;
export type YouTubePlaylistId = Brand<string, 'YouTubePlaylistId'>;
export type YouTubeApiKey = Brand<string, 'YouTubeApiKey'>;
export type QuotaUnits = Brand<number, 'QuotaUnits'>;

// Utility functions for branded types
export const createVideoId = (id: string): YouTubeVideoId => id as YouTubeVideoId;
export const createChannelId = (id: string): YouTubeChannelId => id as YouTubeChannelId;
export const createPlaylistId = (id: string): YouTubePlaylistId => id as YouTubePlaylistId;
export const createApiKey = (key: string): YouTubeApiKey => key as YouTubeApiKey;
export const createQuotaUnits = (units: number): QuotaUnits => units as QuotaUnits;

// Core YouTube API Types
export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeSnippet {
  publishedAt: string;
  channelId: YouTubeChannelId;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  tags?: string[];
  categoryId?: string;
  liveBroadcastContent: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
  localized?: {
    title: string;
    description: string;
  };
}

export interface YouTubeStatistics {
  viewCount?: string;
  likeCount?: string;
  dislikeCount?: string;
  favoriteCount?: string;
  commentCount?: string;
}

export interface YouTubeContentDetails {
  duration: string;
  dimension: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  regionRestriction?: {
    allowed?: string[];
    blocked?: string[];
  };
  contentRating: Record<string, string>;
  projection?: string;
}

export interface YouTubeStatus {
  uploadStatus: string;
  privacyStatus: string;
  license: string;
  embeddable: boolean;
  publicStatsViewable: boolean;
  madeForKids?: boolean;
  selfDeclaredMadeForKids?: boolean;
}

export interface YouTubeTopicDetails {
  topicIds?: string[];
  relevantTopicIds?: string[];
  topicCategories?: string[];
}

export interface YouTubeVideo {
  kind: 'youtube#video';
  etag: string;
  id: YouTubeVideoId;
  snippet?: YouTubeSnippet;
  statistics?: YouTubeStatistics;
  contentDetails?: YouTubeContentDetails;
  status?: YouTubeStatus;
  topicDetails?: YouTubeTopicDetails;
}

export interface YouTubeSearchItem {
  kind: 'youtube#searchResult';
  etag: string;
  id: {
    kind: string;
    videoId?: YouTubeVideoId;
    channelId?: YouTubeChannelId;
    playlistId?: YouTubePlaylistId;
  };
  snippet: YouTubeSnippet;
}

export interface YouTubePageInfo {
  totalResults: number;
  resultsPerPage: number;
}

export interface YouTubeApiResponse<T> {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode?: string;
  pageInfo: YouTubePageInfo;
  items: T[];
}

export type YouTubeVideoResponse = YouTubeApiResponse<YouTubeVideo>;
export type YouTubeSearchResponse = YouTubeApiResponse<YouTubeSearchItem>;

// Error Types
export enum YouTubeErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  RATE_LIMITED = 'rate_limited',
  NETWORK_ERROR = 'network_error',
  NOT_FOUND = 'not_found',
  FORBIDDEN = 'forbidden',
  INVALID_REQUEST = 'invalid_request',
  SERVER_ERROR = 'server_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface YouTubeError extends Error {
  type: YouTubeErrorType;
  code: string;
  httpStatus?: number;
  details?: Record<string, any>;
  retryable: boolean;
  userMessage: string;
  timestamp: Date;
}

// Quota Management Types
export interface QuotaInfo {
  dailyLimit: QuotaUnits;
  used: QuotaUnits;
  remaining: QuotaUnits;
  resetTime: Date;
  warningThreshold: QuotaUnits;
  criticalThreshold: QuotaUnits;
}

export const OPERATION_COSTS = {
  search: createQuotaUnits(100),
  videosList: createQuotaUnits(1),
  channelsList: createQuotaUnits(1),
  playlistsList: createQuotaUnits(1),
  commentsList: createQuotaUnits(1),
} as const;

// API Configuration Types
export interface YouTubeApiConfig {
  baseUrl: string;
  version: string;
  defaultMaxResults: number;
  requestTimeout: number;
  retryAttempts: number;
  quotaWarningThreshold: number;
  quotaCriticalThreshold: number;
}

// Request Types
export interface BaseApiRequest {
  part: string[];
  maxResults?: number;
  pageToken?: string;
  fields?: string;
}

export interface VideoRequest extends BaseApiRequest {
  id: YouTubeVideoId[];
}

export interface SearchRequest extends BaseApiRequest {
  q: string;
  type?: 'video' | 'channel' | 'playlist';
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration?: 'short' | 'medium' | 'long';
  videoDefinition?: 'any' | 'high' | 'standard';
  videoCategoryId?: string;
  regionCode?: string;
  relevanceLanguage?: string;
}

// Response Processing Types
export interface ProcessedVideo {
  id: YouTubeVideoId;
  title: string;
  description: string;
  channelId: YouTubeChannelId;
  channelTitle: string;
  publishedAt: Date;
  duration: number; // in seconds
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  thumbnails: YouTubeThumbnails;
  tags: string[];
  categoryId?: string;
}

// Cache Types
export interface CachedApiResponse<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  etag?: string;
}

export type YouTubeApiCache = Map<string, CachedApiResponse<any>>;

// Validation Types
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Client Configuration
export interface YouTubeClientOptions {
  apiKey: YouTubeApiKey;
  config?: Partial<YouTubeApiConfig>;
  enableCaching?: boolean;
  enableQuotaManagement?: boolean;
  enableRetry?: boolean;
} 
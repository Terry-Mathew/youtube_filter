// YouTube Data API v3 Type Definitions with Branded Types

import type { CategoryId } from './index';

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
  q?: string;
  type?: 'video' | 'channel' | 'playlist' | 'video,channel,playlist';
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title' | 'videoCount';
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration?: 'short' | 'medium' | 'long' | 'any';
  videoDefinition?: 'any' | 'high' | 'standard';
  videoDimension?: '2d' | '3d' | 'any';
  videoCaption?: 'any' | 'closedCaption' | 'none';
  videoLicense?: 'any' | 'creativeCommon' | 'youtube';
  videoEmbeddable?: 'any' | 'true';
  videoSyndicated?: 'any' | 'true';
  videoType?: 'any' | 'episode' | 'movie';
  videoCategoryId?: string;
  regionCode?: string;
  relevanceLanguage?: string;
  safeSearch?: 'moderate' | 'none' | 'strict';
  eventType?: 'completed' | 'live' | 'upcoming';
  channelId?: YouTubeChannelId;
  channelType?: 'any' | 'show';
  location?: string;
  locationRadius?: string;
  topicId?: string;
  forMine?: boolean;
  forDeveloper?: boolean;
  forContentOwner?: boolean;
  onBehalfOfContentOwner?: string;
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

// Search Types and Pagination
export interface YouTubeChannelSnippet {
  publishedAt: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  defaultLanguage?: string;
  localized?: {
    title: string;
    description: string;
  };
  country?: string;
}

export interface YouTubeChannel {
  kind: 'youtube#channel';
  etag: string;
  id: YouTubeChannelId;
  snippet?: YouTubeChannelSnippet;
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
  contentDetails?: {
    relatedPlaylists?: {
      likes?: string;
      favorites?: string;
      uploads?: string;
    };
  };
}

export interface YouTubePlaylistSnippet {
  publishedAt: string;
  channelId: YouTubeChannelId;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  defaultLanguage?: string;
  localized?: {
    title: string;
    description: string;
  };
}

export interface YouTubePlaylist {
  kind: 'youtube#playlist';
  etag: string;
  id: YouTubePlaylistId;
  snippet?: YouTubePlaylistSnippet;
  contentDetails?: {
    itemCount?: number;
  };
}

export type YouTubeChannelResponse = YouTubeApiResponse<YouTubeChannel>;
export type YouTubePlaylistResponse = YouTubeApiResponse<YouTubePlaylist>;

// Advanced Search Result Processing
export interface ProcessedSearchResult {
  id: string;
  type: 'video' | 'channel' | 'playlist';
  title: string;
  description: string;
  channelId?: YouTubeChannelId;
  channelTitle?: string;
  publishedAt: Date;
  thumbnails: YouTubeThumbnails;
  liveBroadcastContent?: string;
}

export interface SearchResultGroup {
  videos: YouTubeSearchItem[];
  channels: YouTubeSearchItem[];
  playlists: YouTubeSearchItem[];
  total: number;
}

// Pagination Types
export interface PaginationInfo {
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults: number;
  resultsPerPage: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedSearchResponse {
  items: YouTubeSearchItem[];
  pagination: PaginationInfo;
  regionCode?: string;
  etag: string;
  grouped?: SearchResultGroup;
}

// Search Filters and Options
export interface SearchFilters {
  duration?: 'short' | 'medium' | 'long';
  definition?: 'high' | 'standard';
  dimension?: '2d' | '3d';
  caption?: 'closedCaption' | 'none';
  license?: 'creativeCommon' | 'youtube';
  embeddable?: boolean;
  syndicated?: boolean;
  type?: 'episode' | 'movie';
  categoryId?: string;
  publishedAfter?: Date;
  publishedBefore?: Date;
  safeSearch?: 'none' | 'strict';
  eventType?: 'completed' | 'live' | 'upcoming';
  location?: {
    lat: number;
    lng: number;
    radius?: string;
  };
}

export interface SearchOptions {
  maxResults?: number;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title';
  regionCode?: string;
  relevanceLanguage?: string;
  pageToken?: string;
  filters?: SearchFilters;
  channelId?: YouTubeChannelId;
}

// Search Analytics and Metrics
export interface SearchMetrics {
  queryTime: number;
  quotaCost: QuotaUnits;
  cacheHit: boolean;
  totalResults: number;
  actualResults: number;
  searchTerm: string;
  filters: string[];
  timestamp: Date;
}

// Search History for Analytics
export interface SearchHistory {
  query: string;
  filters: SearchFilters;
  timestamp: Date;
  resultCount: number;
  quotaCost: QuotaUnits;
}

// Enhanced Statistics and Metadata Types
export interface EnhancedVideoStatistics extends YouTubeStatistics {
  viewCount: string;
  likeCount?: string;
  dislikeCount?: string;
  favoriteCount?: string;
  commentCount?: string;
  // Additional processed statistics
  viewCountNumber: number;
  likeCountNumber: number;
  commentCountNumber: number;
  engagementRate?: number; // calculated field
  likeToViewRatio?: number; // calculated field
}

export interface VideoContentRating {
  acbRating?: string;
  agcomRating?: string;
  anatelRating?: string;
  bbfcRating?: string;
  bfvcRating?: string;
  bmukkRating?: string;
  catvRating?: string;
  catvfrRating?: string;
  cbfcRating?: string;
  cccRating?: string;
  cceRating?: string;
  chfilmRating?: string;
  chvrsRating?: string;
  cicfRating?: string;
  cnaRating?: string;
  cncRating?: string;
  csaRating?: string;
  cscfRating?: string;
  czfilmRating?: string;
  djctqRating?: string;
  djctqRatingReasons?: string[];
  ecbmctRating?: string;
  eefilmRating?: string;
  egfilmRating?: string;
  eirinRating?: string;
  fcbmRating?: string;
  fcoRating?: string;
  fmocRating?: string;
  fpbRating?: string;
  fpbRatingReasons?: string[];
  fskRating?: string;
  grfilmRating?: string;
  icaaRating?: string;
  ifcoRating?: string;
  ilfilmRating?: string;
  incaaRating?: string;
  kfcbRating?: string;
  kijkwijzerRating?: string;
  kmrbRating?: string;
  lsfRating?: string;
  mccaaRating?: string;
  mccypRating?: string;
  mcstRating?: string;
  mdaRating?: string;
  medietilsynetRating?: string;
  mekuRating?: string;
  mibacRating?: string;
  mocRating?: string;
  moctwRating?: string;
  mpaaRating?: string;
  mpaatRating?: string;
  mtrcbRating?: string;
  nbcRating?: string;
  nbcplRating?: string;
  nfrcRating?: string;
  nfvcbRating?: string;
  nkclvRating?: string;
  oflcRating?: string;
  pefilmRating?: string;
  rcnofRating?: string;
  resorteviolenciaRating?: string;
  rtcRating?: string;
  rteRating?: string;
  russiaRating?: string;
  skfilmRating?: string;
  smaisRating?: string;
  smsaRating?: string;
  tvpgRating?: string;
  ytRating?: string;
  [key: string]: string | string[] | undefined;
}

// Enhanced Content Details with more fields
export interface EnhancedContentDetails extends Omit<YouTubeContentDetails, 'contentRating'> {
  duration: string;
  dimension: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  regionRestriction?: {
    allowed?: string[];
    blocked?: string[];
  };
  contentRating: VideoContentRating;
  projection?: string;
  hasCustomThumbnail?: boolean;
  // Additional processed fields
  durationSeconds: number;
  durationFormatted: string; // "5:32" format
  isHD: boolean;
  hasClosedCaptions: boolean;
  isLicensed: boolean;
}

// Live Streaming Details
export interface LiveStreamingDetails {
  actualStartTime?: string;
  actualEndTime?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  concurrentViewers?: number;
  activeLiveChatId?: string;
}

// Video Recording Details
export interface RecordingDetails {
  recordingDate?: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
}

// Topic Details for categorization
export interface VideoTopicDetails {
  topicIds?: string[];
  relevantTopicIds?: string[];
  topicCategories?: string[];
}

// Player embed information
export interface PlayerDetails {
  embedHtml?: string;
  embedHeight?: number;
  embedWidth?: number;
}

// Comprehensive Video Interface
export interface DetailedYouTubeVideo extends Omit<YouTubeVideo, 'contentDetails' | 'statistics'> {
  snippet?: YouTubeSnippet;
  statistics?: EnhancedVideoStatistics;
  contentDetails?: EnhancedContentDetails;
  status?: YouTubeStatus;
  topicDetails?: VideoTopicDetails;
  recordingDetails?: RecordingDetails;
  liveStreamingDetails?: LiveStreamingDetails;
  player?: PlayerDetails;
  // Additional metadata
  metadata?: VideoMetadata;
}

// Video Metadata for enhanced information
export interface VideoMetadata {
  fetchedAt: Date;
  lastUpdated: Date;
  apiVersion: string;
  cacheKey: string;
  processingComplete: boolean;
  qualityScore?: number;
  relevanceScore?: number;
  tags: string[];
  extractedKeywords?: string[];
}

// Video Details Request Options
export interface VideoDetailsOptions {
  parts?: VideoDetailsPart[];
  includeStatistics?: boolean;
  includeContentDetails?: boolean;
  includeTopicDetails?: boolean;
  includeLiveStreamingDetails?: boolean;
  includeRecordingDetails?: boolean;
  includePlayerDetails?: boolean;
  processMetadata?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  hl?: string; // language for localized content
}

export type VideoDetailsPart = 
  | 'snippet'
  | 'statistics' 
  | 'contentDetails'
  | 'status'
  | 'topicDetails'
  | 'recordingDetails'
  | 'liveStreamingDetails'
  | 'player'
  | 'fileDetails'
  | 'processingDetails'
  | 'suggestions'
  | 'localizations';

// Enhanced Video Request Interface
export interface DetailedVideoRequest extends BaseApiRequest {
  id: YouTubeVideoId[];
  part: VideoDetailsPart[];
  maxHeight?: number;
  maxWidth?: number;
  hl?: string;
}

// Video Analytics and Processing
export interface VideoAnalytics {
  engagementMetrics: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    engagementRate: number;
    likeToViewRatio: number;
    averageViewDuration?: number;
  };
  contentMetrics: {
    duration: number;
    definition: 'hd' | 'sd';
    hasClosedCaptions: boolean;
    isLiveBroadcast: boolean;
    category: string;
  };
  audienceMetrics?: {
    demographics?: Record<string, number>;
    geographic?: Record<string, number>;
    deviceTypes?: Record<string, number>;
  };
  trendsMetrics?: {
    hourlyViews?: number[];
    dailyViews?: number[];
    weeklyViews?: number[];
  };
}

// Caching Strategy Types
export interface VideoCacheStrategy {
  ttl: number;
  maxSize: number;
  evictionPolicy: 'lru' | 'fifo' | 'priority';
  compressionEnabled: boolean;
  backgroundRefresh: boolean;
}

export interface VideoCacheEntry extends CachedApiResponse<DetailedYouTubeVideo> {
  video: DetailedYouTubeVideo;
  analytics?: VideoAnalytics;
  accessCount: number;
  lastAccessed: Date;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
}

export interface VideoCacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  totalEntries: number;
  backgroundRefreshCount: number;
}

// Video Processing and Transformation
export interface ProcessedVideoDetails {
  basic: {
    id: YouTubeVideoId;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    publishedAt: Date;
    channelId: YouTubeChannelId;
    channelTitle: string;
  };
  statistics: {
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
    popularityScore: number;
  };
  content: {
    duration: number;
    durationFormatted: string;
    quality: 'hd' | 'sd';
    hasClosedCaptions: boolean;
    category: string;
    tags: string[];
    language?: string;
  };
  accessibility: {
    hasClosedCaptions: boolean;
    hasAudioDescription?: boolean;
    contentWarnings?: string[];
    ageRestricted: boolean;
  };
  technical: {
    definition: string;
    dimension: string;
    projection?: string;
    hasCustomThumbnail: boolean;
    embeddable: boolean;
  };
}

// Video Batch Processing
export interface VideoBatchRequest {
  videoIds: YouTubeVideoId[];
  options: VideoDetailsOptions;
  priority: 'high' | 'medium' | 'low';
  maxConcurrency?: number;
  timeout?: number;
}

export interface VideoBatchResult {
  successful: Map<YouTubeVideoId, DetailedYouTubeVideo>;
  failed: Map<YouTubeVideoId, YouTubeError>;
  processingTime: number;
  quotaCost: QuotaUnits;
  cacheHits: number;
  cacheMisses: number;
}

// Popular Videos and Trending
export interface PopularVideosRequest extends BaseApiRequest {
  chart: 'mostPopular';
  regionCode?: string;
  videoCategoryId?: string;
  maxResults?: number;
  pageToken?: string;
}

export interface TrendingVideoMetrics {
  video: DetailedYouTubeVideo;
  trendingScore: number;
  velocityScore: number; // rate of view increase
  regionPopularity: Record<string, number>;
  categoryRank: number;
  hoursOnTrending: number;
}

// Video Quality Assessment
export interface VideoQualityMetrics {
  contentQuality: {
    titleQuality: number; // based on length, keywords, etc.
    descriptionQuality: number;
    thumbnailQuality: number;
    tagsRelevance: number;
  };
  engagementQuality: {
    viewToLikeRatio: number;
    viewToCommentRatio: number;
    watchTimePercentage?: number;
    subscriberGrowth?: number;
  };
  technicalQuality: {
    videoDefinition: 'hd' | 'sd';
    audioQuality?: 'high' | 'medium' | 'low';
    hasClosedCaptions: boolean;
    loadTime?: number;
  };
  overallScore: number;
}

// Advanced Video Filtering
export interface VideoFilters {
  duration?: {
    min?: number; // seconds
    max?: number; // seconds
    ranges?: Array<{min: number; max: number}>;
  };
  quality?: ('hd' | 'sd')[];
  captions?: boolean;
  definition?: ('high' | 'standard')[];
  dimension?: ('2d' | '3d')[];
  license?: ('youtube' | 'creativeCommon')[];
  embedPolicy?: ('embeddable' | 'restricted')[];
  viewCount?: {
    min?: number;
    max?: number;
  };
  publishedDate?: {
    after?: Date;
    before?: Date;
  };
  channels?: YouTubeChannelId[];
  categories?: string[];
  languages?: string[];
  regions?: string[];
  contentRating?: string[];
}

// Video Comparison and Analysis
export interface VideoComparison {
  videos: DetailedYouTubeVideo[];
  metrics: {
    performance: Record<YouTubeVideoId, number>;
    engagement: Record<YouTubeVideoId, number>;
    quality: Record<YouTubeVideoId, number>;
    trending: Record<YouTubeVideoId, number>;
  };
  recommendations: {
    bestPerforming: YouTubeVideoId;
    mostEngaging: YouTubeVideoId;
    highestQuality: YouTubeVideoId;
    trending: YouTubeVideoId;
  };
  insights: string[];
}

// Video Series and Playlist Analysis
export interface VideoSeriesAnalysis {
  seriesId: string;
  videos: DetailedYouTubeVideo[];
  seriesMetrics: {
    totalViews: number;
    averageViews: number;
    totalDuration: number;
    engagementProgression: number[];
    dropoffRate: number;
    completionRate: number;
  };
  recommendations: {
    optimalLength: number;
    bestPerformingTopics: string[];
    audienceRetentionTips: string[];
  };
}

// YouTube Category Mapping for TASK_007_004
export interface YouTubeCategoryMapping {
  youtubeId: string;
  youtubeName: string;
  learningTubeCategories: CategoryId[];
  isAssignable: boolean;
  description: string;
  mappingConfidence: number; // 0-1 score
  lastUpdated: Date;
}

export interface YouTubeCategoriesResponse extends YouTubeApiResponse<YouTubeCategory> {
  items: YouTubeCategory[];
}

export interface YouTubeCategory {
  kind: 'youtube#videoCategory';
  etag: string;
  id: string;
  snippet: {
    channelId: string;
    title: string;
    assignable: boolean;
  };
}

// Video Filtering with Categories for TASK_007_004
export interface CategoryBasedVideoFilters {
  // YouTube official categories
  youtubeCategoryIds?: string[];
  
  // Learning Tube custom categories  
  learningTubeCategories?: CategoryId[];
  
  // Duration filtering
  duration?: {
    min?: number; // seconds
    max?: number; // seconds
    youtubeDuration?: 'short' | 'medium' | 'long' | 'any';
  };
  
  // Date filtering
  uploadDate?: {
    after?: Date;
    before?: Date;
    period?: 'hour' | 'today' | 'week' | 'month' | 'year';
  };
  
  // Quality and features
  quality?: {
    definition?: 'any' | 'high' | 'standard';
    dimension?: '2d' | '3d' | 'any';
    caption?: 'any' | 'closedCaption' | 'none';
    license?: 'any' | 'creativeCommon' | 'youtube';
  };
  
  // Engagement thresholds
  engagement?: {
    minViews?: number;
    minLikes?: number;
    minComments?: number;
    engagementRate?: number; // minimum percentage
  };
  
  // Content safety
  safeSearch?: 'none' | 'moderate' | 'strict';
  
  // Geographical
  regionCode?: string;
  relevanceLanguage?: string;
}

export interface CategoryFilteringOptions extends SearchOptions {
  categoryFilters?: CategoryBasedVideoFilters;
  includeUnmapped?: boolean; // include videos not mapped to any Learning Tube category
  autoMapCategories?: boolean; // automatically map videos to Learning Tube categories
  confidenceThreshold?: number; // minimum mapping confidence (0-1)
}

// Enhanced Search with Category Integration
export interface CategoryAwareSearchRequest extends SearchRequest {
  // Learning Tube category integration
  learningTubeCategoryIds?: CategoryId[];
  categoryFilterMode?: 'strict' | 'fuzzy' | 'related';
  
  // YouTube category parameters
  youtubeCategoryId?: string;
}

export interface CategoryMappingResult {
  videoId: YouTubeVideoId;
  youtubeCategory?: {
    id: string;
    name: string;
  };
  suggestedLearningTubeCategories: Array<{
    categoryId: CategoryId;
    confidence: number;
    reason: string;
  }>;
  mappingQuality: 'high' | 'medium' | 'low';
}

// Video Analysis and Classification
export interface VideoClassificationResult {
  videoId: YouTubeVideoId;
  classifications: {
    youtubeCategory: string;
    learningTubeCategories: CategoryId[];
    topics: string[];
    keywords: string[];
    educationalLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    contentType?: 'tutorial' | 'lecture' | 'demo' | 'discussion' | 'review';
  };
  confidence: {
    overall: number;
    categoryMapping: number;
    topicExtraction: number;
    levelAssignment: number;
  };
  processingMetadata: {
    timestamp: Date;
    version: string;
    processingTime: number;
  };
}

// Category Analytics and Insights
export interface CategoryAnalytics {
  categoryId: CategoryId;
  youtubeMapping: {
    mappedYouTubeCategories: string[];
    videoCount: number;
    totalViews: number;
    averageEngagement: number;
  };
  performance: {
    searchFrequency: number;
    clickThroughRate: number;
    userSatisfaction: number;
    popularKeywords: string[];
  };
  trends: {
    growthRate: number;
    seasonality: Array<{
      period: string;
      activity: number;
    }>;
    emergingTopics: string[];
  };
  recommendations: {
    suggestedMappings: YouTubeCategoryMapping[];
    optimizationTips: string[];
    relatedCategories: CategoryId[];
  };
}

// Category Synchronization and Updates
export interface CategorySyncStatus {
  lastSync: Date;
  youtubeCategories: {
    total: number;
    mapped: number;
    unmapped: number;
  };
  learningTubeCategories: {
    total: number;
    withMappings: number;
    withoutMappings: number;
  };
  syncHealth: 'healthy' | 'needs_attention' | 'critical';
  pendingUpdates: number;
}

export interface CategorySyncOperation {
  operation: 'fetch_youtube_categories' | 'update_mappings' | 'sync_user_categories';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  details: string;
  errors?: string[];
}

// Batch Processing for Categories
export interface VideoCategoryBatchJob {
  id: string;
  videoIds: YouTubeVideoId[];
  operations: ('classify' | 'map_categories' | 'extract_metadata')[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    failed: number;
    percentage: number;
  };
  results: CategoryMappingResult[];
  createdAt: Date;
  completedAt?: Date;
  estimatedDuration?: number;
} 
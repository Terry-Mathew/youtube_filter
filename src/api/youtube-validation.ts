// YouTube API v3 Key Validation Service
// TASK_006_002: YouTube API key validation logic
// Uses minimal quota operations for key testing

// Branded types from TASK_001
export type ApiKeyId = string & { readonly brand: unique symbol };
export type ApiService = 'youtube' | 'openai';

// API key information interface
export interface ApiKeyInfo {
  id: ApiKeyId;
  service: ApiService;
  keyPreview: string; // Last 4 characters only
  description?: string;
  isValid: boolean;
  createdAt: Date;
  lastUsed?: Date;
  usageCount?: number;
  quotaInfo?: {
    dailyLimit: number;
    used: number;
    resetTime: Date;
  };
}

export interface YouTubeValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  quotaInfo?: {
    cost: number;
    remaining?: number;
  };
  channelInfo?: {
    id: string;
    title: string;
    subscriberCount?: number;
    viewCount?: number;
  };
}

export interface YouTubeErrorDetails {
  code: number;
  message: string;
  status: string;
  details?: Array<{
    '@type': string;
    reason?: string;
    domain?: string;
    metadata?: Record<string, string>;
  }>;
}

// YouTube API error codes for validation
export const YOUTUBE_ERROR_CODES = {
  INVALID_API_KEY: 'keyInvalid',
  API_KEY_NOT_FOUND: 'keyNotFound',
  QUOTA_EXCEEDED: 'quotaExceeded',
  DAILY_LIMIT_EXCEEDED: 'dailyLimitExceeded',
  API_NOT_ENABLED: 'accessNotConfigured',
  RATE_LIMIT_EXCEEDED: 'rateLimitExceeded',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'notFound',
  BACKEND_ERROR: 'backendError',
} as const;

// Minimal quota API call for key validation
// Uses channels.list with mine=true (1 quota unit)
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Validates YouTube Data API v3 key format
 * YouTube API keys: AIza[A-Za-z0-9_-]{35}
 */
export function validateYouTubeApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // YouTube API keys start with "AIza" and are exactly 39 characters long
  const youtubeKeyPattern = /^AIza[A-Za-z0-9_-]{35}$/;
  return youtubeKeyPattern.test(apiKey);
}

/**
 * Tests YouTube API key validity with minimal quota usage
 * Uses channels.list?part=snippet,statistics&mine=true (1 quota unit)
 * Requires OAuth2 for mine=true, fallback to public channel test
 */
export async function validateYouTubeApiKey(
  apiKey: string,
  signal?: AbortSignal
): Promise<YouTubeValidationResult> {
  // Format validation first
  if (!validateYouTubeApiKeyFormat(apiKey)) {
    return {
      isValid: false,
      errorCode: 'INVALID_FORMAT',
      errorMessage: 'Invalid YouTube API key format. Keys should start with "AIza" and be 39 characters long.',
    };
  }

  try {
    // Test with minimal quota: channels.list for GoogleDevelopers (public channel)
    // This costs only 1 quota unit and doesn't require OAuth
    const testChannelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // GoogleDevelopers channel
    const url = new URL(`${YOUTUBE_API_BASE_URL}/channels`);
    
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('id', testChannelId);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('fields', 'items(id,snippet(title),statistics(subscriberCount,viewCount))');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Referer': window.location.origin, // Required for API key requests
      },
      signal,
    });

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      // Handle YouTube API errors
      const error = data.error as YouTubeErrorDetails;
      
      return {
        isValid: false,
        errorCode: error.details?.[0]?.reason || error.status,
        errorMessage: getHumanReadableErrorMessage(error),
        quotaInfo: { cost: 1 },
      };
    }

    // Successful response - API key is valid
    if (data.items && data.items.length > 0) {
      const channel = data.items[0];
      
      return {
        isValid: true,
        quotaInfo: { cost: 1 },
        channelInfo: {
          id: channel.id,
          title: channel.snippet?.title || 'Unknown Channel',
          subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
          viewCount: parseInt(channel.statistics?.viewCount || '0'),
        },
      };
    }

    // Unexpected response format
    return {
      isValid: false,
      errorCode: 'UNEXPECTED_RESPONSE',
      errorMessage: 'API key appears valid but received unexpected response format.',
      quotaInfo: { cost: 1 },
    };

  } catch (error) {
    // Network or other errors
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isValid: false,
          errorCode: 'REQUEST_CANCELLED',
          errorMessage: 'Validation request was cancelled.',
        };
      }

      return {
        isValid: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: `Network error during validation: ${error.message}`,
      };
    }

    return {
      isValid: false,
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: 'An unknown error occurred during validation.',
    };
  }
}

/**
 * Convert YouTube API error to human-readable message
 */
function getHumanReadableErrorMessage(error: YouTubeErrorDetails): string {
  const reason = error.details?.[0]?.reason;
  
  switch (reason) {
    case YOUTUBE_ERROR_CODES.INVALID_API_KEY:
    case YOUTUBE_ERROR_CODES.API_KEY_NOT_FOUND:
      return 'The API key is invalid or not found. Please check your key and try again.';
      
    case YOUTUBE_ERROR_CODES.API_NOT_ENABLED:
      return 'YouTube Data API v3 is not enabled for this API key. Please enable it in the Google Cloud Console.';
      
    case YOUTUBE_ERROR_CODES.QUOTA_EXCEEDED:
    case YOUTUBE_ERROR_CODES.DAILY_LIMIT_EXCEEDED:
      return 'API quota exceeded. Please try again later or request a quota increase.';
      
    case YOUTUBE_ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return 'Rate limit exceeded. Please wait a moment before trying again.';
      
    case YOUTUBE_ERROR_CODES.FORBIDDEN:
      return 'Access forbidden. Please check your API key permissions.';
      
    case YOUTUBE_ERROR_CODES.BACKEND_ERROR:
      return 'YouTube API is temporarily unavailable. Please try again later.';
      
    default:
      return error.message || 'An error occurred while validating the API key.';
  }
}

/**
 * Test API key with retry logic for rate limiting
 */
export async function validateYouTubeApiKeyWithRetry(
  apiKey: string,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<YouTubeValidationResult> {
  let lastError: YouTubeValidationResult | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await validateYouTubeApiKey(apiKey);
      
      // If successful or non-retryable error, return immediately
      if (result.isValid || result.errorCode !== 'rateLimitExceeded') {
        return result;
      }
      
      lastError = result;
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      lastError = {
        isValid: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }
  
  return lastError || {
    isValid: false,
    errorCode: 'MAX_RETRIES_EXCEEDED',
    errorMessage: 'Maximum validation attempts exceeded.',
  };
}

/**
 * Batch validate multiple API keys (useful for key rotation)
 */
export async function validateMultipleYouTubeApiKeys(
  apiKeys: string[],
  concurrency: number = 3
): Promise<Array<{ apiKey: string; result: YouTubeValidationResult }>> {
  const results: Array<{ apiKey: string; result: YouTubeValidationResult }> = [];
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < apiKeys.length; i += concurrency) {
    const batch = apiKeys.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (apiKey) => ({
      apiKey,
      result: await validateYouTubeApiKey(apiKey),
    }));
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + concurrency < apiKeys.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
} 
# YouTube API Integration Rules

## YouTube Data API v3 Client Architecture

### ✅ Client Implementation Patterns

#### File Structure
```
src/
├── lib/
│   ├── youtube-api.ts       # Main API client
│   └── youtube-config.ts    # Configuration constants
├── types/
│   └── youtube.ts          # API type definitions
└── api/
    └── videos.ts           # Supabase integration layer
```

#### Branded Types for Type Safety
```typescript
// ✅ Use branded types for enhanced type safety
export type YouTubeVideoId = Brand<string, 'YouTubeVideoId'>;
export type YouTubeApiKey = Brand<string, 'YouTubeApiKey'>;
export type QuotaUnits = Brand<number, 'QuotaUnits'>;

// ✅ Utility functions for type creation
export const createVideoId = (id: string): YouTubeVideoId => id as YouTubeVideoId;
export const createApiKey = (key: string): YouTubeApiKey => key as YouTubeApiKey;
```

#### Secure API Key Management
```typescript
// ✅ Correct: Retrieve keys from Supabase with encryption
private async getApiKeyFromStorage(): Promise<YouTubeApiKey | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('user_api_keys')
    .select('encrypted_youtube_key')
    .eq('user_id', user.id)
    .single();
  
  return data?.encrypted_youtube_key ? createApiKey(data.encrypted_youtube_key) : null;
}

// ❌ Wrong: Storing keys in environment variables or localStorage
const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY; // Security risk
```

### Error Handling and Resilience

#### Comprehensive Error Classification
```typescript
// ✅ Use enum for error types with proper classification
export enum YouTubeErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  RATE_LIMITED = 'rate_limited',
  NETWORK_ERROR = 'network_error',
  NOT_FOUND = 'not_found',
  // ... other types
}

// ✅ Structured error objects
interface YouTubeError extends Error {
  type: YouTubeErrorType;
  retryable: boolean;
  userMessage: string;
  httpStatus?: number;
}
```

#### Circuit Breaker Pattern
```typescript
// ✅ Implement circuit breaker for API resilience
private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
private failureCount = 0;

private checkCircuitBreaker(): void {
  if (this.circuitBreakerState === 'open') {
    throw this.createError(YouTubeErrorType.SERVER_ERROR, 'Circuit breaker is open');
  }
}
```

### Quota Management

#### Real-time Quota Tracking
```typescript
// ✅ Track quota usage with branded types
interface QuotaInfo {
  dailyLimit: QuotaUnits;
  used: QuotaUnits;
  remaining: QuotaUnits;
  resetTime: Date;
}

// ✅ Operation cost constants
const OPERATION_COSTS = {
  search: createQuotaUnits(100),
  videosList: createQuotaUnits(1),
  // ... other operations
} as const;
```

#### Pre-request Quota Validation
```typescript
// ✅ Check quota before making requests
private checkQuotaAvailability(cost: QuotaUnits): void {
  if (this.quotaInfo.remaining < cost) {
    throw this.createError(YouTubeErrorType.QUOTA_EXCEEDED, 'Insufficient quota');
  }
}
```

### Caching Strategy

#### Intelligent Response Caching
```typescript
// ✅ TTL-based caching with different durations
const CACHE_TTL = {
  VIDEO_DETAILS: 5 * 60 * 1000,    // 5 minutes
  SEARCH_RESULTS: 2 * 60 * 1000,   // 2 minutes
  CHANNEL_INFO: 10 * 60 * 1000,    // 10 minutes
} as const;

// ✅ Cache cleanup and validation
private cleanupCache(): void {
  const now = new Date();
  for (const [key, cached] of this.cache.entries()) {
    if (now.getTime() - cached.timestamp.getTime() > cached.ttl) {
      this.cache.delete(key);
    }
  }
}
```

### Request Optimization

#### Batch Processing
```typescript
// ✅ Efficient batch processing with API limits
async batchGetVideoDetails(videoIds: YouTubeVideoId[]): Promise<Map<YouTubeVideoId, YouTubeVideo>> {
  const batchSize = 50; // YouTube API limit
  const batches: YouTubeVideoId[][] = [];
  
  for (let i = 0; i < videoIds.length; i += batchSize) {
    batches.push(videoIds.slice(i, i + batchSize));
  }
  
  // Process with parallel limits
  const parallelLimit = 3;
  // ... batch processing logic
}
```

#### Field Selection for Quota Efficiency
```typescript
// ✅ Use field selectors to minimize quota usage
const FIELD_SELECTORS = {
  VIDEO_ESSENTIAL: 'items(id,snippet(title,channelTitle,publishedAt,thumbnails),contentDetails(duration),statistics(viewCount))',
  QUOTA_EFFICIENT: 'items(id,snippet(title,channelTitle)),pageInfo(totalResults)',
} as const;
```

### Rate Limiting

#### Exponential Backoff
```typescript
// ✅ Implement proper retry logic with backoff
private async makeRequest<T>(endpoint: string, params: Record<string, any>): Promise<T> {
  let attempts = 0;
  while (attempts < this.config.retryAttempts) {
    try {
      return await this.executeRequest(endpoint, params);
    } catch (error) {
      if (!this.isRetryableError(error) || attempts >= this.config.retryAttempts - 1) {
        throw error;
      }
      
      const delay = Math.min(
        1000 * Math.pow(2, attempts), // Exponential backoff
        30000 // Max 30 seconds
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }
  }
}
```

## Integration with Supabase

### Database Schema for API Keys
```sql
-- ✅ Secure API key storage
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  encrypted_youtube_key TEXT,
  quota_usage JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ Row Level Security
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own API keys" 
  ON user_api_keys FOR ALL USING (auth.uid() = user_id);
```

### API Usage Tracking
```typescript
// ✅ Store usage metrics in Supabase
async updateQuotaUsage(operationType: string, cost: QuotaUnits): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('api_usage_logs')
    .insert({
      user_id: user.id,
      operation_type: operationType,
      quota_cost: Number(cost),
      timestamp: new Date().toISOString(),
    });
}
```

## Common Anti-Patterns to Avoid

### ❌ Security Violations
```typescript
// ❌ Never store API keys in client-side environment variables
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// ❌ Never log API keys
console.log('Using API key:', apiKey);

// ❌ Never store unencrypted keys in database
await supabase.from('keys').insert({ youtube_key: plainTextKey });
```

### ❌ Quota Management Mistakes
```typescript
// ❌ Don't make requests without quota checking
const response = await fetch(youtubeUrl); // No quota validation

// ❌ Don't ignore quota costs
await Promise.all(videoIds.map(id => getVideoDetails(id))); // Parallel quota burn

// ❌ Don't cache quota-expensive operations poorly
const searchResults = await search(query); // No caching, burns 100 units
```

### ❌ Error Handling Issues
```typescript
// ❌ Generic error handling without classification
try {
  await youtubeApi.getVideo(id);
} catch (error) {
  console.error('Error:', error); // No user guidance
}

// ❌ No circuit breaker protection
while (retries < maxRetries) {
  try {
    return await makeRequest(); // Can cause cascading failures
  } catch (error) {
    retries++;
  }
}
```

## Performance Optimization

### Request Batching
- Batch video detail requests (max 50 IDs per request)
- Use parallel processing with concurrency limits
- Implement request deduplication

### Caching Strategy
- Cache video details for 5 minutes
- Cache search results for 2 minutes  
- Cache channel info for 10 minutes
- Implement cache invalidation on user actions

### Quota Efficiency
- Use field selectors to request only needed data
- Prefer `videos.list` (1 unit) over `search` (100 units) when possible
- Implement intelligent prefetching based on user behavior

## Monitoring and Analytics

### Usage Metrics
```typescript
// ✅ Track API performance and usage
interface ApiMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  quotaUsageRate: number;
  errorsByType: Record<YouTubeErrorType, number>;
}
```

### Health Checks
```typescript
// ✅ Regular API key validation
async validateApiKeyHealth(): Promise<boolean> {
  try {
    const testResponse = await this.makeRequest('videos', {
      part: 'snippet',
      id: 'dQw4w9WgXcQ', // Test video ID
    }, 'videosList');
    return testResponse.items.length > 0;
  } catch (error) {
    return false;
  }
}
```

## Development Guidelines

### TypeScript Best Practices
- Use branded types for all YouTube-specific identifiers
- Implement runtime validation with proper error handling
- Maintain comprehensive type coverage for API responses

### Testing Strategy
- Mock YouTube API responses for unit tests
- Test quota management and circuit breaker functionality
- Validate error handling for all error types
- Performance test batch processing capabilities

### Documentation Requirements
- Document all quota costs for operations
- Provide examples for common usage patterns
- Include troubleshooting guides for API errors
- Maintain migration guides for API changes 
# API Key Validation Rules

## Overview
This document defines standards for API key validation in the YouTube Filter application, specifically for TASK_006_002 implementation patterns.

## Security-First Validation Principles

### ✅ ALWAYS Follow These Validation Rules

1. **Format Validation First**
   - Always validate API key format before making external requests
   - Use regex patterns specific to each service
   - Provide clear format requirements to users
   - Never expose validation patterns in error messages

2. **Minimal Quota Usage**
   - Use the least expensive API call for validation (1 quota unit for YouTube)
   - Prefer public channel queries over user-specific data
   - Include only essential response fields using `fields` parameter
   - Cache validation results temporarily (30 seconds)

3. **Robust Error Handling**
   - Map API error codes to user-friendly messages
   - Distinguish between temporary and permanent errors
   - Implement retry logic for rate limiting
   - Never expose internal API error details

4. **Real-time Feedback**
   - Provide immediate format validation without API calls
   - Show loading states during async validation
   - Display validation results with clear success/failure indicators
   - Include quota usage information when available

### ❌ NEVER Do These Validation Things

1. **Security Violations**
   - Log full API keys in any validation process
   - Store API keys in validation state or local storage
   - Expose internal API error details to users
   - Skip SSL/TLS verification for external requests

2. **Poor UX Patterns**
   - Make validation requests on every keystroke
   - Show generic error messages without context
   - Block the UI during validation without indicators
   - Fail to handle network timeouts gracefully

## YouTube API Validation Standards

### Format Validation
```typescript
// YouTube API keys: AIza[A-Za-z0-9_-]{35}
export function validateYouTubeApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  const youtubeKeyPattern = /^AIza[A-Za-z0-9_-]{35}$/;
  return youtubeKeyPattern.test(apiKey);
}
```

### Minimal Quota Test Call
```typescript
// Use channels.list with public channel ID (1 quota unit)
const testChannelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // GoogleDevelopers
const url = new URL(`${YOUTUBE_API_BASE_URL}/channels`);
url.searchParams.set('part', 'snippet,statistics');
url.searchParams.set('id', testChannelId);
url.searchParams.set('key', apiKey);
url.searchParams.set('fields', 'items(id,snippet(title),statistics(subscriberCount,viewCount))');
```

### Error Code Mapping
```typescript
const YOUTUBE_ERROR_CODES = {
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
```

## Validation Result Interface

### Standard Response Format
```typescript
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
```

### Status Message Generation
```typescript
export function getValidationStatusMessage(result: YouTubeValidationResult): {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} {
  if (result.isValid) {
    return {
      type: 'success',
      title: 'API Key Valid',
      message: result.channelInfo 
        ? `Connected successfully. Test query returned data for "${result.channelInfo.title}".`
        : 'API key is valid and working correctly.',
    };
  }

  const isTemporary = isTemporaryValidationError(result);
  return {
    type: isTemporary ? 'warning' : 'error',
    title: isTemporary ? 'Temporary Issue' : 'Validation Failed',
    message: result.errorMessage || 'Unknown validation error occurred.',
  };
}
```

## Retry Logic Patterns

### Exponential Backoff
```typescript
export async function validateYouTubeApiKeyWithRetry(
  apiKey: string,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<YouTubeValidationResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await validateYouTubeApiKey(apiKey);
    
    // Return immediately if successful or non-retryable error
    if (result.isValid || result.errorCode !== 'rateLimitExceeded') {
      return result;
    }
    
    // Wait before retrying with exponential backoff
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Temporary Error Detection
```typescript
export function isTemporaryValidationError(result: YouTubeValidationResult): boolean {
  const temporaryErrors = [
    'rateLimitExceeded',
    'quotaExceeded', 
    'backendError',
    'NETWORK_ERROR',
    'TIMEOUT',
  ];
  return !result.isValid && temporaryErrors.includes(result.errorCode || '');
}
```

## Integration Patterns

### Form Validation Integration
```typescript
// Real-time format validation without API calls
const createApiKeySchema = (service: ApiService) => z.object({
  apiKey: z
    .string()
    .min(1, 'API key is required')
    .refine(
      (key) => validateApiKeyFormat(service, key),
      (key) => {
        const requirements = getApiKeyRequirements(service);
        return { message: `Invalid ${service} API key format. Expected format: ${requirements.format}` };
      }
    ),
  description: z.string().optional(),
});
```

### UI State Management
```typescript
interface ValidationState {
  result: YouTubeValidationResult | null;
  timestamp: number | null;
}

// Cache validation results for 30 seconds
const isValidationRecent = validationState.timestamp && 
  (Date.now() - validationState.timestamp) < 30000;
```

## Testing Requirements

### Unit Tests
- ✓ Format validation for valid/invalid keys
- ✓ Error code mapping accuracy
- ✓ Retry logic with different error types
- ✓ Timeout handling
- ✓ Network error scenarios

### Integration Tests
- ✓ End-to-end validation flow
- ✓ UI state updates during validation
- ✓ Error message display
- ✓ Loading state management
- ✓ Form submission with validation

### Security Tests
- ✓ API keys never logged or exposed
- ✓ Validation requests use HTTPS
- ✓ No sensitive data in error responses
- ✓ Proper request timeout handling

## Performance Guidelines

### API Call Optimization
- Use minimal `part` parameters (only `snippet,statistics`)
- Include `fields` parameter to reduce response size
- Set reasonable timeout values (10 seconds)
- Implement request cancellation with AbortController

### Caching Strategy
- Cache validation results temporarily (30 seconds)
- Clear cache on key changes
- Don't cache sensitive validation data
- Use memory-only caching (no persistence)

### Rate Limiting
- Implement delays between batch validations (200ms)
- Use exponential backoff for retries
- Respect API rate limits (default: 100 requests/100 seconds)
- Monitor quota usage and warn users

## Multi-Service Support

### Service-Specific Patterns
```typescript
export function getApiKeyRequirements(service: ApiService): {
  format: string;
  length: number;
  prefix: string;
  example: string;
  helpUrl: string;
} {
  switch (service) {
    case 'youtube':
      return {
        format: 'AIza[A-Za-z0-9_-]{35}',
        length: 39,
        prefix: 'AIza',
        example: 'AIzaSyD...',
        helpUrl: 'https://console.cloud.google.com/',
      };
    // Add other services as needed
  }
}
```

### Extensibility Guidelines
- Create service-specific validation modules
- Use consistent interface across all services
- Implement service detection from key format
- Maintain backwards compatibility
- Document service-specific requirements

## Future Enhancements

### Planned Features
- Batch validation for multiple keys
- Key rotation validation workflows
- Quota monitoring and alerts
- Validation result persistence
- Advanced error recovery strategies

### Integration Points
- Supabase API key storage integration
- Zustand state management for validation cache
- Real-time validation status updates
- Webhook validation for automated testing
- Analytics for validation success rates 
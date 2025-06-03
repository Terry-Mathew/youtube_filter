# YouTube API Key Management Rules

## Security Best Practices

### ✅ ALWAYS Follow These Security Rules

1. **API Key Storage**
   - Store API keys encrypted in Supabase database
   - Only display last 4 characters in UI (`key.slice(-4)`)
   - Never log API keys in console or error messages
   - Use environment variables for development keys

2. **Validation Requirements**
   - Validate format: starts with "AIza", 39 characters total
   - Test connection before saving to database
   - Handle quota limits gracefully
   - Provide real-time validation feedback

3. **User Experience**
   - Show loading states during all API operations
   - Provide clear error messages with actionable steps
   - Include comprehensive help documentation
   - Test API keys before allowing save

### ❌ NEVER Do These Things

1. **Security Violations**
   - Store API keys in localStorage or sessionStorage
   - Include API keys in client-side source code
   - Log API keys in console or analytics
   - Send API keys in URL parameters

2. **Poor UX Patterns**
   - Save invalid API keys to database
   - Show API operations without loading states
   - Provide generic error messages
   - Skip validation before storage

## Implementation Patterns

### API Key Component Structure
```typescript
interface ApiKeySetupProps {
  service: 'youtube' | 'openai';
  onSave?: (key: string) => void;
  onDelete?: () => void;
  onTest?: (key: string) => Promise<boolean>;
  existingKey?: ApiKeyInfo;
}
```

### Validation Flow
1. Format validation (immediate)
2. Connection test (API call)
3. Quota check (if applicable)
4. Database storage (encrypted)
5. User feedback (toast notification)

### Error Handling Standards
```typescript
// Always use centralized error handler
ApiKeyErrorHandler.handleError(error, {
  operation: 'Save API Key',
  service: 'youtube',
  timestamp: new Date(),
});
```

### Database Schema Requirements
```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('youtube', 'openai')),
  encrypted_key TEXT NOT NULL,
  key_preview TEXT NOT NULL, -- Last 4 characters only
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);
```

## YouTube API Specific Rules

### Quota Management
- Default daily quota: 10,000 units
- Search operation: ~100 units per request
- Monitor usage and warn users at 80% capacity
- Handle quota exceeded errors gracefully

### API Key Validation
```typescript
const validateYouTubeApiKey = (key: string): boolean => {
  return key.startsWith('AIza') && key.length === 39;
};
```

### Test Connection Endpoint
Use minimal quota operation for testing:
```typescript
const testEndpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${apiKey}`;
```

## Help Documentation Requirements

### Must Include
1. Step-by-step setup guide with screenshots
2. Links to Google Cloud Console
3. Troubleshooting for common errors
4. Security best practices
5. Quota management information

### Help Tooltip Structure
```typescript
<HelpTooltip
  title="Clear Title"
  content={<div>Detailed help content</div>}
  links={[
    { text: "Official Documentation", url: "https://..." },
    { text: "Setup Guide", url: "https://..." }
  ]}
/>
```

## Integration with Supabase

### Row Level Security (RLS)
```sql
-- Users can only access their own API keys
CREATE POLICY "api_keys_policy" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);
```

### Type Safety
```typescript
// Always use branded types for API key IDs
export type ApiKeyId = string & { readonly brand: unique symbol };

// Use proper response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
```

## Component Integration Rules

### Settings Page Integration
- Add API Keys tab to existing navigation
- Maintain consistent styling with shadcn/ui
- Provide responsive layout for mobile
- Include loading states for all operations

### Form Handling
```typescript
// Use react-hook-form with zod validation
const form = useForm<FormData>({
  resolver: zodResolver(apiKeySchema),
  mode: 'onChange', // Real-time validation
});
```

### Toast Notifications
```typescript
// Success
toast({
  title: "API Key Saved",
  description: "Your API key has been saved successfully.",
});

// Error
toast({
  title: "Operation Failed",
  description: error.message,
  variant: "destructive",
});
```

## Testing Requirements

### Validation Tests
- ✓ Format validation for various key formats
- ✓ API connection testing with valid/invalid keys
- ✓ Error handling for network failures
- ✓ Loading state management

### Security Tests
- ✓ API keys are never exposed in DOM
- ✓ Database queries use proper RLS
- ✓ Error messages don't leak sensitive data
- ✓ Encryption/decryption works correctly

## Future Enhancements

### Prepared For
- API key rotation functionality
- Multiple keys per service
- Usage analytics and monitoring
- Automated quota alerts
- Key sharing between team members 
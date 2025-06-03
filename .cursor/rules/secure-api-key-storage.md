# Secure API Key Storage Rules

## Overview
This document defines security-first standards for API key storage in the YouTube Filter application, specifically for TASK_006_004 implementation patterns with Supabase encryption and Row Level Security (RLS).

## Security Architecture Principles

### ✅ ALWAYS Follow These Security Patterns

1. **Encryption at All Levels**
   - Encrypt API keys using Supabase Vault or pgsodium
   - Never store plain text API keys in any database table
   - Use AES-256 encryption as minimum standard
   - Generate unique encryption keys per user/service combination

2. **Row Level Security (RLS)**
   - Enable RLS on all API key storage tables
   - Users can only access their own API keys
   - Use `auth.uid()` for user-based access control
   - Implement policies for INSERT, SELECT, UPDATE, DELETE operations

3. **API Key Validation Before Storage**
   - Always validate API keys with the actual service before storing
   - Use TASK_006_002 validation patterns
   - Store validation results with timestamps
   - Implement retry logic for temporary validation failures

4. **Key Preview and Masking**
   - Never expose full API keys in any UI component
   - Store only last 4 characters as preview
   - Use `...` prefix for display (e.g., "...xyz9")
   - Implement secure key retrieval only when needed

### ❌ NEVER Do These Security Violations

1. **Plain Text Storage**
   - Store raw API keys in database columns
   - Log API keys in application logs
   - Send API keys in URL parameters
   - Cache unencrypted keys in browser storage

2. **Weak Access Control**
   - Skip RLS policies on API key tables
   - Allow cross-user API key access
   - Store keys without user association
   - Use predictable key identifiers

3. **Validation Bypass**
   - Store unvalidated API keys
   - Skip format validation
   - Allow invalid keys to be saved
   - Store keys without service verification

## Database Schema Patterns

### Secure API Key Storage Table
```sql
-- Create encrypted API key storage table
create table if not exists user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  service text not null check (service in ('youtube', 'openai')),
  encrypted_key text not null, -- Encrypted using Supabase Vault
  key_preview text not null, -- Last 4 characters only
  description text,
  is_valid boolean default false,
  validation_last_checked timestamp with time zone,
  validation_error text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_used timestamp with time zone,
  usage_count integer default 0,
  quota_info jsonb,
  
  -- Ensure one key per user per service
  unique(user_id, service)
);

-- Enable Row Level Security
alter table user_api_keys enable row level security;

-- RLS Policies
create policy "Users can view their own API keys"
  on user_api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert their own API keys"
  on user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own API keys"
  on user_api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own API keys"
  on user_api_keys for delete
  using (auth.uid() = user_id);

-- Create indexes for performance
create index idx_user_api_keys_user_service on user_api_keys(user_id, service);
create index idx_user_api_keys_user_id on user_api_keys(user_id);
```

### Vault-Based Encryption Storage
```sql
-- Store API key using Supabase Vault
insert into vault.secrets (secret, name, description)
values (
  'AIzaSyD...actual_api_key...xyz9',
  'youtube_api_key_' || auth.uid()::text,
  'YouTube API key for user ' || auth.uid()::text
);

-- Reference the encrypted secret in user table
insert into user_api_keys (
  user_id,
  service,
  encrypted_key,
  key_preview,
  description,
  is_valid
) values (
  auth.uid(),
  'youtube',
  'vault_secret_id_here',
  '...xyz9',
  'YouTube Data API v3',
  true
);
```

## TypeScript Security Patterns

### Branded Types for API Keys
```typescript
// Secure type definitions
export type ApiKeyId = string & { readonly brand: unique symbol };
export type EncryptedApiKey = string & { readonly brand: unique symbol };
export type ApiKeyPreview = string & { readonly brand: unique symbol };

export interface SecureApiKeyInfo {
  id: ApiKeyId;
  service: ApiService;
  keyPreview: ApiKeyPreview; // Only last 4 characters
  description?: string;
  isValid: boolean;
  validationLastChecked?: Date;
  validationError?: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  quotaInfo?: {
    dailyLimit: number;
    used: number;
    resetTime: Date;
  };
}
```

### Secure API Key Storage Service
```typescript
export class SecureApiKeyStorage {
  /**
   * Store API key with encryption and validation
   */
  static async storeApiKey(
    service: ApiService,
    apiKey: string,
    description?: string
  ): Promise<ApiResponse<SecureApiKeyInfo>> {
    try {
      // 1. Validate API key format
      if (!validateApiKeyFormat(service, apiKey)) {
        throw new Error('Invalid API key format');
      }

      // 2. Validate with actual service
      const validationResult = await validateApiKey(service, apiKey, {
        useRetry: true,
        maxRetries: 2,
        timeout: 15000,
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.errorMessage || 'API key validation failed');
      }

      // 3. Store encrypted key in Vault
      const vaultResult = await supabase.rpc('store_encrypted_api_key', {
        p_service: service,
        p_api_key: apiKey,
        p_description: description,
        p_validation_result: validationResult,
      });

      if (vaultResult.error) {
        throw new Error(vaultResult.error.message);
      }

      return {
        success: true,
        data: vaultResult.data,
        timestamp: new Date(),
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store API key',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Retrieve decrypted API key for use (security-sensitive operation)
   */
  static async retrieveApiKey(
    service: ApiService
  ): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase.rpc('get_decrypted_api_key', {
        p_service: service,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('API key not found');
      }

      // Log usage for audit trail
      await this.logApiKeyUsage(service);

      return {
        success: true,
        data: data.decrypted_key,
        timestamp: new Date(),
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve API key',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Create secure preview of API key
   */
  static createSecurePreview(apiKey: string): ApiKeyPreview {
    if (!apiKey || apiKey.length < 4) {
      return '****' as ApiKeyPreview;
    }
    return `...${apiKey.slice(-4)}` as ApiKeyPreview;
  }

  /**
   * Log API key usage for audit trail
   */
  private static async logApiKeyUsage(service: ApiService): Promise<void> {
    await supabase.rpc('log_api_key_usage', {
      p_service: service,
      p_timestamp: new Date().toISOString(),
    });
  }
}
```

## Supabase Functions for Secure Storage

### Store Encrypted API Key Function
```sql
create or replace function store_encrypted_api_key(
  p_service text,
  p_api_key text,
  p_description text default null,
  p_validation_result jsonb default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_vault_secret_id uuid;
  v_key_preview text;
  v_result json;
begin
  -- Get authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Validate service
  if p_service not in ('youtube', 'openai') then
    raise exception 'Invalid service: %', p_service;
  end if;

  -- Create secure preview
  v_key_preview := '...' || right(p_api_key, 4);

  -- Store in Vault with user-specific name
  insert into vault.secrets (secret, name, description)
  values (
    p_api_key,
    p_service || '_api_key_' || v_user_id::text,
    'API key for ' || p_service || ' service, user: ' || v_user_id::text
  )
  returning id into v_vault_secret_id;

  -- Store reference in user table
  insert into user_api_keys (
    user_id,
    service,
    encrypted_key,
    key_preview,
    description,
    is_valid,
    validation_last_checked,
    validation_error
  ) values (
    v_user_id,
    p_service,
    v_vault_secret_id::text,
    v_key_preview,
    p_description,
    (p_validation_result->>'isValid')::boolean,
    now(),
    p_validation_result->>'errorMessage'
  )
  on conflict (user_id, service)
  do update set
    encrypted_key = excluded.encrypted_key,
    key_preview = excluded.key_preview,
    description = excluded.description,
    is_valid = excluded.is_valid,
    validation_last_checked = excluded.validation_last_checked,
    validation_error = excluded.validation_error,
    updated_at = now()
  returning to_json(user_api_keys.*) into v_result;

  return v_result;
end;
$$;
```

### Retrieve Decrypted API Key Function
```sql
create or replace function get_decrypted_api_key(p_service text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_vault_secret_id text;
  v_decrypted_key text;
  v_result json;
begin
  -- Get authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Get encrypted key reference
  select encrypted_key into v_vault_secret_id
  from user_api_keys
  where user_id = v_user_id and service = p_service and is_valid = true;

  if v_vault_secret_id is null then
    raise exception 'Valid API key not found for service: %', p_service;
  end if;

  -- Retrieve decrypted key from Vault
  select decrypted_secret into v_decrypted_key
  from vault.decrypted_secrets
  where id = v_vault_secret_id::uuid;

  if v_decrypted_key is null then
    raise exception 'Failed to decrypt API key';
  end if;

  -- Update last used timestamp
  update user_api_keys
  set last_used = now(), usage_count = usage_count + 1
  where user_id = v_user_id and service = p_service;

  -- Return structured result
  v_result := json_build_object(
    'decrypted_key', v_decrypted_key,
    'service', p_service,
    'retrieved_at', now()
  );

  return v_result;
end;
$$;
```

### API Key Usage Logging Function
```sql
create or replace function log_api_key_usage(
  p_service text,
  p_timestamp timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Log usage in audit table
  insert into api_key_usage_log (
    user_id,
    service,
    used_at,
    ip_address,
    user_agent
  ) values (
    v_user_id,
    p_service,
    p_timestamp,
    current_setting('request.header.x-forwarded-for', true),
    current_setting('request.header.user-agent', true)
  );
end;
$$;
```

## Frontend Security Patterns

### Secure API Key Component Integration
```typescript
export function SecureApiKeyManager({ service }: { service: ApiService }) {
  const [keyInfo, setKeyInfo] = useState<SecureApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleKeySave = async (apiKey: string, description?: string) => {
    setLoading(true);
    try {
      // Use secure storage service
      const result = await SecureApiKeyStorage.storeApiKey(
        service,
        apiKey,
        description
      );

      if (result.success) {
        setKeyInfo(result.data!);
        toast({
          title: "API Key Saved",
          description: "Your API key has been securely encrypted and stored.",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Storage Failed",
        description: error instanceof Error ? error.message : 'Failed to store API key',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyTest = async (apiKey: string): Promise<boolean> => {
    try {
      const result = await validateApiKey(service, apiKey, {
        useRetry: false,
        timeout: 10000,
      });
      return result.isValid;
    } catch {
      return false;
    }
  };

  return (
    <ApiKeySetup
      service={service}
      existingKey={keyInfo}
      onSave={handleKeySave}
      onTest={handleKeyTest}
      validationOptions={{
        useRetry: true,
        maxRetries: 2,
        timeout: 15000,
      }}
    />
  );
}
```

## Audit and Monitoring Patterns

### API Key Usage Audit Table
```sql
create table if not exists api_key_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  service text not null,
  used_at timestamp with time zone not null,
  ip_address text,
  user_agent text,
  operation text default 'retrieve',
  success boolean default true,
  error_message text,
  created_at timestamp with time zone default now()
);

-- RLS for audit log
alter table api_key_usage_log enable row level security;

create policy "Users can view their own usage logs"
  on api_key_usage_log for select
  using (auth.uid() = user_id);

-- Index for performance
create index idx_api_key_usage_log_user_service on api_key_usage_log(user_id, service);
create index idx_api_key_usage_log_used_at on api_key_usage_log(used_at);
```

### Security Monitoring Functions
```sql
-- Function to detect suspicious API key access patterns
create or replace function detect_suspicious_api_access()
returns table(
  user_id uuid,
  service text,
  suspicious_pattern text,
  last_occurrence timestamptz,
  occurrence_count bigint
)
language sql
security definer
as $$
  -- Detect rapid API key retrieval (potential brute force)
  select 
    l.user_id,
    l.service,
    'rapid_retrieval' as suspicious_pattern,
    max(l.used_at) as last_occurrence,
    count(*) as occurrence_count
  from api_key_usage_log l
  where l.used_at > now() - interval '1 hour'
  group by l.user_id, l.service
  having count(*) > 50
  
  union all
  
  -- Detect failed validation attempts
  select 
    l.user_id,
    l.service,
    'failed_validation' as suspicious_pattern,
    max(l.used_at) as last_occurrence,
    count(*) as occurrence_count
  from api_key_usage_log l
  where l.used_at > now() - interval '24 hours'
    and l.success = false
  group by l.user_id, l.service
  having count(*) > 10;
$$;
```

## Error Handling and Recovery

### Secure Error Messages
```typescript
export function sanitizeApiKeyError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Remove any potential API key leakage
    if (message.includes('aiza') || message.includes('sk-')) {
      return 'API key validation failed. Please check your key format.';
    }
    
    // Provide helpful but secure error messages
    const secureErrors: Record<string, string> = {
      'keyinvalid': 'The provided API key is invalid.',
      'quotaexceeded': 'API quota exceeded. Please check your usage limits.',
      'ratelimitexceeded': 'Rate limit exceeded. Please try again later.',
      'networkerror': 'Network error. Please check your connection.',
      'timeout': 'Validation timed out. Please try again.',
    };
    
    for (const [code, secureMessage] of Object.entries(secureErrors)) {
      if (message.includes(code)) {
        return secureMessage;
      }
    }
  }
  
  return 'An unexpected error occurred during API key processing.';
}
```

### Recovery Procedures
```typescript
export class ApiKeyRecoveryService {
  /**
   * Recover from corrupted encryption
   */
  static async recoverCorruptedKey(
    service: ApiService
  ): Promise<ApiResponse<void>> {
    try {
      // Mark key as invalid
      await supabase.rpc('mark_api_key_invalid', {
        p_service: service,
        p_reason: 'encryption_corruption',
      });

      // Notify user
      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to recover corrupted key',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Rotate API key for security
   */
  static async rotateApiKey(
    service: ApiService,
    newApiKey: string
  ): Promise<ApiResponse<SecureApiKeyInfo>> {
    try {
      // Validate new key first
      const validationResult = await validateApiKey(service, newApiKey);
      if (!validationResult.isValid) {
        throw new Error('New API key is invalid');
      }

      // Archive old key
      await supabase.rpc('archive_api_key', {
        p_service: service,
        p_reason: 'user_rotation',
      });

      // Store new key
      return await SecureApiKeyStorage.storeApiKey(
        service,
        newApiKey,
        'Rotated for security'
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Key rotation failed',
        timestamp: new Date(),
      };
    }
  }
}
```

## Testing and Validation

### Security Test Requirements
- ✅ Encryption/decryption round-trip tests
- ✅ RLS policy enforcement verification
- ✅ API key validation integration tests
- ✅ Cross-user access prevention tests
- ✅ Audit log integrity verification
- ✅ Error message sanitization tests
- ✅ Performance under load testing

### Penetration Testing Checklist
- ✅ SQL injection attempts on API key functions
- ✅ RLS bypass attempts
- ✅ Encrypted key extraction attempts
- ✅ Cross-site scripting (XSS) with API keys
- ✅ Session hijacking with API key access
- ✅ Brute force attack simulation
- ✅ Rate limiting effectiveness

## Performance Optimization

### Caching Strategies
```typescript
export class SecureApiKeyCache {
  private static cache = new Map<string, {
    key: string;
    expires: number;
  }>();

  static async getWithCache(
    service: ApiService,
    cacheTimeMs: number = 300000 // 5 minutes
  ): Promise<string | null> {
    const cacheKey = `${auth.uid()}_${service}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expires) {
      return cached.key;
    }

    // Retrieve from secure storage
    const result = await SecureApiKeyStorage.retrieveApiKey(service);
    if (result.success && result.data) {
      this.cache.set(cacheKey, {
        key: result.data,
        expires: Date.now() + cacheTimeMs,
      });
      return result.data;
    }

    return null;
  }

  static clearCache(service?: ApiService): void {
    if (service) {
      const cacheKey = `${auth.uid()}_${service}`;
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }
}
```

## Compliance and Regulations

### GDPR Compliance
- ✅ User consent for API key storage
- ✅ Right to data deletion implementation
- ✅ Data portability for API key metadata
- ✅ Privacy by design in storage architecture
- ✅ Data processing transparency

### SOC 2 Type II Requirements
- ✅ Access control implementation
- ✅ Audit trail completeness
- ✅ Encryption at rest and in transit
- ✅ Change management procedures
- ✅ Incident response procedures

### Industry Standards
- ✅ NIST Cybersecurity Framework alignment
- ✅ OWASP Top 10 mitigation
- ✅ ISO 27001 security controls
- ✅ PCI DSS data protection principles 
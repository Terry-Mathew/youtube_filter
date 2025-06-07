import { supabase, supabaseService } from '../lib/supabase';
import type { 
  UserProfile,
  UserId,
  ApiResponse,
  UserPreferences 
} from '../types';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { 
  validateYouTubeApiKey, 
  validateYouTubeApiKeyWithRetry,
  type YouTubeValidationResult,
  type ApiService,
  type ApiKeyInfo,
  type ApiKeyId
} from './youtube-validation';

// =============================================================================
// Auth Request/Response Types
// =============================================================================

export interface SignUpRequest {
  email: string;
  password: string;
  fullName?: string;
  preferences?: Partial<UserPreferences>;
}

export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ResetPasswordRequest {
  email: string;
  redirectTo?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
  preferences?: Partial<UserPreferences>;
}

export interface OAuthSignInRequest {
  provider: 'google' | 'github' | 'discord' | 'twitter';
  redirectTo?: string;
  scopes?: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface ApiKeySetupRequest {
  service: 'youtube' | 'openai';
  apiKey: string;
  description?: string;
}

// =============================================================================
// Authentication API Service
// =============================================================================

export class AuthApi {
  private static instance: AuthApi;
  
  private constructor() {}
  
  public static getInstance(): AuthApi {
    if (!AuthApi.instance) {
      AuthApi.instance = new AuthApi();
    }
    return AuthApi.instance;
  }
  
  /**
   * Sign up a new user with email and password
   */
  async signUp(request: SignUpRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: request.email,
        password: request.password,
        options: {
          data: {
            full_name: request.fullName,
            preferences: request.preferences,
          },
        },
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };
      }
      
      // TODO: Create user profile in TASK_012
      // if (data.user) {
      //   await this.createUserProfile(data.user, request);
      // }
      
      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          error: null,
        },
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign up',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Sign in an existing user with email and password
   */
  async signIn(request: SignInRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };
      }
      
      // TODO: Update last sign in timestamp in TASK_012
      // if (data.user) {
      //   await this.updateLastSignIn(data.user.id);
      // }
      
      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          error: null,
        },
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign in',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(request: OAuthSignInRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: request.provider,
        options: {
          redirectTo: request.redirectTo || `${window.location.origin}/auth/callback`,
          scopes: request.scopes,
        },
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };
      }
      
      // OAuth sign-in redirects the user, so we don't get user/session data immediately
      // The actual user/session will be available after the redirect callback
      return {
        success: true,
        data: {
          user: null, // Will be set after OAuth callback
          session: null, // Will be set after OAuth callback
          error: null,
        },
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign in with OAuth',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Sign out the current user
   */
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };
      }
      
      // Clean up any local state
      supabaseService.removeAllSubscriptions();
      
      return {
        success: true,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign out',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get current user session
   */
  async getSession(): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      return {
        success: true,
        data: {
          user: data.session?.user || null,
          session: data.session,
          error: error,
        },
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get current user
   */
  async getUser(): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        return {
          success: false,
          error: error?.message || 'User not found',
          timestamp: new Date(),
        };
      }
      
      return {
        success: true,
        data: data.user,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get user profile with additional data
   */
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_012
      // const { data, error } = await supabase
      //   .from('user_profiles')
      //   .select('*')
      //   .eq('id', user.id)
      //   .single();
      
      // Placeholder - will be replaced with actual database query
      const userProfile: UserProfile = {
        id: user.id as UserId,
        email: user.email || '',
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: new Date(user.created_at),
        last_sign_in_at: user.last_sign_in_at ? new Date(user.last_sign_in_at) : undefined,
        preferences: user.user_metadata?.preferences,
      };
      
      return {
        success: true,
        data: userProfile,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user profile',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(request: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // Update auth metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: request.fullName,
          avatar_url: request.avatarUrl,
          timezone: request.timezone,
          language: request.language,
          preferences: request.preferences,
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // TODO: Update user profile table in TASK_012
      // const { data: profileData, error: profileError } = await supabase
      //   .from('user_profiles')
      //   .update({
      //     full_name: request.fullName,
      //     avatar_url: request.avatarUrl,
      //     timezone: request.timezone,
      //     language: request.language,
      //     preferences: request.preferences,
      //     updated_at: new Date().toISOString(),
      //   })
      //   .eq('id', user.id)
      //   .select()
      //   .single();
      
      // Return updated profile
      return await this.getUserProfile();
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Reset password via email
   */
  async resetPassword(request: ResetPasswordRequest): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        request.email,
        {
          redirectTo: request.redirectTo || `${window.location.origin}/auth/reset-password`,
        }
      );
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };
      }
      
      return {
        success: true,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset password',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Update user password
   */
  async updatePassword(request: UpdatePasswordRequest): Promise<ApiResponse<void>> {
    try {
      // Note: Supabase doesn't require current password verification in client
      // This should be handled with proper session management
      const { error } = await supabase.auth.updateUser({
        password: request.newPassword,
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date(),
        };
      }
      
      return {
        success: true,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update password',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Setup API key for external services
   * This will integrate with TASK_015 (secure API key storage)
   */
  async setupApiKey(request: ApiKeySetupRequest): Promise<ApiResponse<ApiKeyInfo>> {
    try {
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual encrypted storage in TASK_015
      // const { data, error } = await supabase
      //   .from('user_api_keys')
      //   .upsert({
      //     user_id: user.id,
      //     service: request.service,
      //     encrypted_key: await encryptApiKey(request.apiKey),
      //     key_preview: request.apiKey.slice(-4),
      //     description: request.description,
      //     is_valid: true,
      //     created_at: new Date().toISOString(),
      //   }, { onConflict: 'user_id,service' })
      //   .select()
      //   .single();
      
      // Placeholder response - will be replaced with actual encrypted storage
      const apiKeyInfo: ApiKeyInfo = {
        id: crypto.randomUUID() as ApiKeyId,
        service: request.service,
        keyPreview: request.apiKey.slice(-4),
        description: request.description,
        isValid: true,
        createdAt: new Date(),
      };
      
      return {
        success: true,
        data: apiKeyInfo,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup API key',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get user's API keys
   */
  async getApiKeys(): Promise<ApiResponse<ApiKeyInfo[]>> {
    try {
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_015
      // const { data, error } = await supabase
      //   .from('user_api_keys')
      //   .select('id, service, key_preview, description, is_valid, created_at, last_used, usage_count')
      //   .eq('user_id', user.id);
      
      // Placeholder - will be replaced with actual database query
      return {
        success: true,
        data: [],
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get API keys',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Delete an API key
   */
  async deleteApiKey(keyId: string): Promise<ApiResponse<void>> {
    try {
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase deletion in TASK_015
      // const { error } = await supabase
      //   .from('user_api_keys')
      //   .delete()
      //   .eq('id', keyId)
      //   .eq('user_id', user.id);
      
      // Placeholder - will be replaced with actual deletion
      return {
        success: true,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete API key',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await supabaseService.isAuthenticated();
  }
  
  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      return {
        success: !error,
        data: {
          user: data.user,
          session: data.session,
          error: error,
        },
        error: error?.message,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh session',
        timestamp: new Date(),
      };
    }
  }
}

// Export singleton instance
export const authApi = AuthApi.getInstance();

// Export convenience functions
export const {
  signUp,
  signIn,
  signInWithOAuth,
  signOut,
  getSession,
  getUser,
  getUserProfile,
  updateProfile,
  resetPassword,
  updatePassword,
  setupApiKey,
  getApiKeys,
  deleteApiKey,
  isAuthenticated,
  refreshSession,
} = authApi;

// Auth event listeners for global state management
export function setupAuthListeners(
  onAuthStateChange: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    onAuthStateChange(event, session);
  });
}

// Authentication and API Key Management
// TASK_006_002: Integration with YouTube API validation

export { type YouTubeValidationResult, type ApiService, type ApiKeyInfo, type ApiKeyId };

// Auth-related API key validation interface
export interface ApiKeyValidationOptions {
  useRetry?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Centralized API key validation for different services
 * Currently supports YouTube Data API v3
 */
export async function validateApiKey(
  service: ApiService,
  apiKey: string,
  options: ApiKeyValidationOptions = {}
): Promise<YouTubeValidationResult> {
  const {
    useRetry = true,
    maxRetries = 2,
    timeout = 10000,
  } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let result: YouTubeValidationResult;

    switch (service) {
      case 'youtube':
        if (useRetry) {
          result = await validateYouTubeApiKeyWithRetry(apiKey, maxRetries);
        } else {
          result = await validateYouTubeApiKey(apiKey, controller.signal);
        }
        break;

      case 'openai':
        // Placeholder for future OpenAI validation
        result = {
          isValid: false,
          errorCode: 'NOT_IMPLEMENTED',
          errorMessage: 'OpenAI API validation not yet implemented.',
        };
        break;

      default:
        result = {
          isValid: false,
          errorCode: 'UNSUPPORTED_SERVICE',
          errorMessage: `API validation for service "${service}" is not supported.`,
        };
    }

    return result;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        isValid: false,
        errorCode: 'TIMEOUT',
        errorMessage: 'API key validation timed out.',
      };
    }

    return {
      isValid: false,
      errorCode: 'VALIDATION_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Validate API key format without making external requests
 * Useful for real-time form validation
 */
export function validateApiKeyFormat(service: ApiService, apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  switch (service) {
    case 'youtube':
      // YouTube API keys: AIza[A-Za-z0-9_-]{35}
      return /^AIza[A-Za-z0-9_-]{35}$/.test(apiKey);

    case 'openai':
      // OpenAI API keys: sk-[A-Za-z0-9]{48,}
      return /^sk-[A-Za-z0-9]{48,}$/.test(apiKey);

    default:
      return false;
  }
}

/**
 * Get API key validation requirements for different services
 */
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

    case 'openai':
      return {
        format: 'sk-[A-Za-z0-9]{48,}',
        length: 51, // minimum
        prefix: 'sk-',
        example: 'sk-...',
        helpUrl: 'https://platform.openai.com/api-keys',
      };

    default:
      return {
        format: 'Unknown',
        length: 0,
        prefix: '',
        example: '',
        helpUrl: '',
      };
  }
}

/**
 * Create API key preview (last 4 characters)
 * Security best practice: never expose full keys
 */
export function createApiKeyPreview(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '****';
  }
  return `...${apiKey.slice(-4)}`;
}

/**
 * Validate multiple API keys for the same service
 * Useful for key rotation or batch operations
 */
export async function validateMultipleApiKeys(
  service: ApiService,
  apiKeys: string[],
  options: ApiKeyValidationOptions = {}
): Promise<Array<{
  apiKey: string;
  preview: string;
  result: YouTubeValidationResult;
}>> {
  const results = [];

  for (const apiKey of apiKeys) {
    const result = await validateApiKey(service, apiKey, options);
    results.push({
      apiKey,
      preview: createApiKeyPreview(apiKey),
      result,
    });

    // Small delay between validations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Check if API key validation result indicates a temporary error
 * Useful for determining if retry logic should be applied
 */
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

/**
 * Get user-friendly validation status message
 */
export function getValidationStatusMessage(result: YouTubeValidationResult): {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} {
  if (result.isValid) {
    const channelInfo = result.channelInfo;
    return {
      type: 'success',
      title: 'API Key Valid',
      message: channelInfo 
        ? `Connected successfully. Test query returned data for "${channelInfo.title}".`
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

// =============================================================================
// Auth Configuration and Setup
// =============================================================================

/**
 * Verify Supabase Auth configuration
 */
export function verifyAuthConfiguration(): {
  isValid: boolean;
  missingVars: string[];
  config: {
    url: string | undefined;
    anonKey: string | undefined;
    isLocalDevelopment: boolean;
  };
} {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isLocalDevelopment = url?.includes('localhost') || url?.includes('127.0.0.1');
  
  const missingVars: string[] = [];
  if (!url) missingVars.push('VITE_SUPABASE_URL');
  if (!anonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    config: {
      url,
      anonKey,
      isLocalDevelopment,
    },
  };
}

/**
 * Get auth redirect URLs based on environment
 */
export function getAuthRedirectUrls(): {
  signIn: string;
  signUp: string;
  callback: string;
  passwordReset: string;
} {
  const baseUrl = window.location.origin;
  
  return {
    signIn: `${baseUrl}/auth/signin`,
    signUp: `${baseUrl}/auth/signup`,
    callback: `${baseUrl}/auth/callback`,
    passwordReset: `${baseUrl}/auth/reset-password`,
  };
}

/**
 * Enhanced OAuth sign-in with proper error handling
 */
export async function signInWithProvider(
  provider: 'google' | 'github' | 'discord' | 'twitter',
  options: {
    redirectTo?: string;
    scopes?: string;
    queryParams?: Record<string, string>;
  } = {}
): Promise<ApiResponse<{ url: string }>> {
  try {
    const redirectUrls = getAuthRedirectUrls();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: options.redirectTo || redirectUrls.callback,
        scopes: options.scopes,
        queryParams: options.queryParams,
      },
    });
    
    if (error) {
      return {
        success: false,
        error: `Failed to initialize ${provider} sign-in: ${error.message}`,
        timestamp: new Date(),
      };
    }
    
    return {
      success: true,
      data: { url: data.url },
      timestamp: new Date(),
      requestId: crypto.randomUUID(),
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to sign in with ${provider}`,
      timestamp: new Date(),
    };
  }
} 
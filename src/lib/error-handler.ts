/**
 * Enhanced Error Handler Library for TASK_006_005
 * 
 * Provides centralized error handling, secure error messages, and comprehensive
 * user feedback for API key operations with TypeScript type safety.
 * 
 * Features:
 * - Security-first error message sanitization
 * - React Hook Form integration patterns
 * - Toast notification management
 * - API key specific error handling
 * - Retry logic and fallback mechanisms
 * - User-friendly error categorization
 */

import { toast } from '@/hooks/use-toast';
import type { FieldErrors, FieldError } from 'react-hook-form';
import type { 
  ApiService, 
  YouTubeValidationResult, 
  ApiKeyInfo 
} from '@/api/auth';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Branded types for enhanced security
 */
export type SecureErrorMessage = string & { readonly brand: unique symbol };
export type ErrorCode = string & { readonly brand: unique symbol };
export type ErrorCategory = 'validation' | 'network' | 'authentication' | 'authorization' | 'quota' | 'server' | 'user' | 'unknown';

/**
 * Enhanced error information structure
 */
export interface EnhancedError {
  code: ErrorCode;
  category: ErrorCategory;
  message: SecureErrorMessage;
  userMessage: string;
  isRetryable: boolean;
  isTemporary: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context?: {
    service?: ApiService;
    operation?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
  showToast?: boolean;
  toastDuration?: number;
  logError?: boolean;
  includeContext?: boolean;
  sanitize?: boolean;
  retryable?: boolean;
}

/**
 * Form error handling configuration
 */
export interface FormErrorConfig {
  field: string;
  service?: ApiService;
  operation?: string;
  customMessages?: Record<string, string>;
}

// =============================================================================
// Security-First Error Message Sanitization
// =============================================================================

/**
 * Sanitizes error messages to prevent API key leakage and sensitive data exposure
 * Following .cursor/rules/secure-api-key-storage.md patterns
 */
export function sanitizeErrorMessage(error: unknown): SecureErrorMessage {
  if (!error) return 'An unknown error occurred' as SecureErrorMessage;

  let message = '';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = 'An unexpected error occurred';
  }

  // Remove any potential API key patterns
  const apiKeyPatterns = [
    /AIza[0-9A-Za-z-_]{35}/g, // YouTube API keys
    /sk-[a-zA-Z0-9]{20,}/g,   // OpenAI API keys
    /[A-Za-z0-9]{32,}/g,      // Generic long alphanumeric strings
  ];

  apiKeyPatterns.forEach(pattern => {
    message = message.replace(pattern, '[REDACTED]');
  });

  // Remove common sensitive patterns
  const sensitivePatterns = [
    /password[=:]\s*\S+/gi,
    /token[=:]\s*\S+/gi,
    /secret[=:]\s*\S+/gi,
    /key[=:]\s*\S+/gi,
  ];

  sensitivePatterns.forEach(pattern => {
    message = message.replace(pattern, '[REDACTED]');
  });

  // Normalize whitespace and limit length
  message = message.trim().substring(0, 500);

  if (!message) {
    message = 'An error occurred during processing';
  }

  return message as SecureErrorMessage;
}

/**
 * Creates user-friendly error messages based on error codes
 */
export function createUserFriendlyMessage(
  errorCode: string,
  service?: ApiService,
  operation?: string
): string {
  const serviceDisplayName = service === 'youtube' ? 'YouTube' : service === 'openai' ? 'OpenAI' : 'API';

  const errorMessages: Record<string, string> = {
    // Validation errors
    'INVALID_FORMAT': `Invalid ${serviceDisplayName} API key format. Please check the key and try again.`,
    'KEY_REQUIRED': 'API key is required. Please enter a valid key.',
    'KEY_TOO_SHORT': 'API key appears to be too short. Please verify the complete key.',
    'KEY_TOO_LONG': 'API key appears to be too long. Please verify the key format.',
    
    // Authentication errors
    'INVALID_KEY': `Invalid ${serviceDisplayName} API key. Please verify your key is correct.`,
    'KEY_REVOKED': `${serviceDisplayName} API key has been revoked. Please generate a new key.`,
    'KEY_EXPIRED': `${serviceDisplayName} API key has expired. Please generate a new key.`,
    'UNAUTHORIZED': `Unauthorized access. Please check your ${serviceDisplayName} API key permissions.`,
    
    // Network errors
    'NETWORK_ERROR': 'Network connection failed. Please check your internet connection and try again.',
    'TIMEOUT': 'Request timed out. Please try again in a moment.',
    'CONNECTION_REFUSED': 'Unable to connect to the service. Please try again later.',
    'DNS_ERROR': 'Network configuration issue. Please check your connection.',
    
    // Quota and rate limiting
    'QUOTA_EXCEEDED': `${serviceDisplayName} API quota exceeded. Please try again later or upgrade your plan.`,
    'RATE_LIMITED': `Too many requests. Please wait a moment before trying again.`,
    'DAILY_LIMIT_EXCEEDED': `Daily API limit exceeded. Please try again tomorrow or upgrade your plan.`,
    
    // Server errors
    'SERVER_ERROR': `${serviceDisplayName} server is experiencing issues. Please try again later.`,
    'SERVICE_UNAVAILABLE': `${serviceDisplayName} service is temporarily unavailable. Please try again later.`,
    'MAINTENANCE': `${serviceDisplayName} is under maintenance. Please try again later.`,
    
    // Storage errors
    'STORAGE_ERROR': 'Failed to save API key. Please try again.',
    'ENCRYPTION_ERROR': 'Failed to encrypt API key securely. Please try again.',
    'DATABASE_ERROR': 'Database error occurred. Please try again.',
    
    // Validation specific
    'VALIDATION_ERROR': `Failed to validate ${serviceDisplayName} API key. Please check the key and try again.`,
    'TEST_FAILED': `API key test failed. Please verify your ${serviceDisplayName} key is correct.`,
    
    // Default fallbacks
    'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.',
    'GENERIC_ERROR': 'Something went wrong. Please try again.',
  };

  return errorMessages[errorCode] || errorMessages['UNKNOWN_ERROR'];
}

// =============================================================================
// Error Classification and Enhancement
// =============================================================================

/**
 * Classifies errors into categories and determines handling strategy
 */
export function classifyError(error: unknown, context?: Partial<EnhancedError['context']>): EnhancedError {
  const sanitizedMessage = sanitizeErrorMessage(error);
  const message = String(sanitizedMessage).toLowerCase();
  
  let category: ErrorCategory = 'unknown';
  let code: ErrorCode = 'UNKNOWN_ERROR' as ErrorCode;
  let isRetryable = false;
  let isTemporary = false;
  let severity: EnhancedError['severity'] = 'medium';

  // Network-related errors
  if (message.includes('network') || message.includes('connection') || 
      message.includes('timeout') || message.includes('fetch')) {
    category = 'network';
    code = message.includes('timeout') ? 'TIMEOUT' as ErrorCode : 'NETWORK_ERROR' as ErrorCode;
    isRetryable = true;
    isTemporary = true;
    severity = 'medium';
  }
  
  // Authentication/Authorization errors
  else if (message.includes('unauthorized') || message.includes('forbidden') ||
           message.includes('invalid') && message.includes('key')) {
    category = 'authentication';
    code = 'INVALID_KEY' as ErrorCode;
    isRetryable = false;
    isTemporary = false;
    severity = 'high';
  }
  
  // Validation errors
  else if (message.includes('validation') || message.includes('format') ||
           message.includes('required') || message.includes('invalid')) {
    category = 'validation';
    code = 'VALIDATION_ERROR' as ErrorCode;
    isRetryable = false;
    isTemporary = false;
    severity = 'low';
  }
  
  // Quota/Rate limiting
  else if (message.includes('quota') || message.includes('limit') ||
           message.includes('exceeded') || message.includes('rate')) {
    category = 'quota';
    code = message.includes('quota') ? 'QUOTA_EXCEEDED' as ErrorCode : 'RATE_LIMITED' as ErrorCode;
    isRetryable = true;
    isTemporary = true;
    severity = 'medium';
  }
  
  // Server errors
  else if (message.includes('server') || message.includes('500') ||
           message.includes('502') || message.includes('503')) {
    category = 'server';
    code = 'SERVER_ERROR' as ErrorCode;
    isRetryable = true;
    isTemporary = true;
    severity = 'high';
  }

  const userMessage = createUserFriendlyMessage(
    String(code),
    context?.service,
    context?.operation
  );

  return {
    code,
    category,
    message: sanitizedMessage,
    userMessage,
    isRetryable,
    isTemporary,
    severity,
    timestamp: new Date(),
    context,
  };
}

// =============================================================================
// Toast Notification Management
// =============================================================================

/**
 * Enhanced toast notification with error categorization
 */
export function showErrorToast(
  error: EnhancedError,
  options: ErrorHandlingOptions = {}
): void {
  const {
    showToast = true,
    toastDuration,
    includeContext = false,
  } = options;

  if (!showToast) return;

  const title = getErrorTitle(error);
  let description = error.userMessage;

  // Add context information if requested and available
  if (includeContext && error.context) {
    if (error.context.service) {
      description += ` (Service: ${error.context.service})`;
    }
    if (error.context.operation) {
      description += ` (Operation: ${error.context.operation})`;
    }
  }

  // Add retry suggestion for retryable errors
  if (error.isRetryable) {
    description += error.isTemporary 
      ? ' You can try again in a moment.' 
      : ' Please try again.';
  }

  toast({
    title,
    description,
    variant: error.severity === 'low' ? 'default' : 'destructive',
    duration: toastDuration || (error.severity === 'critical' ? 10000 : 5000),
  });
}

/**
 * Success toast for positive feedback
 */
export function showSuccessToast(
  title: string,
  description?: string,
  duration?: number
): void {
  toast({
    title,
    description,
    variant: 'default',
    duration: duration || 3000,
  });
}

/**
 * Loading toast that can be updated
 */
export function showLoadingToast(
  title: string,
  description?: string
): { update: (newTitle: string, newDescription?: string, variant?: 'default' | 'destructive') => void } {
  const toastId = Date.now().toString();
  
  toast({
    title,
    description,
    duration: Infinity, // Keep open until updated
  });

  return {
    update: (newTitle: string, newDescription?: string, variant: 'default' | 'destructive' = 'default') => {
      toast({
        title: newTitle,
        description: newDescription,
        variant,
      });
    }
  };
}

/**
 * Get appropriate error title based on error category
 */
function getErrorTitle(error: EnhancedError): string {
  const titles: Record<ErrorCategory, string> = {
    validation: 'Validation Error',
    network: 'Connection Error',
    authentication: 'Authentication Error',
    authorization: 'Permission Error',
    quota: 'Usage Limit Error',
    server: 'Server Error',
    user: 'Input Error',
    unknown: 'Error',
  };

  return titles[error.category] || 'Error';
}

// =============================================================================
// React Hook Form Integration
// =============================================================================

/**
 * Handles React Hook Form errors with enhanced error messages
 */
export function handleFormErrors<T extends Record<string, any>>(
  errors: FieldErrors<T>,
  config: FormErrorConfig
): void {
  Object.entries(errors).forEach(([fieldName, fieldError]) => {
    if (fieldError) {
      const enhancedError = createFormFieldError(
        fieldName,
        fieldError as FieldError,
        config
      );
      
      showErrorToast(enhancedError, {
        showToast: true,
        includeContext: true,
      });
    }
  });
}

/**
 * Creates enhanced error from React Hook Form field error
 */
function createFormFieldError(
  fieldName: string,
  fieldError: FieldError,
  config: FormErrorConfig
): EnhancedError {
  const message = fieldError.message || 'Field validation failed';
  const userMessage = config.customMessages?.[fieldName] || message;

  return {
    code: (fieldError.type || 'VALIDATION_ERROR') as ErrorCode,
    category: 'validation',
    message: sanitizeErrorMessage(message),
    userMessage,
    isRetryable: false,
    isTemporary: false,
    severity: 'low',
    timestamp: new Date(),
    context: {
      service: config.service,
      operation: config.operation || 'form_validation',
      metadata: {
        field: fieldName,
        fieldType: fieldError.type,
      },
    },
  };
}

/**
 * Sets errors programmatically with enhanced messages
 */
export function setEnhancedFormError(
  setError: (name: any, error: any) => void,
  fieldName: string,
  message: string,
  type: string = 'manual'
): void {
  const sanitizedMessage = sanitizeErrorMessage(message);
  
  setError(fieldName, {
    type,
    message: String(sanitizedMessage),
  });
}

// =============================================================================
// API Key Specific Error Handling
// =============================================================================

/**
 * Handles API key validation errors with specific patterns
 */
export function handleApiKeyValidationError(
  result: YouTubeValidationResult,
  service: ApiService,
  operation: string = 'validation'
): EnhancedError {
  const context = {
    service,
    operation,
    metadata: {
      errorCode: result.errorCode,
      hasChannelInfo: !!result.channelInfo,
      hasQuotaInfo: !!result.quotaInfo,
    },
  };

  if (result.isValid) {
    // This shouldn't happen, but handle gracefully
    return {
      code: 'SUCCESS' as ErrorCode,
      category: 'validation',
      message: 'Validation successful' as SecureErrorMessage,
      userMessage: 'API key validation was successful',
      isRetryable: false,
      isTemporary: false,
      severity: 'low',
      timestamp: new Date(),
      context,
    };
  }

  // Map specific YouTube API error codes to enhanced errors
  const errorMessage = result.errorMessage || 'Validation failed';
  const errorCode = result.errorCode || 'VALIDATION_ERROR';

  let enhancedError = classifyError(errorMessage, context);

  // Override with specific API key error patterns
  if (errorCode === 'keyInvalid' || errorCode === 'badRequest') {
    enhancedError.code = 'INVALID_KEY' as ErrorCode;
    enhancedError.category = 'authentication';
    enhancedError.userMessage = `Invalid ${service.toUpperCase()} API key. Please verify your key is correct.`;
  } else if (errorCode === 'quotaExceeded') {
    enhancedError.code = 'QUOTA_EXCEEDED' as ErrorCode;
    enhancedError.category = 'quota';
    enhancedError.isRetryable = true;
    enhancedError.isTemporary = true;
  }

  return enhancedError;
}

/**
 * Handles API key storage/retrieval errors
 */
export function handleApiKeyStorageError(
  error: unknown,
  service: ApiService,
  operation: 'save' | 'delete' | 'retrieve' | 'update'
): EnhancedError {
  const baseError = classifyError(error, {
    service,
    operation,
  });

  // Enhance with storage-specific context
  const storageMessages: Record<string, string> = {
    save: `Failed to save ${service.toUpperCase()} API key securely`,
    delete: `Failed to delete ${service.toUpperCase()} API key`,
    retrieve: `Failed to retrieve ${service.toUpperCase()} API key`,
    update: `Failed to update ${service.toUpperCase()} API key`,
  };

  return {
    ...baseError,
    userMessage: storageMessages[operation] + '. Please try again.',
    context: {
      ...baseError.context,
      operation: `storage_${operation}`,
    },
  };
}

// =============================================================================
// Retry Logic and Recovery
// =============================================================================

/**
 * Implements retry logic with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  onRetry?: (attempt: number, error: EnhancedError) => void
): Promise<T> {
  let lastError: EnhancedError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = classifyError(error);
      
      // Don't retry if error is not retryable
      if (!lastError.isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Recovery suggestions based on error type
 */
export function getRecoverySuggestions(error: EnhancedError): string[] {
  const suggestions: Record<ErrorCategory, string[]> = {
    validation: [
      'Check the API key format',
      'Verify you copied the complete key',
      'Ensure no extra spaces or characters',
    ],
    network: [
      'Check your internet connection',
      'Try again in a moment',
      'Verify firewall settings',
    ],
    authentication: [
      'Verify your API key is correct',
      'Check if the key has proper permissions',
      'Generate a new API key if needed',
    ],
    authorization: [
      'Check API key permissions',
      'Verify account access level',
      'Contact service provider if needed',
    ],
    quota: [
      'Wait for quota reset',
      'Upgrade your API plan',
      'Reduce API usage',
    ],
    server: [
      'Try again later',
      'Check service status',
      'Contact support if persistent',
    ],
    user: [
      'Review your input',
      'Follow the required format',
      'Check field requirements',
    ],
    unknown: [
      'Try again',
      'Refresh the page',
      'Contact support if persistent',
    ],
  };

  return suggestions[error.category] || suggestions.unknown;
}

// =============================================================================
// Export Default Error Handler
// =============================================================================

/**
 * Main error handler function - handles any error with comprehensive feedback
 */
export function handleError(
  error: unknown,
  context?: Partial<EnhancedError['context']>,
  options: ErrorHandlingOptions = {}
): EnhancedError {
  const enhancedError = classifyError(error, context);
  
  // Show toast notification unless disabled
  if (options.showToast !== false) {
    showErrorToast(enhancedError, options);
  }

  // Log error if requested (for debugging/monitoring)
  if (options.logError) {
    console.error('Enhanced Error:', {
      error: enhancedError,
      originalError: error,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  return enhancedError;
}

export default {
  handleError,
  handleFormErrors,
  handleApiKeyValidationError,
  handleApiKeyStorageError,
  showErrorToast,
  showSuccessToast,
  showLoadingToast,
  sanitizeErrorMessage,
  withRetry,
  getRecoverySuggestions,
  setEnhancedFormError,
}; 
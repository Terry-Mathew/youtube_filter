import React, { useState, useCallback, useEffect } from 'react';
import { useForm, SubmitHandler, SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Loader2, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Copy,
  Trash2,
  RefreshCw,
  HelpCircle,
  Shield,
  ExternalLink,
  BookOpen,
  Lightbulb,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Import validation functions from auth module
import { 
  validateApiKey,
  validateApiKeyFormat,
  getApiKeyRequirements,
  getValidationStatusMessage,
  isTemporaryValidationError,
  type ApiService,
  type ApiKeyInfo,
  type YouTubeValidationResult,
  type ApiKeyValidationOptions
} from '@/api/auth';

// Import enhanced error handling - TASK_006_005
import errorHandler, {
  handleError,
  handleFormErrors,
  handleApiKeyValidationError,
  handleApiKeyStorageError,
  showSuccessToast,
  showLoadingToast,
  withRetry,
  getRecoverySuggestions,
  setEnhancedFormError,
  type EnhancedError,
  type ErrorHandlingOptions,
  type FormErrorConfig
} from '@/lib/error-handler';

// Import enhanced help components
import HelpTooltip, { 
  TooltipStep, 
  DocumentationLink,
  useOnboardingTooltips
} from '@/components/ui/HelpTooltip';

// Branded types from TASK_001
export type ApiKeyId = string & { readonly brand: unique symbol };

// Form validation schema with enhanced validation
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

type FormData = z.infer<ReturnType<typeof createApiKeySchema>>;

// Component props interface
export interface ApiKeySetupProps {
  service: ApiService;
  onSave?: (key: string, description?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onTest?: (key: string) => Promise<boolean>; // Deprecated: use built-in validation
  existingKey?: ApiKeyInfo;
  className?: string;
  validationOptions?: ApiKeyValidationOptions;
}

// Enhanced loading state interface
interface LoadingState {
  saving: boolean;
  testing: boolean;
  deleting: boolean;
  loading: boolean;
  retrying: boolean;
}

// Enhanced validation result state
interface ValidationState {
  result: YouTubeValidationResult | null;
  timestamp: number | null;
  attempts: number;
  error?: EnhancedError;
}

// Error display state
interface ErrorDisplayState {
  hasError: boolean;
  error?: EnhancedError;
  suggestions: string[];
  isRetryable: boolean;
}

// =============================================================================
// Helper Functions and Service Configuration
// =============================================================================

/**
 * Get display name for API service
 */
function getServiceDisplayName(service: ApiService): string {
  switch (service) {
    case 'youtube':
      return 'YouTube Data API v3';
    case 'openai':
      return 'OpenAI API';
    default:
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = service;
      return 'Unknown Service';
  }
}

/**
 * Get comprehensive help content for API key setup
 */
function getApiKeyHelpContent(service: ApiService) {
  const serviceName = getServiceDisplayName(service);
  const requirements = getApiKeyRequirements(service);
  
  const baseSteps = [
    {
      title: `${serviceName} Setup Guide`,
      content: (
        <div className="space-y-2">
          <p>Follow these steps to get your API key:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Visit the {service === 'youtube' ? 'Google Cloud Console' : 'provider platform'}</li>
            <li>Create a new project or select an existing one</li>
            <li>Enable the {serviceName}</li>
            <li>Create credentials (API key)</li>
            <li>Copy the key and paste it here</li>
          </ol>
        </div>
      ),
      action: {
        label: 'Open Setup Guide',
        href: requirements.helpUrl,
      },
    },
  ];

  if (service === 'youtube') {
    return [
      ...baseSteps,
      {
        title: 'YouTube API Setup Tips',
        content: (
          <div className="space-y-2">
            <p>Important considerations for YouTube API:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Ensure YouTube Data API v3 is enabled</li>
              <li>Check quota limits (10,000 units/day free)</li>
              <li>Restrict your API key to YouTube Data API</li>
              <li>Consider IP restrictions for security</li>
            </ul>
          </div>
        ),
      },
    ];
  }

  return baseSteps;
}

// =============================================================================
// Component Implementation
// =============================================================================

export function ApiKeySetup({
  service,
  onSave,
  onDelete,
  onTest, // Deprecated: use built-in validation
  existingKey,
  className,
  validationOptions = {},
}: ApiKeySetupProps) {
  // State management
  const [loadingState, setLoadingState] = useState<LoadingState>({
    saving: false,
    testing: false,
    deleting: false,
    loading: false,
    retrying: false,
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>({
    result: null,
    timestamp: null,
    attempts: 0,
  });
  
  const [errorDisplay, setErrorDisplay] = useState<ErrorDisplayState>({
    hasError: false,
    suggestions: [],
    isRetryable: false,
  });

  // Get service requirements and help content
  const requirements = getApiKeyRequirements(service);
  const helpSteps = getApiKeyHelpContent(service);
  
  // Initialize onboarding tooltips
  const onboarding = useOnboardingTooltips(helpSteps);

  // Form setup with enhanced error handling
  const apiKeySchema = createApiKeySchema(service);
  const form = useForm<FormData>({
    resolver: zodResolver(apiKeySchema),
    mode: 'onChange', // Real-time validation
    criteriaMode: 'all', // Show all validation errors
    defaultValues: {
      apiKey: '',
      description: existingKey?.description || '',
    },
  });

  // Form error configuration for enhanced error handling
  const formErrorConfig: FormErrorConfig = {
    field: 'apiKey',
    service,
    operation: 'form_validation',
    customMessages: {
      apiKey: `Please enter a valid ${getServiceDisplayName(service)} API key`,
      description: 'Description should be brief and descriptive',
    },
  };

  // Helper function to update loading state
  const updateLoadingState = useCallback((operation: keyof LoadingState, loading: boolean) => {
    setLoadingState(prev => ({ ...prev, [operation]: loading }));
  }, []);

  // Helper function to clear error display
  const clearErrorDisplay = useCallback(() => {
    setErrorDisplay({
      hasError: false,
      suggestions: [],
      isRetryable: false,
    });
  }, []);

  // Helper function to show error display
  const showErrorDisplay = useCallback((error: EnhancedError) => {
    setErrorDisplay({
      hasError: true,
      error,
      suggestions: getRecoverySuggestions(error),
      isRetryable: error.isRetryable,
    });
  }, []);

  // Enhanced form submission with comprehensive error handling
  const handleSaveApiKey: SubmitHandler<FormData> = useCallback(async (formData) => {
    updateLoadingState('saving', true);
    clearErrorDisplay();
    
    const loadingToast = showLoadingToast(
      'Saving API Key',
      'Validating and securely storing your API key...'
    );

    try {
      if (onSave) {
        // Use retry logic for saving
        await withRetry(
          () => onSave(formData.apiKey, formData.description),
          3, // maxRetries
          1000, // baseDelay
          (attempt, error) => {
            updateLoadingState('retrying', true);
            loadingToast.update(
              'Retrying Save',
              `Attempt ${attempt + 1}/3: ${error.userMessage}`,
              'destructive'
            );
          }
        );
        
        // Success feedback
        loadingToast.update(
          'API Key Saved',
          'Your API key has been saved and encrypted successfully.'
        );

        showSuccessToast(
          'API Key Saved',
          `Your ${getServiceDisplayName(service)} API key has been saved successfully.`,
          3000
        );

        // Reset form and validation state after successful save
        form.reset();
        setValidationState({ result: null, timestamp: null, attempts: 0 });
      }
    } catch (error) {
      const enhancedError = handleApiKeyStorageError(error, service, 'save');
      showErrorDisplay(enhancedError);
      
      loadingToast.update(
        'Save Failed',
        enhancedError.userMessage,
        'destructive'
      );
    } finally {
      updateLoadingState('saving', false);
      updateLoadingState('retrying', false);
    }
  }, [onSave, service, updateLoadingState, clearErrorDisplay, showErrorDisplay, form, getServiceDisplayName]);

  // Enhanced form error handler
  const handleFormError: SubmitErrorHandler<FormData> = useCallback((errors) => {
    handleFormErrors(errors, formErrorConfig);
    
    // Show validation error display
    const firstError = Object.values(errors)[0];
    if (firstError) {
      const enhancedError = handleError(
        firstError.message || 'Form validation failed',
        { service, operation: 'form_validation' },
        { showToast: false } // Already handled by handleFormErrors
      );
      showErrorDisplay(enhancedError);
    }
  }, [service, showErrorDisplay]);

  // Enhanced API key testing with comprehensive error handling
  const handleTestApiKey = useCallback(async () => {
    const apiKey = form.getValues('apiKey');
    if (!apiKey) {
      const error = handleError(
        'No API key provided',
        { service, operation: 'validation' }
      );
      showErrorDisplay(error);
      return;
    }

    // Format validation first
    if (!validateApiKeyFormat(service, apiKey)) {
      const error = handleError(
        `Invalid ${service} API key format. Expected: ${requirements.format}`,
        { service, operation: 'format_validation' }
      );
      showErrorDisplay(error);
      return;
    }

    updateLoadingState('testing', true);
    clearErrorDisplay();
    setValidationState(prev => ({ 
      result: null, 
      timestamp: null, 
      attempts: prev.attempts + 1 
    }));
    
    const loadingToast = showLoadingToast(
      'Testing API Key',
      `Validating your ${getServiceDisplayName(service)} API key...`
    );

    try {
      // Use enhanced validation with retry logic
      const result = await withRetry(
        () => validateApiKey(service, apiKey, validationOptions),
        validationOptions.maxRetries || 2,
        2000, // 2 second base delay
        (attempt, error) => {
          updateLoadingState('retrying', true);
          loadingToast.update(
            'Retrying Validation',
            `Attempt ${attempt + 1}/${validationOptions.maxRetries || 2}: ${error.userMessage}`,
            'destructive'
          );
        }
      );
      
      const enhancedError = handleApiKeyValidationError(result, service, 'validation');
      
      setValidationState({
        result,
        timestamp: Date.now(),
        attempts: validationState.attempts + 1,
        error: result.isValid ? undefined : enhancedError,
      });

      if (result.isValid) {
        loadingToast.update(
          'Validation Successful',
          result.channelInfo 
            ? `Connected to "${result.channelInfo.title}"` 
            : 'API key validated successfully'
        );

        showSuccessToast(
          'Test Successful',
          result.channelInfo 
            ? `Connected successfully to "${result.channelInfo.title}"` 
            : 'API key validation successful',
          4000
        );
        
        clearErrorDisplay();
      } else {
        showErrorDisplay(enhancedError);
        loadingToast.update(
          'Validation Failed',
          enhancedError.userMessage,
          'destructive'
        );
      }

      // Fallback to onTest prop if provided (backward compatibility)
      if (!result.isValid && onTest) {
        console.warn('Using deprecated onTest prop. Consider migrating to built-in validation.');
        try {
          const legacyResult = await onTest(apiKey);
          if (legacyResult) {
            setValidationState(prev => ({
              ...prev,
              result: {
                isValid: true,
                errorCode: undefined,
                errorMessage: undefined,
              },
            }));

            loadingToast.update(
              'Validation Successful',
              'API key validated using legacy method.'
            );

            showSuccessToast(
              'Connection Successful',
              'API key validated using legacy method.',
              3000
            );
            
            clearErrorDisplay();
          }
        } catch (legacyError) {
          console.error('Legacy validation failed:', legacyError);
          const error = handleError(legacyError, { service, operation: 'legacy_validation' });
          showErrorDisplay(error);
        }
      }

    } catch (error) {
      const enhancedError = handleApiKeyValidationError(
        { isValid: false, errorMessage: String(error), errorCode: 'VALIDATION_ERROR' },
        service,
        'validation'
      );
      
      setValidationState(prev => ({
        result: { isValid: false, errorMessage: String(error), errorCode: 'VALIDATION_ERROR' },
        timestamp: Date.now(),
        attempts: prev.attempts + 1,
        error: enhancedError,
      }));
      
      showErrorDisplay(enhancedError);
      loadingToast.update(
        'Test Failed',
        enhancedError.userMessage,
        'destructive'
      );
    } finally {
      updateLoadingState('testing', false);
      updateLoadingState('retrying', false);
    }
  }, [
    service, 
    form, 
    requirements, 
    validationOptions, 
    onTest, 
    updateLoadingState, 
    clearErrorDisplay, 
    showErrorDisplay, 
    validationState.attempts,
    getServiceDisplayName
  ]);

  // Enhanced API key deletion with comprehensive error handling
  const handleDeleteApiKey = useCallback(async () => {
    if (!existingKey) return;

    updateLoadingState('deleting', true);
    clearErrorDisplay();
    
    const loadingToast = showLoadingToast(
      'Deleting API Key',
      'Securely removing your API key...'
    );

    try {
      if (onDelete) {
        await withRetry(
          () => onDelete(),
          2, // Less retries for delete operations
          1000,
          (attempt, error) => {
            loadingToast.update(
              'Retrying Delete',
              `Attempt ${attempt + 1}/2: ${error.userMessage}`,
              'destructive'
            );
          }
        );
        
        loadingToast.update(
          'API Key Deleted',
          'Your API key has been removed successfully.'
        );

        showSuccessToast(
          'API Key Deleted',
          `Your ${getServiceDisplayName(service)} API key has been removed successfully.`,
          3000
        );
      }
    } catch (error) {
      const enhancedError = handleApiKeyStorageError(error, service, 'delete');
      showErrorDisplay(enhancedError);
      
      loadingToast.update(
        'Delete Failed',
        enhancedError.userMessage,
        'destructive'
      );
    } finally {
      updateLoadingState('deleting', false);
    }
  }, [existingKey, onDelete, service, updateLoadingState, clearErrorDisplay, showErrorDisplay, getServiceDisplayName]);

  // Enhanced copy to clipboard with error handling
  const handleCopyPreview = useCallback(async () => {
    if (existingKey?.keyPreview) {
      try {
        await navigator.clipboard.writeText(existingKey.keyPreview);
        showSuccessToast(
          'Copied',
          'Key preview copied to clipboard.',
          2000
        );
      } catch (error) {
        const enhancedError = handleError(
          'Failed to copy to clipboard',
          { service, operation: 'copy_preview' }
        );
        showErrorDisplay(enhancedError);
      }
    }
  }, [existingKey, service, showErrorDisplay]);

  // Retry operation handler
  const handleRetryOperation = useCallback(() => {
    if (errorDisplay.error?.context?.operation?.includes('validation')) {
      handleTestApiKey();
    } else if (errorDisplay.error?.context?.operation?.includes('save')) {
      form.handleSubmit(handleSaveApiKey, handleFormError)();
    }
  }, [errorDisplay.error, handleTestApiKey, form, handleSaveApiKey, handleFormError]);

  // Auto-clear validation results after time
  useEffect(() => {
    if (validationState.timestamp) {
      const timer = setTimeout(() => {
        setValidationState(prev => ({
          ...prev,
          result: null,
          timestamp: null,
        }));
        clearErrorDisplay();
      }, 30000); // Clear after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [validationState.timestamp, clearErrorDisplay]);

  // Get current validation result for display
  const currentValidation = validationState.result;
  const isValidationRecent = validationState.timestamp && (Date.now() - validationState.timestamp) < 30000; // 30 seconds

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <div>
              <CardTitle className="flex items-center gap-2">
                {getServiceDisplayName(service)}
                {existingKey && (
                  <HelpTooltip 
                    content="Your API key is encrypted and stored securely using AES-256 encryption"
                    type="info"
                    asChild
                  >
                    <Shield className="h-4 w-4 text-green-600 cursor-help" />
                  </HelpTooltip>
                )}
                <HelpTooltip
                  content={
                    <TooltipStep
                      title="Getting Started"
                      content="Click here to start the setup guide for getting your API key"
                      action={{
                        label: 'Start Setup Guide',
                        onClick: onboarding.startOnboarding,
                      }}
                    />
                  }
                  type="guide"
                >
                  <BookOpen className="h-4 w-4" />
                </HelpTooltip>
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {service === 'youtube' 
                  ? 'Connect your YouTube Data API key to enable video search and analysis'
                  : 'Connect your API key for enhanced functionality'
                }
                <HelpTooltip
                  content={
                    <div className="space-y-2">
                      <p className="font-medium">What you can do with {getServiceDisplayName(service)}:</p>
                      {service === 'youtube' ? (
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Search and filter YouTube videos</li>
                          <li>Access video metadata and statistics</li>
                          <li>Get channel information</li>
                          <li>Analyze video content and trends</li>
                        </ul>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Enhanced AI-powered features</li>
                          <li>Content analysis and processing</li>
                          <li>Automated content filtering</li>
                        </ul>
                      )}
                    </div>
                  }
                  type="info"
                  maxWidth={280}
                >
                  <Info className="h-3 w-3" />
                </HelpTooltip>
              </CardDescription>
            </div>
          </div>
          
          {existingKey && (
            <div className="flex items-center gap-2">
              <Badge variant={existingKey.isValid ? "default" : "destructive"}>
                {existingKey.isValid ? "Connected" : "Invalid"}
              </Badge>
              {validationState.attempts > 0 && (
                <HelpTooltip
                  content={`This key has been tested ${validationState.attempts} time${validationState.attempts !== 1 ? 's' : ''}. Regular testing helps ensure your API key remains valid and functional.`}
                  type="info"
                >
                  <Badge variant="outline" className="text-xs cursor-help">
                    {validationState.attempts} test{validationState.attempts !== 1 ? 's' : ''}
                  </Badge>
                </HelpTooltip>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Help Mode Onboarding */}
        {onboarding.isActive && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-900">
                Step {onboarding.stepNumber} of {onboarding.totalSteps}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onboarding.stopOnboarding}
                className="text-blue-600 hover:text-blue-800"
              >
                Skip Guide
              </Button>
            </div>
            <TooltipStep {...onboarding.currentStep} />
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onboarding.prevStep}
                disabled={onboarding.isFirstStep}
              >
                Previous
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onboarding.nextStep}
              >
                {onboarding.isLastStep ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Existing Key Status */}
        {existingKey && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>API Key Connected</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Key ending in {existingKey.keyPreview}
                {existingKey.lastUsed && (
                  <span className="text-muted-foreground ml-2">
                    • Last used {existingKey.lastUsed.toLocaleDateString()}
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPreview}
                  title="Copy preview to clipboard"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteApiKey}
                  disabled={loadingState.deleting}
                  title="Delete API key"
                >
                  {loadingState.deleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Error Display */}
        {errorDisplay.hasError && errorDisplay.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>{errorDisplay.error.category === 'validation' ? 'Validation Error' : 'Error'}</span>
              {errorDisplay.isRetryable && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetryOperation}
                  disabled={loadingState.testing || loadingState.saving}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{errorDisplay.error.userMessage}</p>
              {errorDisplay.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Suggestions:</p>
                  <ul className="text-sm space-y-1">
                    {errorDisplay.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-muted-foreground">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {errorDisplay.error.isTemporary && (
                <p className="text-sm text-muted-foreground">
                  This appears to be a temporary issue. You can try again in a moment.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Result Display */}
        {currentValidation && isValidationRecent && !errorDisplay.hasError && (
          <Alert variant={currentValidation.isValid ? "default" : "destructive"}>
            {currentValidation.isValid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {currentValidation.isValid ? "Test Successful" : "Test Failed"}
            </AlertTitle>
            <AlertDescription>
              {currentValidation.isValid && currentValidation.channelInfo ? (
                <div className="space-y-1">
                  <p>Connected successfully to "{currentValidation.channelInfo.title}"</p>
                  {currentValidation.quotaInfo && (
                    <p className="text-sm text-muted-foreground">
                      Quota used: {currentValidation.quotaInfo.cost} unit(s)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <p>{currentValidation.errorMessage}</p>
                  {isTemporaryValidationError(currentValidation) && (
                    <p className="text-sm text-muted-foreground">
                      This appears to be a temporary issue. You may retry in a moment.
                    </p>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* API Key Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveApiKey, handleFormError)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    API Key
                    {fieldState.error && <AlertCircle className="h-3 w-3 text-destructive" />}
                    <HelpTooltip
                      content={
                        <div className="space-y-2">
                          <p className="font-medium">API Key Format</p>
                          <p className="text-xs">Expected format: <code className="bg-muted px-1 rounded">{requirements.format}</code></p>
                          <p className="text-xs">The API key should be {requirements.length} characters long and contain only alphanumeric characters, hyphens, and underscores.</p>
                          {service === 'youtube' && (
                            <div className="pt-1 border-t">
                              <p className="text-xs font-medium">YouTube API Key Tips:</p>
                              <ul className="text-xs space-y-1 list-disc list-inside">
                                <li>Starts with "AIza"</li>
                                <li>Exactly 39 characters long</li>
                                <li>Restrict to YouTube Data API v3 only</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      }
                      type="help"
                      maxWidth={320}
                    >
                      <HelpCircle className="h-3 w-3" />
                    </HelpTooltip>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showApiKey ? "text" : "password"}
                        placeholder={requirements.example}
                        className={fieldState.error ? "border-destructive" : ""}
                        aria-invalid={fieldState.error ? "true" : "false"}
                        disabled={loadingState.saving || loadingState.testing}
                      />
                      <HelpTooltip
                        content={showApiKey ? "Hide your API key for security" : "Show your API key to verify it's correct"}
                        type="tip"
                        asChild
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowApiKey(!showApiKey)}
                          disabled={loadingState.saving || loadingState.testing}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {showApiKey ? "Hide" : "Show"} API key
                          </span>
                        </Button>
                      </HelpTooltip>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Description (Optional)
                    <HelpTooltip
                      content={
                        <div className="space-y-2">
                          <p>Add a description to help identify this API key.</p>
                          <div className="text-xs space-y-1">
                            <p className="font-medium">Good examples:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              <li>"Production API key"</li>
                              <li>"Development testing"</li>
                              <li>"Personal project - YouTube analyzer"</li>
                            </ul>
                          </div>
                        </div>
                      }
                      type="tip"
                    >
                      <Lightbulb className="h-3 w-3" />
                    </HelpTooltip>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Production API key"
                      disabled={loadingState.saving || loadingState.testing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Enhanced Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={
                  loadingState.saving || 
                  loadingState.testing || 
                  !form.formState.isValid ||
                  !form.watch('apiKey')
                }
                className="flex-1"
              >
                {loadingState.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loadingState.retrying && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {loadingState.saving 
                  ? (loadingState.retrying ? 'Retrying...' : 'Saving...') 
                  : 'Save API Key'
                }
              </Button>
              
              <HelpTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-medium">Test Your API Key</p>
                    <p className="text-xs">Validate your API key by making a test request to ensure it works correctly.</p>
                    {service === 'youtube' && (
                      <p className="text-xs">This will use approximately 1-2 quota units from your daily allowance.</p>
                    )}
                  </div>
                }
                type="info"
                asChild
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestApiKey}
                  disabled={
                    loadingState.testing || 
                    loadingState.saving || 
                    !form.watch('apiKey')
                  }
                >
                  {loadingState.testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loadingState.retrying && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  {loadingState.testing 
                    ? (loadingState.retrying ? 'Retrying...' : 'Testing...') 
                    : 'Test'
                  }
                </Button>
              </HelpTooltip>

              {/* Enhanced Help Button */}
              <HelpTooltip
                content={
                  <TooltipStep
                    title="Need Help?"
                    content="Get step-by-step instructions for setting up your API key, including screenshots and troubleshooting tips."
                    action={{
                      label: 'Open Complete Guide',
                      href: requirements.helpUrl,
                    }}
                  />
                }
                type="guide"
                asChild
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(requirements.helpUrl, '_blank')}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </HelpTooltip>
            </div>
          </form>
        </Form>

        {/* Comprehensive Help Documentation */}
        <div className="space-y-4 pt-4 border-t">
          {/* Quick Setup Guide */}
          <div className="text-sm space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-foreground">Quick Setup Guide</h4>
              <HelpTooltip
                content="Step-by-step instructions to get your API key quickly"
                type="info"
              >
                <Info className="h-3 w-3" />
              </HelpTooltip>
            </div>
            <div className="bg-muted/50 rounded-md p-3 space-y-2">
              <p className="text-xs font-medium">
                Get your {getServiceDisplayName(service)} key from{' '}
                <DocumentationLink href={requirements.helpUrl}>
                  {service === 'youtube' ? 'Google Cloud Console' : 'the provider\'s platform'}
                </DocumentationLink>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground">Security & Storage:</p>
                  <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                    <li>AES-256 encryption at rest</li>
                    <li>Secure transmission (HTTPS)</li>
                    <li>No plain-text storage</li>
                    <li>User-specific access controls</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Key Format:</p>
                  <div className="space-y-1">
                    <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono block">
                      {requirements.format}
                    </code>
                    <p className="text-muted-foreground">Example: {requirements.example}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting Section */}
          <div className="text-sm space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <h4 className="font-medium text-foreground">Troubleshooting</h4>
              <HelpTooltip
                content="Common issues and their solutions"
                type="tip"
              >
                <Lightbulb className="h-3 w-3" />
              </HelpTooltip>
            </div>
            <div className="space-y-2">
              {service === 'youtube' && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <span className="transition-transform group-open:rotate-90">▶</span>
                    YouTube API Common Issues
                  </summary>
                  <div className="mt-2 pl-4 space-y-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium">❌ "Invalid API Key" Error:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Verify the key starts with "AIza" and is 39 characters</li>
                        <li>Check that YouTube Data API v3 is enabled</li>
                        <li>Ensure API key restrictions allow YouTube API</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">❌ "Quota Exceeded" Error:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Check your daily quota usage in Google Cloud Console</li>
                        <li>Wait for quota reset (midnight Pacific Time)</li>
                        <li>Consider upgrading your quota limits</li>
                      </ul>
                    </div>
                  </div>
                </details>
              )}
              
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <span className="transition-transform group-open:rotate-90">▶</span>
                  General Troubleshooting
                </summary>
                <div className="mt-2 pl-4 space-y-2 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium">🔧 Key Not Working:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Copy the key directly from the provider</li>
                      <li>Check for extra spaces or hidden characters</li>
                      <li>Verify the key hasn't expired</li>
                      <li>Test with a simple API call outside this app</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">🌐 Network Issues:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Check your internet connection</li>
                      <li>Verify firewall settings allow HTTPS</li>
                      <li>Try again after a few minutes</li>
                    </ul>
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Validation Status */}
          {validationState.attempts > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span>Validation History</span>
              </div>
              <p>
                Attempts: {validationState.attempts} | Last tested: {
                  validationState.timestamp 
                    ? new Date(validationState.timestamp).toLocaleString()
                    : 'Never'
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
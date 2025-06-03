"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, History, Trash2, User, Bell, Shield, Folder, Key, Sun, Moon, CheckCircle, AlertCircle, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryManager } from "@/components/CategoryManager";
import { useAppStore } from '../store';
import {
  authApi,
  validateApiKey,
  createApiKeyPreview,
  getValidationStatusMessage,
  isTemporaryValidationError,
  type ApiService,
  type ApiKeyInfo,
  type YouTubeValidationResult,
  type UpdateProfileRequest,
  type ApiKeyValidationOptions,
} from '@/api/auth';
import { ApiKeySetup } from '@/components/ApiKeySetup';
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
import { toast } from '@/hooks/use-toast';
import type { UserProfile, UserPreferences } from '../types';

// =============================================================================
// Settings Form Schemas with Zod Validation
// =============================================================================

const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address'),
  avatarUrl: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  timezone: z
    .string()
    .optional(),
  language: z
    .string()
    .optional(),
});

const passwordSchema = z.object({
  currentPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultViewMode: z.enum(['grid', 'list']).optional(),
  enableAnalytics: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  autoPlayPreviews: z.boolean().optional(),
  defaultRelevanceThreshold: z.number().min(0).max(1).optional(),
  videosPerPage: z.number().min(10).max(100).optional(),
  preferredQuality: z.enum(['low', 'medium', 'high', 'excellent']).optional(),
});

// Type definitions
type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type PreferencesFormData = z.infer<typeof preferencesSchema>;

// =============================================================================
// Settings Page State Management
// =============================================================================

interface SettingsState {
  loading: {
    profile: boolean;
    password: boolean;
    preferences: boolean;
    apiKeys: boolean;
  };
  user: {
    profile: UserProfile | null;
    preferences: UserPreferences | null;
  };
  apiKeys: {
    youtube: ApiKeyInfo | null;
    openai: ApiKeyInfo | null;
  };
  validation: {
    [key: string]: {
      result: YouTubeValidationResult | null;
      timestamp: number | null;
    };
  };
}

// =============================================================================
// Main Settings Component
// =============================================================================

export default function Settings() {
  const { 
    userPreferences, 
    updateUserPreferences, 
    searchHistory,
    clearSearchHistory
  } = useAppStore();

  const [activeTab, setActiveTab] = useState("profile");

  // State management
  const [settingsState, setSettingsState] = useState<SettingsState>({
    loading: {
      profile: false,
      password: false,
      preferences: false,
      apiKeys: false,
    },
    user: {
      profile: null,
      preferences: null,
    },
    apiKeys: {
      youtube: null,
      openai: null,
    },
    validation: {},
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Form configurations
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      avatarUrl: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'en',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    mode: 'onChange',
    defaultValues: {
      theme: 'system',
      defaultViewMode: 'grid',
      enableAnalytics: true,
      emailNotifications: true,
      autoPlayPreviews: false,
      defaultRelevanceThreshold: 0.7,
      videosPerPage: 20,
      preferredQuality: 'high',
    },
  });

  // Helper function to update loading state
  const updateLoadingState = (section: keyof SettingsState['loading'], loading: boolean) => {
    setSettingsState(prev => ({
      ...prev,
      loading: { ...prev.loading, [section]: loading },
    }));
  };

  // Helper function to update validation state
  const updateValidationState = (service: string, result: YouTubeValidationResult | null) => {
    setSettingsState(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [service]: {
          result,
          timestamp: result ? Date.now() : null,
        },
      },
    }));
  };

  // =============================================================================
  // Data Loading and Initialization
  // =============================================================================

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    updateLoadingState('profile', true);
    updateLoadingState('apiKeys', true);

    try {
      // Load user profile
      const profileResponse = await authApi.getUserProfile();
      if (profileResponse.success && profileResponse.data) {
        const userData = profileResponse.data;
        
        profileForm.reset({
          fullName: userData.full_name || '',
          email: userData.email,
          avatarUrl: userData.avatar_url || '',
          timezone: userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: userData.language || 'en',
        });

        if (userData.preferences) {
          preferencesForm.reset({
            theme: userData.preferences.theme || 'system',
            defaultViewMode: userData.preferences.defaultViewMode || 'grid',
            enableAnalytics: userData.preferences.enableAnalytics ?? true,
            emailNotifications: userData.preferences.emailNotifications ?? true,
            autoPlayPreviews: userData.preferences.autoPlayPreviews ?? false,
            defaultRelevanceThreshold: userData.preferences.defaultRelevanceThreshold || 0.7,
            videosPerPage: userData.preferences.videosPerPage || 20,
            preferredQuality: userData.preferences.preferredQuality || 'high',
          });
        }

        setSettingsState(prev => ({
          ...prev,
          user: {
            profile: userData,
            preferences: userData.preferences || null,
          },
        }));
      }

      // Load API keys
      const apiKeysResponse = await authApi.getApiKeys();
      if (apiKeysResponse.success && apiKeysResponse.data) {
        const apiKeys = apiKeysResponse.data;
        const youtubeKey = apiKeys.find(key => key.service === 'youtube');
        const openaiKey = apiKeys.find(key => key.service === 'openai');

        setSettingsState(prev => ({
          ...prev,
          apiKeys: {
            youtube: youtubeKey || null,
            openai: openaiKey || null,
          },
        }));
      }

    } catch (error) {
      toast({
        title: "Loading Failed",
        description: error instanceof Error ? error.message : 'Failed to load settings',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('profile', false);
      updateLoadingState('apiKeys', false);
    }
  };

  // =============================================================================
  // Form Submit Handlers
  // =============================================================================

  const handleProfileSubmit = async (data: ProfileFormData) => {
    updateLoadingState('profile', true);

    try {
      const updateRequest: UpdateProfileRequest = {
        fullName: data.fullName,
        avatarUrl: data.avatarUrl || undefined,
        timezone: data.timezone,
        language: data.language,
        preferences: settingsState.user.preferences || {},
      };

      const response = await authApi.updateProfile(updateRequest);
      
      if (response.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });

        // Refresh user data
        await initializeSettings();
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }

    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('profile', false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    updateLoadingState('password', true);

    try {
      const response = await authApi.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        });

        // Reset form
        passwordForm.reset();
        setShowPasswords({ current: false, new: false, confirm: false });
      } else {
        throw new Error(response.error || 'Failed to update password');
      }

    } catch (error) {
      toast({
        title: "Password Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('password', false);
    }
  };

  const handlePreferencesSubmit = async (data: PreferencesFormData) => {
    updateLoadingState('preferences', true);

    try {
      const updateRequest: UpdateProfileRequest = {
        preferences: {
          ...settingsState.user.preferences,
          ...data,
        },
      };

      const response = await authApi.updateProfile(updateRequest);

      if (response.success) {
        toast({
          title: "Preferences Updated",
          description: "Your preferences have been saved successfully.",
        });

        // Apply theme immediately
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (data.theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        }

      } else {
        throw new Error(response.error || 'Failed to update preferences');
      }

    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update preferences',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('preferences', false);
    }
  };

  // =============================================================================
  // API Key Management Handlers
  // =============================================================================

  const handleApiKeySave = async (service: ApiService, apiKey: string, description?: string) => {
    updateLoadingState('apiKeys', true);

    try {
      // Validate API key first
      const validationResult = await validateApiKey(service, apiKey, {
        useRetry: true,
        maxRetries: 2,
        timeout: 15000,
      });

      if (!validationResult.isValid) {
        const statusMessage = getValidationStatusMessage(validationResult);
        throw new Error(statusMessage.message);
      }

      // Save API key
      const response = await authApi.setupApiKey({
        service,
        apiKey,
        description,
      });

      if (response.success && response.data) {
        toast({
          title: "API Key Saved",
          description: `Your ${service.toUpperCase()} API key has been saved successfully.`,
        });

        // Update local state
        setSettingsState(prev => ({
          ...prev,
          apiKeys: {
            ...prev.apiKeys,
            [service]: response.data!,
          },
        }));

        // Update validation state
        updateValidationState(service, validationResult);

      } else {
        throw new Error(response.error || 'Failed to save API key');
      }

    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save API key',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('apiKeys', false);
    }
  };

  const handleApiKeyDelete = async (service: ApiService) => {
    const apiKey = settingsState.apiKeys[service];
    if (!apiKey) return;

    updateLoadingState('apiKeys', true);

    try {
      const response = await authApi.deleteApiKey(apiKey.id);

      if (response.success) {
        toast({
          title: "API Key Deleted",
          description: `Your ${service.toUpperCase()} API key has been removed successfully.`,
        });

        // Update local state
        setSettingsState(prev => ({
          ...prev,
          apiKeys: {
            ...prev.apiKeys,
            [service]: null,
          },
        }));

        // Clear validation state
        updateValidationState(service, null);

      } else {
        throw new Error(response.error || 'Failed to delete API key');
      }

    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Failed to delete API key',
        variant: "destructive",
      });
    } finally {
      updateLoadingState('apiKeys', false);
    }
  };

  const handleApiKeyTest = async (service: ApiService, apiKey: string): Promise<boolean> => {
    try {
      const validationResult = await validateApiKey(service, apiKey, {
        useRetry: false,
        timeout: 10000,
      });

      updateValidationState(service, validationResult);
      return validationResult.isValid;

    } catch (error) {
      updateValidationState(service, {
        isValid: false,
        errorCode: 'TEST_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Test failed',
      });
      return false;
    }
  };

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderProfileTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
        <CardDescription>
          Update your personal information and account details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
            <FormField
              control={profileForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="bg-muted" />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed. Contact support if needed.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={profileForm.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/avatar.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input placeholder="America/New_York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={settingsState.loading.profile || !profileForm.formState.isValid}
              className="w-full md:w-auto"
            >
              {settingsState.loading.profile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {settingsState.loading.profile ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  const renderSecurityTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your account password. Use a strong, unique password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPasswords.current ? "text" : "password"}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPasswords.new ? "text" : "password"}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPasswords.confirm ? "text" : "password"}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={settingsState.loading.password || !passwordForm.formState.isValid}
              className="w-full md:w-auto"
            >
              {settingsState.loading.password && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Shield className="mr-2 h-4 w-4" />
              {settingsState.loading.password ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  const renderApiKeysTab = () => (
    <div className="space-y-6">
      {/* API Keys Management Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Securely store and manage your API keys for external services. All keys are encrypted and validated before storage.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* YouTube API Key */}
      <ApiKeySetup
        service="youtube"
        existingKey={settingsState.apiKeys.youtube || undefined}
        onSave={(key, description) => handleApiKeySave('youtube', key, description)}
        onDelete={() => handleApiKeyDelete('youtube')}
        onTest={(key) => handleApiKeyTest('youtube', key)}
        validationOptions={{
          useRetry: true,
          maxRetries: 2,
          timeout: 15000,
        }}
      />

      {/* OpenAI API Key */}
      <ApiKeySetup
        service="openai"
        existingKey={settingsState.apiKeys.openai || undefined}
        onSave={(key, description) => handleApiKeySave('openai', key, description)}
        onDelete={() => handleApiKeyDelete('openai')}
        onTest={(key) => handleApiKeyTest('openai', key)}
        validationOptions={{
          useRetry: true,
          maxRetries: 2,
          timeout: 15000,
        }}
      />
    </div>
  );

  const renderPreferencesTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Application Preferences
        </CardTitle>
        <CardDescription>
          Customize your YouTube Filter experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...preferencesForm}>
          <form onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Appearance</h4>
              
              <FormField
                control={preferencesForm.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <FormControl>
                      <div className="flex gap-4">
                        {[
                          { value: 'light', label: 'Light', icon: Sun },
                          { value: 'dark', label: 'Dark', icon: Moon },
                          { value: 'system', label: 'System', icon: SettingsIcon },
                        ].map(({ value, label, icon: Icon }) => (
                          <label
                            key={value}
                            className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-colors ${
                              field.value === value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            <input
                              type="radio"
                              value={value}
                              checked={field.value === value}
                              onChange={field.onChange}
                              className="sr-only"
                            />
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{label}</span>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={preferencesForm.control}
                name="defaultViewMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default View</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="grid">Grid View</option>
                        <option value="list">List View</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium">Video Settings</h4>
              
              <FormField
                control={preferencesForm.control}
                name="preferredQuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Video Quality</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="excellent">Excellent</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={preferencesForm.control}
                name="videosPerPage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Videos Per Page</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="10" 
                        max="100" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={preferencesForm.control}
                name="defaultRelevanceThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Relevance Threshold</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      Minimum relevance score (0.0 - 1.0) for video classification
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium">Preferences</h4>
              
              <FormField
                control={preferencesForm.control}
                name="autoPlayPreviews"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Auto-play Video Previews</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Automatically play video previews when hovering
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={preferencesForm.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Email Notifications</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications about important updates
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={preferencesForm.control}
                name="enableAnalytics"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Enable Analytics</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Help improve the app by sharing anonymous usage data
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={settingsState.loading.preferences || !preferencesForm.formState.isValid}
              className="w-full md:w-auto"
            >
              {settingsState.loading.preferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {settingsState.loading.preferences ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="mr-3 h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your account preferences and application settings.
          </p>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Preferences</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              {renderProfileTab()}
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              {renderSecurityTab()}
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-6">
              {renderApiKeysTab()}
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              {renderPreferencesTab()}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
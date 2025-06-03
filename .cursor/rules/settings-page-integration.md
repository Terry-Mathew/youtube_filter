# Settings Page Integration Rules

## Overview
This document defines standards for settings page implementation in the YouTube Filter application, specifically for TASK_006_003 implementation patterns with Supabase auth integration.

## Settings Page Architecture

### ✅ ALWAYS Follow These Integration Patterns

1. **Multi-Tab Layout Structure**
   - Use shadcn/ui Tabs component for section organization
   - Implement 4 core tabs: Profile, Security, API Keys, Preferences
   - Ensure responsive design with icon-only tabs on mobile
   - Maintain consistent spacing and layout patterns

2. **Form State Management**
   - Use react-hook-form with Zod validation for all forms
   - Implement separate forms for each settings section
   - Use TypeScript-first form validation schemas
   - Provide real-time validation feedback

3. **Supabase Auth Integration**
   - Always authenticate users before loading settings
   - Use authApi singleton for all authentication operations
   - Implement proper error handling for auth failures
   - Cache user data appropriately with loading states

4. **API Key Management Integration**
   - Integrate ApiKeySetup component for each service
   - Implement validation before saving API keys
   - Store encrypted keys via Supabase (placeholder for TASK_015)
   - Provide immediate feedback on validation results

### ❌ NEVER Do These Settings Things

1. **Poor State Management**
   - Mix form state with component state unnecessarily
   - Skip loading states during async operations
   - Forget to reset forms after successful operations
   - Use multiple forms when one sectioned form would suffice

2. **Security Violations**
   - Display sensitive data in plain text
   - Skip validation before API operations
   - Store sensitive data in component state
   - Expose full API keys in any UI elements

## Form Schema Patterns

### Profile Form Schema
```typescript
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
  timezone: z.string().optional(),
  language: z.string().optional(),
});
```

### Password Form Schema
```typescript
const passwordSchema = z.object({
  currentPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password requirements message'),
  confirmPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

### Preferences Form Schema
```typescript
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
```

## State Management Patterns

### Settings State Interface
```typescript
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
```

### Loading State Management
```typescript
const updateLoadingState = (section: keyof SettingsState['loading'], loading: boolean) => {
  setSettingsState(prev => ({
    ...prev,
    loading: { ...prev.loading, [section]: loading },
  }));
};
```

## Form Integration Patterns

### Form Initialization
```typescript
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
```

### Form Submit Handlers
```typescript
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
      await initializeSettings(); // Refresh data
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
```

## API Key Integration Patterns

### API Key Component Integration
```typescript
const renderApiKeysTab = () => (
  <div className="space-y-6">
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
  </div>
);
```

### API Key Management Handlers
```typescript
const handleApiKeySave = async (service: ApiService, apiKey: string, description?: string) => {
  updateLoadingState('apiKeys', true);

  try {
    // Validate first
    const validationResult = await validateApiKey(service, apiKey, {
      useRetry: true,
      maxRetries: 2,
      timeout: 15000,
    });

    if (!validationResult.isValid) {
      const statusMessage = getValidationStatusMessage(validationResult);
      throw new Error(statusMessage.message);
    }

    // Save to Supabase
    const response = await authApi.setupApiKey({
      service,
      apiKey,
      description,
    });

    if (response.success && response.data) {
      // Update local state
      setSettingsState(prev => ({
        ...prev,
        apiKeys: {
          ...prev.apiKeys,
          [service]: response.data!,
        },
      }));
      
      updateValidationState(service, validationResult);
    }
  } catch (error) {
    // Handle errors appropriately
  } finally {
    updateLoadingState('apiKeys', false);
  }
};
```

## UI Component Patterns

### Password Field with Visibility Toggle
```typescript
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
```

### Theme Selection Component
```typescript
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
```

### Checkbox Field with Description
```typescript
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
```

## Data Loading Patterns

### Initialization Function
```typescript
const initializeSettings = async () => {
  updateLoadingState('profile', true);
  updateLoadingState('apiKeys', true);

  try {
    // Load user profile
    const profileResponse = await authApi.getUserProfile();
    if (profileResponse.success && profileResponse.data) {
      const userData = profileResponse.data;
      
      // Reset forms with loaded data
      profileForm.reset({
        fullName: userData.full_name || '',
        email: userData.email,
        avatarUrl: userData.avatar_url || '',
        timezone: userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: userData.language || 'en',
      });

      // Handle preferences if they exist
      if (userData.preferences) {
        preferencesForm.reset({
          theme: userData.preferences.theme || 'system',
          defaultViewMode: userData.preferences.defaultViewMode || 'grid',
          // ... other preference fields
        });
      }

      // Update state
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
      // Process and set API keys
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
```

## Toast Notification Patterns

### Success Notifications
```typescript
toast({
  title: "Profile Updated",
  description: "Your profile has been updated successfully.",
});
```

### Error Notifications
```typescript
toast({
  title: "Update Failed",
  description: error instanceof Error ? error.message : 'Failed to update profile',
  variant: "destructive",
});
```

### API Key Specific Notifications
```typescript
toast({
  title: "API Key Saved",
  description: `Your ${service.toUpperCase()} API key has been saved successfully.`,
});
```

## Testing Requirements

### Unit Tests
- ✓ Form validation for all schemas
- ✓ State management functions
- ✓ API integration error handling
- ✓ Loading state transitions
- ✓ Form reset behavior

### Integration Tests
- ✓ Complete settings workflow (load → edit → save)
- ✓ API key validation integration
- ✓ Theme application functionality
- ✓ Cross-tab data consistency
- ✓ Error recovery scenarios

### Security Tests
- ✓ Password visibility toggle security
- ✓ API key masking in UI
- ✓ Form data sanitization
- ✓ Authentication state validation

## Performance Guidelines

### Optimization Patterns
- Lazy load heavy components when tabs are accessed
- Debounce form validation for number inputs
- Cache API responses appropriately
- Use React.memo for stable components
- Minimize re-renders with proper state structure

### Loading Strategy
- Show skeleton loaders during initial data fetch
- Use optimistic updates where appropriate
- Implement proper error boundaries
- Provide clear feedback for all async operations

## Accessibility Requirements

### Form Accessibility
- All form fields must have proper labels
- Use aria-invalid for validation states
- Implement proper focus management
- Support keyboard navigation for all interactive elements

### Screen Reader Support
- Use semantic HTML structure
- Provide clear section headings
- Use role="alert" for important messages
- Ensure proper tab order for complex layouts

## Future Enhancement Hooks

### Extensibility Points
- Settings state structure supports new sections
- Form schema patterns can be extended
- API key management supports new services
- Theme system can be expanded
- Validation system is service-agnostic

### Integration Points
- User profile data sync with external systems
- Settings export/import functionality
- Advanced permission management
- Multi-tenancy support preparation
- Analytics integration for usage tracking 
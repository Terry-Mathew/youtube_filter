# API Key UI Components Rules

## Security-First UI Design

### ✅ ALWAYS Follow These UI Security Rules

1. **Password Input Fields**
   - Use `type="password"` for API key inputs by default
   - Provide show/hide toggle button with eye icons
   - Never auto-complete API key fields (`autoComplete="off"`)
   - Clear form data after successful submission

2. **Key Preview Display**
   - Only show last 4 characters of stored keys
   - Use format: "Key ending in 1234"
   - Never display full API keys in UI
   - Provide copy functionality for key previews only

3. **Visual Security Indicators**
   - Use badges to show connection status (Connected/Invalid)
   - Display security icons (lock, key, shield)
   - Show loading states during security operations
   - Use destructive variants for error states

### ❌ NEVER Do These UI Things

1. **Expose Sensitive Data**
   - Display full API keys in any UI element
   - Log API keys to browser console
   - Store API keys in localStorage/sessionStorage
   - Send keys in URL parameters or query strings

2. **Poor Security UX**
   - Save invalid keys without warning
   - Skip validation feedback
   - Missing loading states for async operations
   - No visual confirmation of security actions

## shadcn/ui Component Standards

### Form Components
```typescript
// Always use shadcn/ui Form with react-hook-form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Use zod for validation schemas
const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required').refine(validateFormat, 'Invalid format'),
  description: z.string().optional(),
});
```

### Input Component Patterns
```typescript
// Password input with show/hide toggle
<div className="relative">
  <Input
    type={showApiKey ? "text" : "password"}
    placeholder="AIzaSyD..."
    className={fieldState.error ? "border-destructive" : ""}
  />
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className="absolute right-0 top-0 h-full px-3 py-2"
    onClick={() => setShowApiKey(!showApiKey)}
  >
    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </Button>
</div>
```

### Loading State Standards
```typescript
// Button loading states
<Button disabled={loadingState.saving || !form.formState.isValid}>
  {loadingState.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loadingState.saving ? 'Saving...' : 'Save API Key'}
</Button>

// Loading state management
interface LoadingState {
  saving: boolean;
  testing: boolean;
  deleting: boolean;
  loading: boolean;
}
```

### Alert Component Usage
```typescript
// Success alerts
<Alert>
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>API Key Connected</AlertTitle>
  <AlertDescription>Key ending in {keyPreview}</AlertDescription>
</Alert>

// Error alerts
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Connection Failed</AlertTitle>
  <AlertDescription>{errorMessage}</AlertDescription>
</Alert>
```

## TypeScript Requirements

### Branded Types
```typescript
// Use branded types for type safety
export type ApiKeyId = string & { readonly brand: unique symbol };
export type ApiService = 'youtube' | 'openai';

// Proper interface definitions
export interface ApiKeyInfo {
  id: ApiKeyId;
  service: ApiService;
  keyPreview: string; // Last 4 characters only
  isValid: boolean;
  createdAt: Date;
}
```

### Component Props Interface
```typescript
export interface ApiKeySetupProps {
  service: ApiService;
  onSave?: (key: string, description?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onTest?: (key: string) => Promise<boolean>;
  existingKey?: ApiKeyInfo;
  className?: string;
}
```

## Validation Standards

### Real-time Validation
```typescript
// Use onChange mode for immediate feedback
const form = useForm<FormData>({
  resolver: zodResolver(apiKeySchema),
  mode: 'onChange',
  defaultValues: { apiKey: '', description: '' },
});

// Service-specific validation
const validateApiKeyFormat = (service: ApiService, key: string): boolean => {
  switch (service) {
    case 'youtube':
      return key.startsWith('AIza') && key.length === 39;
    case 'openai':
      return key.startsWith('sk-') && key.length >= 51;
    default:
      return false;
  }
};
```

### Error Handling Patterns
```typescript
// Centralized error handling with toast
try {
  await apiOperation();
  toast({ title: "Success", description: "Operation completed." });
} catch (error) {
  toast({
    title: "Operation Failed",
    description: error instanceof Error ? error.message : 'Unknown error',
    variant: "destructive",
  });
}
```

## Accessibility Requirements

### ARIA Labels and Screen Readers
```typescript
// Proper ARIA labels
<Button>
  <Eye className="h-4 w-4" />
  <span className="sr-only">{showApiKey ? "Hide" : "Show"} API key</span>
</Button>

// Form field associations
<FormField
  control={form.control}
  name="apiKey"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>API Key</FormLabel>
      <FormControl>
        <Input {...field} aria-describedby={fieldState.error ? "error-message" : undefined} />
      </FormControl>
      <FormMessage id="error-message" />
    </FormItem>
  )}
/>
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Logical tab order through form fields
- Enter key submits forms
- Escape key closes modals/popovers

## Responsive Design

### Mobile-First Approach
```typescript
// Responsive button layouts
<div className="flex items-center gap-2 pt-2">
  <Button className="flex-1">Save API Key</Button>
  <Button variant="outline">Test</Button>
</div>

// Card responsiveness
<Card className="w-full max-w-2xl">
  <CardHeader>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      {/* Content adapts to screen size */}
    </div>
  </CardHeader>
</Card>
```

## Testing Guidelines

### Component Testing
```typescript
// Test validation states
expect(screen.getByRole('textbox', { name: /api key/i })).toHaveAttribute('type', 'password');

// Test loading states
expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

// Test error handling
expect(screen.getByText(/invalid api key format/i)).toBeInTheDocument();
```

### Security Testing
- ✓ API keys never appear in DOM as plain text
- ✓ Form resets after successful submission
- ✓ Validation prevents invalid key submission
- ✓ Error messages don't expose sensitive information

## Integration Requirements

### Toast Notifications
```typescript
// Consistent toast patterns
toast({
  title: "API Key Saved",
  description: "Your API key has been saved successfully.",
});

toast({
  title: "Test Failed", 
  description: "Please check your API key and try again.",
  variant: "destructive",
});
```

### State Management
- Use local component state for UI interactions
- Integrate with Zustand for global API key state
- Clear sensitive data from state after operations
- Handle loading states consistently across operations

## Future Enhancements

### Prepared Patterns
- Multi-step API key setup wizard
- Bulk API key operations
- API key usage analytics display
- Key rotation UI workflows
- Team sharing interfaces 
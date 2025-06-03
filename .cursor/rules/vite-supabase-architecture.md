# Vite + Supabase Architecture Rules

## Framework Architecture
This project uses **Vite + React + TypeScript + Supabase + Zustand + shadcn/ui** architecture.

### ❌ NEVER Use Next.js Patterns
- NO `pages/api/` directory structure
- NO Next.js API routes
- NO `getServerSideProps` or `getStaticProps`
- NO `next.config.js`
- NO Next.js specific imports or middleware

### ✅ ALWAYS Use Vite + Supabase Patterns

#### File Structure
```
src/
├── api/           # Supabase client-side API services
├── lib/           # Utilities and configurations
├── components/    # React components
├── pages/         # Route components (not Next.js pages)
├── store/         # Zustand store
└── types/         # TypeScript definitions
```

#### Backend Operations
- **Database**: Use Supabase client (`@supabase/supabase-js`)
- **Authentication**: Supabase Auth (not NextAuth)
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Edge Functions**: Supabase Edge Functions (if needed)

#### API Layer Pattern
```typescript
// ✅ Correct: src/api/categories.ts
import { supabase } from '../lib/supabase';
export class CategoriesApi {
  async getCategories() {
    return await supabase.from('categories').select('*');
  }
}

// ❌ Wrong: pages/api/categories.ts
export default function handler(req, res) { ... }
```

#### Environment Variables
- **Vite Prefix**: All client-side vars must start with `VITE_`
- **Supabase Vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **NO** server-side only variables (no secret keys in client)

#### Build and Deployment
- **Build Command**: `vite build` (not `next build`)
- **Config File**: `vite.config.ts` (not `next.config.js`)
- **Output Dir**: `dist/` (not `.next/`)
- **Deployment**: Vercel SPA configuration for Vite

#### Routing
- **Client-side Routing**: React Router (not Next.js router)
- **File-based Pages**: Optional, but not automatic like Next.js
- **Dynamic Routes**: Use React Router params

#### State Management
- **Global State**: Zustand store (`src/store/index.ts`)
- **Server State**: Supabase client queries
- **Local State**: React hooks
- **NO** server-side state management

#### Authentication Flow
```typescript
// ✅ Correct: Supabase Auth
import { supabase } from '../lib/supabase';
await supabase.auth.signInWithPassword({ email, password });

// ❌ Wrong: NextAuth
import { signIn } from 'next-auth/react';
```

#### Database Operations
```typescript
// ✅ Correct: Supabase client
const { data, error } = await supabase
  .from('categories')
  .select('*')
  .eq('user_id', userId);

// ❌ Wrong: API routes
const response = await fetch('/api/categories');
```

## Integration Guidelines

### Supabase Integration
1. **Client Setup**: Single instance in `src/lib/supabase.ts`
2. **Type Safety**: Use generated types from `src/types/supabase.ts`
3. **Authentication**: Session management with Supabase Auth
4. **RLS Policies**: Secure data access at database level
5. **Real-time**: Subscribe to changes using Supabase channels

### Component Architecture
1. **UI Components**: shadcn/ui components only
2. **Form Handling**: React Hook Form + Zod validation
3. **Styling**: Tailwind CSS with shadcn/ui design system
4. **Icons**: Lucide React icons
5. **Animations**: Framer Motion for complex animations

### Error Handling
1. **Client Errors**: Error boundaries and toast notifications
2. **API Errors**: Standardized error responses from Supabase
3. **Network Errors**: Retry logic and offline handling
4. **Validation Errors**: Form-level error display

### Performance Optimization
1. **Code Splitting**: Vite's automatic code splitting
2. **Bundle Analysis**: `vite-bundle-analyzer`
3. **Image Optimization**: Vite's asset processing
4. **Caching**: Supabase query caching and browser cache

## Common Mistakes to Avoid

1. **Framework Confusion**: Mixing Next.js and Vite patterns
2. **API Routes**: Creating server-side endpoints in client-only app
3. **Environment Variables**: Using non-VITE_ prefixed variables
4. **Build Configuration**: Next.js specific build settings
5. **Routing**: Server-side routing in client-side app
6. **Authentication**: Server-side auth in client-side context

## Task Management Rules

When creating or updating tasks:
1. **File Paths**: Always use `src/` structure for Vite
2. **Dependencies**: Reference Supabase, not Next.js APIs
3. **Integration Points**: Client-side services, not server endpoints
4. **Build Process**: Vite commands and configuration
5. **Deployment**: SPA deployment patterns

## Validation Checklist

Before implementing any task:
- [ ] Uses Vite + React architecture
- [ ] Integrates with Supabase for backend
- [ ] Follows `src/` directory structure
- [ ] Uses VITE_ prefixed environment variables
- [ ] Implements client-side routing
- [ ] Uses Supabase client for all backend operations
- [ ] Follows shadcn/ui component patterns
- [ ] Includes proper TypeScript typing 
# Database Schema and Setup

This directory contains all SQL files for the YouTube Filter project's Supabase database.

## Files

### `schema.sql`
Complete database schema including:
- Core tables (user_profiles, categories, videos, user_category_videos)
- Analytics tables (api_usage_logs, video_analysis_cache, user_search_history)
- Security tables (user_api_keys)
- Performance indexes
- Database functions and triggers

### `rls-policies.sql`
Row Level Security policies for:
- User data isolation
- Secure API key access
- Category and video permissions
- Analytics data protection

## Setup Instructions

1. **Enable Extensions** (if not already done):
   - Go to Database → Extensions in Supabase
   - Enable `uuid-ossp` and `pgcrypto`

2. **Execute Schema**:
   - Go to SQL Editor in Supabase
   - Copy and execute contents of `schema.sql`

3. **Apply Security Policies**:
   - Copy and execute contents of `rls-policies.sql`

4. **Set up Cron Job**:
   - Go to Database → Integrations → Enable `pg_cron`
   - Go to Database → Cron Jobs → Create new job:
     - Name: `cleanup_expired_cache`
     - Schedule: `0 2 * * *` (daily at 2 AM UTC)
     - Command: `SELECT public.cleanup_expired_cache();`

## Database Structure

```
user_profiles (extends auth.users)
├── categories (user's learning categories)
│   └── user_category_videos (many-to-many with videos)
│       └── videos (YouTube video metadata)
├── api_usage_logs (quota tracking)
├── video_analysis_cache (AI analysis cache)
├── user_search_history (search tracking)
└── user_api_keys (encrypted API keys)
```

## Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Encrypted API Keys**: YouTube/OpenAI keys stored with encryption
- **Audit Trail**: All API usage is logged
- **Data Isolation**: Complete separation between users
- **Automatic Cleanup**: Expired cache entries removed daily

## Performance Optimizations

- Comprehensive indexing strategy
- 7-day analysis cache with TTL
- Automatic video count updates via triggers
- Optimized queries for user-specific data 
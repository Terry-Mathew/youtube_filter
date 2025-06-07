# 🚀 YouTube Filter - Development Setup Guide

## Quick Start Checklist

### 1. Clone and Install
```bash
git clone <repository>
cd project
npm install
```

### 2. Environment Configuration (CRITICAL)
Create `.env.local` file in project root:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# YouTube API (Optional for basic testing)
VITE_YOUTUBE_API_KEY=your-youtube-api-key

# OpenAI API (Optional for AI features)
VITE_OPENAI_API_KEY=your-openai-api-key
```

### 3. Get Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings → API**
4. Copy **Project URL** and **anon public** key
5. Paste into your `.env.local` file

### 4. Start Development Server
```bash
npm run dev
```

### 5. Verify Setup
- ✅ You should see: `✅ Supabase Environment Variables Loaded`
- ❌ If you see: `🚨 Supabase not configured!` - check your `.env.local` file

## Troubleshooting

### Authentication Not Working?
1. **Check Environment Variables**
   - Ensure `.env.local` exists in project root
   - Verify Supabase URL and key are correct
   - Restart dev server after changes

2. **Check Supabase Project**
   - Confirm you're using the correct project
   - Verify authentication is enabled
   - Check RLS policies if using database features

3. **Clear Browser Storage**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

### Common Issues
- **"Missing environment variables"** → Create `.env.local` file
- **"Session undefined"** → Check Supabase URL and key
- **"User authenticated in dashboard but not in app"** → Environment variables pointing to wrong project

## Development Workflow

### Before Starting Development
1. ✅ Pull latest changes
2. ✅ Check environment variables are still valid
3. ✅ Run `npm install` for new dependencies
4. ✅ Start dev server and verify setup

### When Onboarding New Developers
1. Share this setup guide
2. Help them get Supabase credentials
3. Verify their setup works before they start coding
4. Add their email to Supabase project if needed

## Environment File Template

Copy this template to create your `.env.local`:

```bash
# ==============================================
# YouTube Filter - Environment Configuration
# ==============================================

# Supabase (Required for authentication & database)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# YouTube Data API v3 (Required for video search)
VITE_YOUTUBE_API_KEY=

# OpenAI API (Optional - for AI video analysis)
VITE_OPENAI_API_KEY=

# Development Settings
VITE_APP_ENV=development
VITE_DEBUG_MODE=true
```

## Security Notes

- ✅ `.env.local` is in `.gitignore` - never commit it
- ✅ Use anon/public keys for client-side (they're safe to expose)
- ✅ Never put private/service role keys in frontend
- ⚠️ Rotate keys if accidentally exposed

## Need Help?

1. Check this setup guide first
2. Verify environment variables are loaded
3. Test basic Supabase connection
4. Check browser console for errors
5. Ask for help with specific error messages 
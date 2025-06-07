import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables with helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SETUP ERROR: Missing Supabase Environment Variables!');
  console.error('');
  console.error('🔧 Required Setup:');
  console.error('1. Create .env.local file in your project root');
  console.error('2. Add the following variables:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=your-anon-key');
  console.error('3. Get these values from: Supabase Dashboard → Settings → API');
  console.error('4. Restart your development server');
  console.error('');
  console.error('Current values:');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl || 'undefined');
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey || 'undefined');
  
  throw new Error(
    '🚨 Supabase not configured! Check console for setup instructions.'
  );
}

// Success - log environment info (only in development)
if (import.meta.env.DEV) {
  console.log('✅ Supabase Environment Variables Loaded:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...',
    environment: import.meta.env.MODE
  });
}

/**
 * Supabase client instance for the application
 * 
 * This client is configured for browser environments and includes:
 * - Automatic JWT handling for authentication
 * - Session persistence in localStorage
 * - Type safety with generated database types
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store session in localStorage for persistence across browser sessions
    storage: window.localStorage,
    
    // Automatically refresh tokens when they expire
    autoRefreshToken: true,
    
    // Persist auth session across browser sessions
    persistSession: true,
    
    // Don't detect session in URL fragments (for security)
    detectSessionInUrl: false,
    
    // Use PKCE flow for enhanced security
    flowType: 'pkce',
  },
  
  global: {
    // Custom headers for all requests
    headers: {
      'X-Client-Info': 'learning-tube@0.1.0',
    },
  },
  
  // Real-time configuration
  realtime: {
    // Parameters for real-time connections
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Type-safe wrapper for Supabase client
 * Provides additional utility methods and error handling
 */
export class SupabaseService {
  private static instance: SupabaseService;
  
  private constructor(private client = supabase) {}
  
  /**
   * Get singleton instance of SupabaseService
   */
  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }
  
  /**
   * Get the underlying Supabase client
   */
  public getClient() {
    return this.client;
  }
  
  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }
  
  /**
   * Get current user session
   */
  public async getSession() {
    const { data: { session }, error } = await this.client.auth.getSession();
    return { session, error };
  }
  
  /**
   * Get current user
   */
  public async getUser() {
    const { data: { user }, error } = await this.client.auth.getUser();
    return { user, error };
  }
  
  /**
   * Sign out current user
   */
  public async signOut() {
    const { error } = await this.client.auth.signOut();
    return { error };
  }
  
  /**
   * Handle real-time subscription cleanup
   */
  public removeAllSubscriptions() {
    this.client.removeAllChannels();
  }
}

// Export singleton instance for easy access throughout the app
export const supabaseService = SupabaseService.getInstance();

// Export types for external use
export type { Database } from '../types/supabase';
export type SupabaseClient = typeof supabase; 
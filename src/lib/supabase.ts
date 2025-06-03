import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase'; // Will be generated in TASK_012

// Environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
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
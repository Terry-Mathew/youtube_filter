import { useEffect, useState, useCallback, createContext, useContext, ReactNode, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthApi } from '../api/auth';

// --- TYPE DEFINITIONS (Exported for use in context) ---
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

type AuthContextType = AuthState & AuthActions;

// --- CONTEXT ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthLogic();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// --- CONSUMER HOOK ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- CORE AUTHENTICATION LOGIC HOOK (Exported for use in provider) ---
function useAuthLogic(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const authApi = AuthApi.getInstance();

  const isAuthenticated = !!user && !!session;

  // Effect for initializing the session from Supabase
  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      if (isInitialized) return;
      
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsInitialized(true);
      }
    };
    initializeAuth();
    return () => { mounted = false; };
  }, [isInitialized]);

  // Effect for listening to Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
        setIsLoading(false);
      }
      if (_event === 'SIGNED_OUT') {
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- AUTH ACTIONS ---
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const result = await authApi.signIn({ email, password });
    setIsLoading(false);
    return result;
  }, [authApi]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    const result = await authApi.signUp({ email, password, fullName });
    setIsLoading(false);
    return result;
  }, [authApi]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    await authApi.signOut();
    setIsLoading(false);
    navigate('/', { replace: true });
  }, [authApi, navigate]);

  const resetPassword = useCallback(async (email: string) => {
    return authApi.resetPassword({ email });
  }, [authApi]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    isInitialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}

// Hook for checking if user has specific permissions or roles
export function useAuthPermissions() {
  const { user, isAuthenticated } = useAuthLogic();
  
  const hasRole = useCallback((role: string) => {
    if (!isAuthenticated || !user) return false;
    
    const userRoles = user.app_metadata?.roles || [];
    return userRoles.includes(role);
  }, [user, isAuthenticated]);
  
  const hasPermission = useCallback((permission: string) => {
    if (!isAuthenticated || !user) return false;
    
    const userPermissions = user.app_metadata?.permissions || [];
    return userPermissions.includes(permission);
  }, [user, isAuthenticated]);
  
  const isAdmin = useCallback(() => {
    return hasRole('admin') || hasRole('super_admin');
  }, [hasRole]);
  
  return {
    hasRole,
    hasPermission,
    isAdmin,
  };
}

// Hook for handling auth redirects
export function useAuthRedirect() {
  const { isAuthenticated, isInitialized } = useAuthLogic();
  const navigate = useNavigate();
  
  const redirectIfAuthenticated = useCallback((to: string = '/dashboard') => {
    if (isInitialized && isAuthenticated) {
      navigate(to, { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate]);
  
  const redirectIfNotAuthenticated = useCallback((to: string = '/auth/signin') => {
    if (isInitialized && !isAuthenticated) {
      navigate(to, { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate]);
  
  return {
    redirectIfAuthenticated,
    redirectIfNotAuthenticated,
  };
} 
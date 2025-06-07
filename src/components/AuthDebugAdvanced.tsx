import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthDebugAdvanced() {
  const auth = useAuth();
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [sessionError, setSessionError] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const checkSupabaseDirectly = async () => {
      try {
        console.log('🔍 Direct Supabase check...');
        
        // Get session directly from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 Direct session result:', { session, error });
        
        setSupabaseSession(session);
        setSessionError(error);
        
        // Get user directly from Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('🔍 Direct user result:', { user, userError });
        
        setAuthUser(user);
      } catch (err) {
        console.error('🔍 Direct check error:', err);
        setSessionError(err);
      }
    };

    checkSupabaseDirectly();
  }, []);

  const testSignIn = async () => {
    try {
      console.log('🔍 Testing sign in with demo credentials...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      console.log('🔍 Sign in result:', { data, error });
    } catch (err) {
      console.error('🔍 Sign in error:', err);
    }
  };

  const clearAuth = async () => {
    try {
      console.log('🔍 Clearing auth...');
      await supabase.auth.signOut();
      console.log('🔍 Auth cleared');
    } catch (err) {
      console.error('🔍 Clear auth error:', err);
    }
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>🔍 Advanced Auth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">useAuth Hook State</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify({
                user: auth.user ? {
                  id: auth.user.id,
                  email: auth.user.email,
                  email_confirmed_at: auth.user.email_confirmed_at
                } : null,
                session: auth.session ? {
                  access_token: auth.session.access_token ? 'exists' : null,
                  refresh_token: auth.session.refresh_token ? 'exists' : null,
                  expires_at: auth.session.expires_at,
                  user_id: auth.session.user?.id
                } : null,
                isLoading: auth.isLoading,
                isAuthenticated: auth.isAuthenticated,
                isInitialized: auth.isInitialized
              }, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Direct Supabase Session</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify({
                session: supabaseSession ? {
                  access_token: supabaseSession.access_token ? 'exists' : null,
                  refresh_token: supabaseSession.refresh_token ? 'exists' : null,
                  expires_at: supabaseSession.expires_at,
                  user: supabaseSession.user ? {
                    id: supabaseSession.user.id,
                    email: supabaseSession.user.email,
                    email_confirmed_at: supabaseSession.user.email_confirmed_at
                  } : null
                } : null,
                error: sessionError?.message || null,
                authUser: authUser ? {
                  id: authUser.id,
                  email: authUser.email,
                  email_confirmed_at: authUser.email_confirmed_at
                } : null
              }, null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="space-x-2">
          <Button onClick={testSignIn} variant="outline">
            Test Sign In
          </Button>
          <Button onClick={clearAuth} variant="outline">
            Clear Auth
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Expected behavior:</strong> If you're authenticated in Supabase dashboard, both the useAuth hook and direct Supabase calls should show a valid session and user.</p>
          <p><strong>Current issue:</strong> The session object exists but appears to be empty or invalid.</p>
        </div>
      </CardContent>
    </Card>
  );
} 
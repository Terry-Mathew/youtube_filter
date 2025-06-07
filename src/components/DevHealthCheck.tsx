import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export function DevHealthCheck() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    // Only show in development
    if (import.meta.env.DEV) {
      runHealthChecks();
    }
  }, []);

  const runHealthChecks = async () => {
    const results: HealthCheck[] = [];

    // Check environment variables
    const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    results.push({
      name: 'Environment Variables',
      status: hasSupabaseUrl && hasSupabaseKey ? 'pass' : 'fail',
      message: hasSupabaseUrl && hasSupabaseKey 
        ? 'Supabase environment variables loaded'
        : 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
    });

    // Check Supabase connection
    try {
      const { data, error } = await supabase.auth.getSession();
      results.push({
        name: 'Supabase Connection',
        status: error ? 'fail' : 'pass',
        message: error ? `Connection error: ${error.message}` : 'Connected to Supabase'
      });
    } catch (err) {
      results.push({
        name: 'Supabase Connection',
        status: 'fail',
        message: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }

    // Check authentication state
    results.push({
      name: 'Authentication State',
      status: auth.isInitialized ? (auth.isAuthenticated ? 'pass' : 'warn') : 'warn',
      message: auth.isInitialized 
        ? (auth.isAuthenticated ? `Authenticated as ${auth.user?.email}` : 'Not authenticated')
        : 'Authentication not initialized'
    });

    // Check for API keys
    const hasYouTubeKey = !!import.meta.env.VITE_YOUTUBE_API_KEY;
    const hasOpenAIKey = !!import.meta.env.VITE_OPENAI_API_KEY;
    
    results.push({
      name: 'API Keys',
      status: hasYouTubeKey ? 'pass' : 'warn',
      message: `YouTube: ${hasYouTubeKey ? '✓' : '✗'}, OpenAI: ${hasOpenAIKey ? '✓' : '✗'}`
    });

    setChecks(results);
    
    // Show if there are any failures
    const hasFailures = results.some(check => check.status === 'fail');
    setIsVisible(hasFailures);
  };

  if (!import.meta.env.DEV || !isVisible) {
    return null;
  }

  const getIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-700 bg-green-50';
      case 'fail': return 'text-red-700 bg-red-50';
      case 'warn': return 'text-yellow-700 bg-yellow-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-2 border-orange-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          🏥 Development Health Check
          <button 
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check, index) => (
          <div 
            key={index} 
            className={`p-2 rounded text-xs ${getStatusColor(check.status)}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {getIcon(check.status)}
              <span className="font-medium">{check.name}</span>
            </div>
            <div className="ml-6">{check.message}</div>
          </div>
        ))}
        
        <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
          This panel only shows in development when issues are detected.
        </div>
      </CardContent>
    </Card>
  );
} 
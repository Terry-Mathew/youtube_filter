import React from 'react';
import SearchBar from '../components/SearchBar';
import Hero from '../components/Hero';
import SearchResults from '../components/SearchResults';
import { useAppStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { useCategoriesStore } from '../store/categories';
import CategorySelector from '../components/CategorySelector';
import { motion } from 'framer-motion';
import { FolderOpen, Search, Lightbulb } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../lib/supabase';

// Temporary debug component to understand auth issue
const AuthDebugAdvanced: React.FC = () => {
  const auth = useAuth();
  const [supabaseSession, setSupabaseSession] = React.useState<any>(null);
  const [sessionError, setSessionError] = React.useState<any>(null);
  
  React.useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('🔍 AuthDebugAdvanced: Checking session directly...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 AuthDebugAdvanced: Direct session result:', { 
          session: session ? 'exists' : 'null', 
          error: error?.message,
          sessionData: session ? {
            access_token: session.access_token ? 'exists' : 'missing',
            user: session.user ? {
              id: session.user.id,
              email: session.user.email,
              email_confirmed_at: session.user.email_confirmed_at
            } : null,
            expires_at: session.expires_at
          } : null
        });
        setSupabaseSession(session);
        setSessionError(error);
      } catch (err) {
        console.error('🔍 AuthDebugAdvanced: Error checking session:', err);
        setSessionError(err);
      }
    };
    
    checkSession();
  }, []);

  return (
    <div className="border-2 border-yellow-400 bg-yellow-50 p-4 m-4 rounded">
      <h3 className="font-bold mb-2 text-yellow-800">🔍 Auth Debug (Temporary)</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div>
          <strong className="text-blue-800">useAuth Hook:</strong>
          <pre className="bg-white p-2 rounded mt-1 overflow-auto">
{JSON.stringify({
  hasUser: !!auth.user,
  userEmail: auth.user?.email || null,
  hasSession: !!auth.session,
  sessionExpiry: auth.session?.expires_at || null,
  isAuthenticated: auth.isAuthenticated,
  isLoading: auth.isLoading,
  isInitialized: auth.isInitialized
}, null, 2)}
          </pre>
        </div>
        <div>
          <strong className="text-green-800">Direct Supabase:</strong>
          <pre className="bg-white p-2 rounded mt-1 overflow-auto">
{JSON.stringify({
  hasSession: !!supabaseSession,
  sessionType: typeof supabaseSession,
  userEmail: supabaseSession?.user?.email || null,
  sessionExpiry: supabaseSession?.expires_at || null,
  hasError: !!sessionError,
  errorMessage: sessionError?.message || null
}, null, 2)}
          </pre>
        </div>
      </div>
      <p className="text-sm text-yellow-700 mt-2">
        <strong>Expected:</strong> Both should show authenticated user if logged in to Supabase dashboard.
      </p>
    </div>
  );
};

const AuthenticatedDashboard: React.FC = () => {
  const { videos, searchQuery } = useAppStore();
  const { categories, selectedCategory, isLoading } = useCategoriesStore();
  const hasSearched = searchQuery.trim().length > 0;

  if (hasSearched && videos.length > 0) {
    return (
      <div className="py-8">
        <SearchBar />
        <SearchResults />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white">
            <Lightbulb className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back to your learning dashboard
        </h1>
        <p className="text-gray-600 mb-6">
          Discover curated videos for your learning categories
        </p>
        <SearchBar />
      </motion.div>

      {/* Categories Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Your Categories</h2>
          <CategorySelector 
            variant="dropdown"
            showVideoCount={true}
            showCreateButton={true}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first learning category to get started with personalized content curation
              </p>
              <Button>
                <FolderOpen className="h-4 w-4 mr-2" />
                Create Your First Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      />
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                                         <CardDescription>
                       {category.tags?.slice(0, 3).join(', ')}
                       {(category.tags?.length || 0) > 3 && '...'}
                     </CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="flex items-center justify-between text-sm text-gray-600">
                       <span>{category.tags?.length || 0} tags</span>
                      <span>{category.videoCount || 0} videos</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

const Home: React.FC = () => {
  const { isAuthenticated, isLoading, user, session } = useAuth();
  
  // Debug logging
  console.log('Home Auth State:', { isAuthenticated, isLoading, user: !!user, session: !!session });
  
  // Quick debug to check session directly
  React.useEffect(() => {
    const debugSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔍 Home: Direct Supabase session check:', { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        error: error?.message,
        sessionKeys: session ? Object.keys(session) : null
      });
    };
    debugSession();
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        {isAuthenticated ? (
          <AuthenticatedDashboard />
        ) : (
          <>
            <Hero />
            <div className="relative -mt-10 z-10">
              <SearchBar />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
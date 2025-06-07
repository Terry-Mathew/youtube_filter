import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Settings from './pages/Settings';
import UserProfile from './components/UserProfile';
import { CategoryFormTest } from './components/CategoryFormTest';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth.tsx';
import { Toaster } from './components/ui/toaster';
import { DevHealthCheck } from './components/DevHealthCheck';

function App() {
  const { isLoading } = useAuth();

  // This is the "Loading Gate". It prevents any part of the app from rendering
  // until the initial authentication check is complete.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="container mx-auto py-8">
                  <UserProfile />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/test-category-form" element={<CategoryFormTest />} />
        </Routes>
      </main>
      <Toaster />
      <DevHealthCheck />
    </div>
  );
}

export default App;
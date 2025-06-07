import React from 'react';
import { useAuth } from '../hooks/useAuth';
// Auth store removed - using useAuth hook only

export default function AuthDebug() {
  const auth = useAuth();
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      
      <div>
        <strong>Auth State:</strong>
        <div>isAuthenticated: {String(auth.isAuthenticated)}</div>
        <div>isLoading: {String(auth.isLoading)}</div>
        <div>isInitialized: {String(auth.isInitialized)}</div>
        <div>user: {auth.user?.email || 'null'}</div>
        <div>session: {auth.session ? 'exists' : 'null'}</div>
      </div>
    </div>
  );
} 
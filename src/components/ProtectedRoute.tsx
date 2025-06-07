import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  requiredRole?: string;
  requiredPermission?: string;
  fallback?: React.ComponentType;
}

/**
 * Protected Route component that handles authentication and authorization
 * 
 * @param children - Components to render if user is authorized
 * @param requireAuth - Whether authentication is required (default: true)
 * @param redirectTo - Where to redirect if not authorized (default: '/auth/signin')
 * @param requiredRole - Specific role required to access the route
 * @param requiredPermission - Specific permission required to access the route
 * @param fallback - Component to render while loading or if unauthorized
 */
export default function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/auth/signin',
  requiredRole,
  requiredPermission,
  fallback: Fallback,
}: ProtectedRouteProps) {
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    hasRole,
    hasPermission,
  } = useAuth();

  // Show loading spinner while auth is initializing
  if (!isInitialized || isLoading) {
    if (Fallback) {
      return <Fallback />;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // If user is authenticated but we don't require auth (e.g., login page)
  if (!requireAuth && isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // Check role-based authorization
  if (isAuthenticated && requiredRole && !hasRole(requiredRole)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ 
          from: location,
          reason: `This page requires the '${requiredRole}' role.`
        }}
        replace
      />
    );
  }

  // Check permission-based authorization
  if (isAuthenticated && requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ 
          from: location,
          reason: `This page requires the '${requiredPermission}' permission.`
        }}
        replace
      />
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

/**
 * Higher-order component for protecting routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook for checking auth status in components
 */
export function useAuthGuard() {
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    hasRole,
    hasPermission,
  } = useAuth();

  const requireAuth = () => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }
  };

  const requireRole = (role: string) => {
    requireAuth();
    if (!hasRole(role)) {
      throw new Error(`Role '${role}' required`);
    }
  };

  const requirePermission = (permission: string) => {
    requireAuth();
    if (!hasPermission(permission)) {
      throw new Error(`Permission '${permission}' required`);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    hasRole,
    hasPermission,
    requireAuth,
    requireRole,
    requirePermission,
  };
}

/**
 * Component for displaying unauthorized access message
 */
export function UnauthorizedPage() {
  const location = useLocation();
  const reason = location.state?.reason || 'You do not have permission to access this page.';
  const from = location.state?.from;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.382 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-6">
          {reason}
        </p>
        
        <div className="space-y-3">
          {from && (
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go Back
            </button>
          )}
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 
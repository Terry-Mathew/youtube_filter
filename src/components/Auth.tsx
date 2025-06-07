import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoginForm from './ui/LoginForm';
import SignupForm from './ui/SignupForm';
import { AuthApi } from '../api/auth';
// Auth store removed - using useAuth hook only

type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-password' | 'email-confirmation';

interface AuthProps {
  defaultMode?: AuthMode;
  redirectTo?: string;
  onSuccess?: () => void;
}

export default function Auth({ defaultMode = 'signin', redirectTo = '/dashboard', onSuccess }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const authApi = AuthApi.getInstance();
  // Auth state is now managed by useAuth hook

  // Handle URL parameters and auth state
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const type = urlParams.get('type');
    const emailParam = urlParams.get('email');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // Handle email confirmation
    if (token && type === 'signup') {
      setMode('email-confirmation');
      handleEmailConfirmation(token, type);
    }
    
    // Handle password reset
    if (token && type === 'recovery') {
      setMode('reset-password');
    }
    
    // Handle auth state changes
    const checkAuthState = async () => {
      const response = await authApi.getSession();
      if (response.success && response.data?.session) {
        handleAuthSuccess();
      }
    };
    
    checkAuthState();
  }, [location]);

  const handleEmailConfirmation = async (token: string, type: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Supabase handles email confirmation automatically through the URL
      // We just need to check if the user is now authenticated
      const response = await authApi.getSession();
      
      if (response.success && response.data?.session) {
        setMessage('Email confirmed successfully! Welcome to Learning Tube.');
        setTimeout(() => {
          handleAuthSuccess();
        }, 2000);
      } else {
        setError('Failed to confirm email. Please try again or contact support.');
      }
    } catch (err) {
      setError('An error occurred during email confirmation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      const from = location.state?.from?.pathname || redirectTo;
      navigate(from, { replace: true });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authApi.resetPassword({ email });
      
      if (result.success) {
        setMode('email-confirmation');
        setMessage('Password reset instructions have been sent to your email.');
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred while sending reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Trigger a new sign up with the same email to resend confirmation
      const result = await authApi.signUp({ email, password: 'dummy' });
      
      if (result.success || result.error?.includes('already registered')) {
        setMessage('Confirmation email has been resent. Please check your inbox.');
      } else {
        setError(result.error || 'Failed to resend confirmation email');
      }
    } catch (err) {
      setError('An error occurred while resending confirmation email');
    } finally {
      setIsLoading(false);
    }
  };

  // Render different modes
  const renderContent = () => {
    switch (mode) {
      case 'signin':
        return (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={() => setMode('signup')}
            onForgotPassword={() => setMode('forgot-password')}
            redirectTo={redirectTo}
          />
        );
        
      case 'signup':
        return (
          <SignupForm
            onSuccess={() => setMode('email-confirmation')}
            onSwitchToSignIn={() => setMode('signin')}
            redirectTo={redirectTo}
          />
        );
        
      case 'forgot-password':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Reset Password
              </CardTitle>
              <CardDescription className="text-center">
                Enter your email address to receive reset instructions
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
                
                <Button 
                  onClick={handleForgotPassword} 
                  className="w-full"
                  disabled={isLoading || !email}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setMode('signin')}
                  className="w-full"
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        
      case 'email-confirmation':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4">
                <Mail className="h-12 w-12 text-blue-500" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Check Your Email
              </CardTitle>
              <CardDescription>
                {message || 'We sent a confirmation link to your email address.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {message && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or
                </p>
                
                <Button
                  variant="outline"
                  onClick={handleResendConfirmation}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    'Resend Confirmation Email'
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setMode('signin')}
                  className="w-full"
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderContent()}
      </div>
    </div>
  );
} 
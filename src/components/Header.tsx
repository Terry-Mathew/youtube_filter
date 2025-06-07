import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Search, Settings, User, LogOut, UserCircle, LogIn } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAppStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { AuthApi } from '../api/auth';
import CategorySelector from './CategorySelector';
import Auth from './Auth';

const Header: React.FC = () => {
  const { searchQuery, setSearchQuery } = useAppStore();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  const authApi = AuthApi.getInstance();

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const openAuthDialog = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthDialog(true);
  };

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
                <Lightbulb size={20} />
              </div>
              <span className="text-lg font-bold text-gray-900">LearningTube</span>
            </Link>
            
            {/* Category Selector - hidden on small screens */}
            <div className="hidden md:block">
              <CategorySelector 
                variant="header"
                showVideoCount={true}
                showCreateButton={true}
              />
            </div>
          </div>
          
          <div className="hidden sm:block flex-1 mx-8">
            <div className="relative max-w-xl mx-auto">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full rounded-full border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                placeholder="Enter your learning topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Category Selector for mobile - compact version */}
            <div className="block md:hidden">
              <CategorySelector 
                variant="header"
                showVideoCount={false}
                showCreateButton={false}
                className="scale-90"
              />
            </div>
            
            {/* Authentication UI */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full">
                    {user?.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-6 w-6" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => openAuthDialog('signin')}
                  className="hidden sm:inline-flex"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
                <Button 
                  size="sm"
                  onClick={() => openAuthDialog('signup')}
                >
                  Sign Up
                </Button>
                
                {/* Mobile sign in button */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => openAuthDialog('signin')}
                  className="sm:hidden"
                >
                  <LogIn className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile search bar */}
        <div className="block sm:hidden pb-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-full border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 text-sm"
              placeholder="Enter your learning topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Authentication Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <Auth 
            defaultMode={authMode}
            onSuccess={() => setShowAuthDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
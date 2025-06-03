import React from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Search, Settings } from 'lucide-react';
import { useAppStore } from '../store';
import CategorySelector from './CategorySelector';

const Header: React.FC = () => {
  const { searchQuery, setSearchQuery } = useAppStore();

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
            
            <Link 
              to="/settings" 
              className="inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Settings</span>
            </Link>
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
    </header>
  );
};

export default Header;
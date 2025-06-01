import React, { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';
import { mockSearch } from '../utils/mockApi';

const SearchBar: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    isSearching, 
    setIsSearching, 
    setVideos,
    addToSearchHistory
  } = useAppStore();
  
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      // In a real app, this would call your backend API that handles YouTube API calls
      // and AI processing. For now, we'll use mock data.
      const results = await mockSearch(searchQuery);
      
      setVideos(results);
      
      // Add search to history
      addToSearchHistory({
        query: searchQuery,
        resultCount: results.length,
      });
    } catch (error) {
      console.error('Search failed:', error);
      // Handle error (would show error message in a real app)
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setExpanded(false);
  };

  return (
    <div className={cn(
      "mx-auto w-full max-w-2xl transition-all duration-300 ease-in-out",
      expanded ? "scale-105" : "scale-100"
    )}>
      <form onSubmit={handleSubmit} className="relative">
        <motion.div 
          className="relative"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className={cn(
              "h-5 w-5 transition-colors",
              expanded ? "text-primary-600" : "text-gray-400"
            )} />
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setExpanded(true)}
            onBlur={() => setExpanded(false)}
            placeholder="What do you want to learn today?"
            className={cn(
              "block w-full rounded-full border-0 py-3 pl-12 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset transition-all duration-300",
              expanded ? "focus:ring-primary-600 ring-primary-300" : "focus:ring-gray-400"
            )}
          />
          
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-14 flex items-center pr-3"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" aria-hidden="true" />
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className={cn(
              "absolute inset-y-0 right-0 flex items-center pr-4",
              !searchQuery.trim() && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSearching ? (
              <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
            ) : (
              <div className="rounded-full bg-primary-600 p-1 text-white hover:bg-primary-700 transition-colors">
                <Search className="h-4 w-4" />
              </div>
            )}
          </button>
        </motion.div>
      </form>
      
      <div className="mt-2 text-center text-sm text-gray-500">
        <p>Try: "machine learning basics", "javascript for beginners", "how to cook pasta"</p>
      </div>
    </div>
  );
};

export default SearchBar;
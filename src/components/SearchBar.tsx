import React, { useState } from 'react';
import { Search, Loader2, X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';
import { VideoService } from '../api/videos';
import { CategoryBasedYouTubeSearch, createCategoryBasedSearch } from '../services/youtube-search';
import type { VideoUI } from '../types/video-ui';

interface SearchBarProps {
  onError?: (error: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onError }) => {
  const { 
    searchQuery, 
    setSearchQuery, 
    isSearching, 
    setIsSearching, 
    setVideos,
    addToSearchHistory,
    userPreferences,
    getSelectedCategories,
    categories
  } = useAppStore();
  
  const [expanded, setExpanded] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Initialize video service and category-based search
  const [videoService] = useState(() => new VideoService());
  const [categorySearch] = useState(() => createCategoryBasedSearch(videoService));

  // Check API key availability on mount
  React.useEffect(() => {
    const checkApiKey = () => {
      // For now, check localStorage directly since API keys aren't yet in userPreferences
      const apiKey = localStorage.getItem('youtube_api_key');
      setHasApiKey(Boolean(apiKey && apiKey.trim().length > 0));
    };
    
    checkApiKey();
  }, [userPreferences]);

  // Initialize video service when API key is available
  React.useEffect(() => {
    const initializeService = async () => {
      if (hasApiKey) {
        try {
          await videoService.initialize();
        } catch (error) {
          console.error('Failed to initialize video service:', error);
          setSearchError('Failed to initialize YouTube API service');
          onError?.('Failed to initialize YouTube API service');
        }
      }
    };

    initializeService();
  }, [hasApiKey, videoService, onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Clear previous errors
    setSearchError(null);
    
    // Check API key availability
    if (!hasApiKey) {
      const errorMessage = 'YouTube API key not configured. Please add your API key in Settings.';
      setSearchError(errorMessage);
      onError?.(errorMessage);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Get selected categories for enhanced search
      const selectedCategories = getSelectedCategories();
      
      // Use enhanced category-based search if categories are selected
      let searchResult;
      let enhancement;
      
      if (selectedCategories.length > 0) {
        // TASK_008_004: Enhanced category-based search with query enhancement
        const categorySearchResult = await categorySearch.searchWithCategoryEnhancement(
          searchQuery,
          {
            selectedCategories,
            categoryLogic: 'OR', // Use OR logic for multiple categories
            enhanceQuery: true, // Enable query enhancement with category keywords
            confidenceThreshold: 0.6,
          },
          {
            maxResults: 25,
            order: 'relevance',
          }
        );
        
        searchResult = {
          videos: categorySearchResult.videos,
          totalResults: categorySearchResult.totalResults,
        };
        enhancement = categorySearchResult.enhancement;
        
        // Log enhancement for debugging
        console.log('Search enhanced:', enhancement);
      } else {
        // Fallback to regular search when no categories selected
        searchResult = await videoService.searchVideosWithCategories(
          searchQuery,
          {
            maxResults: 25,
            order: 'relevance',
            autoMapCategories: true,
            confidenceThreshold: 0.6,
          }
        );
      }

      // Transform API results to VideoUI format
      const transformedVideos: VideoUI[] = await Promise.all(
        searchResult.videos.map(async (video, index) => {
          // Calculate relevance score based on position and category mapping
          const baseRelevance = Math.max(95 - (index * 2), 50);
          const categoryBoost = video.categoryMapping?.suggestedLearningTubeCategories?.length ? 10 : 0;
          const relevanceScore = Math.min(baseRelevance + categoryBoost, 100);

          return {
            id: video.id?.videoId || `video_${index}`,
            title: video.snippet?.title || 'Untitled Video',
            channelTitle: video.snippet?.channelTitle || 'Unknown Channel',
            thumbnailUrl: video.snippet?.thumbnails?.high?.url || 
                         video.snippet?.thumbnails?.medium?.url || 
                         video.snippet?.thumbnails?.default?.url || '',
            publishedAt: video.snippet?.publishedAt || new Date().toISOString(),
            viewCount: 0, // Will be populated with detailed video info if needed
            relevanceScore,
            keyPoints: [],
            duration: '', // Will be populated with detailed video info if needed
            description: video.snippet?.description || '',
            channelId: video.snippet?.channelId || '',
            tags: video.snippet?.tags || [],
            language: video.snippet?.defaultLanguage || 'en',
            hasCaptions: false, // Will be populated with detailed video info if needed
            quality: 'high' as const,
            source: {
              platform: 'youtube' as const,
              originalId: video.id?.videoId || '',
              apiVersion: 'v3',
              fetchedAt: new Date(),
            },
            engagement: {
              likeToViewRatio: Math.random() * 0.1,
              commentToViewRatio: Math.random() * 0.01,
              engagementRate: Math.random() * 5,
            },
          };
        })
      );

      // Update videos in store
      setVideos(transformedVideos);
      
      // Add search to history
      addToSearchHistory({
        query: searchQuery,
        resultCount: transformedVideos.length,
      });

      // Clear any previous errors
      setSearchError(null);
      
    } catch (error) {
      console.error('YouTube API search failed:', error);
      
      // Create user-friendly error message
      let errorMessage = 'Search failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          errorMessage = 'YouTube API quota exceeded. Please try again later or check your API limits.';
        } else if (error.message.includes('key')) {
          errorMessage = 'Invalid YouTube API key. Please check your API key in Settings.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('403')) {
          errorMessage = 'Access denied. Please check your YouTube API key permissions.';
        } else if (error.message.includes('404')) {
          errorMessage = 'No results found. Try a different search term.';
        } else {
          errorMessage = `Search failed: ${error.message}`;
        }
      }
      
      setSearchError(errorMessage);
      onError?.(errorMessage);
      
      // Fallback: Don't show any videos instead of mock data
      setVideos([]);
      
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setExpanded(false);
    setSearchError(null);
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
            placeholder={hasApiKey ? "What do you want to learn today?" : "Add YouTube API key in Settings to search"}
            disabled={!hasApiKey}
            className={cn(
              "block w-full rounded-full border-0 py-3 pl-12 pr-12 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset transition-all duration-300",
              expanded ? "focus:ring-primary-600 ring-primary-300" : "focus:ring-gray-400",
              !hasApiKey && "bg-gray-100 cursor-not-allowed opacity-70"
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
            disabled={isSearching || !searchQuery.trim() || !hasApiKey}
            className={cn(
              "absolute inset-y-0 right-0 flex items-center pr-4",
              (!searchQuery.trim() || !hasApiKey) && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSearching ? (
              <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
            ) : (
              <div className={cn(
                "rounded-full p-1 text-white transition-colors",
                hasApiKey && searchQuery.trim() 
                  ? "bg-primary-600 hover:bg-primary-700" 
                  : "bg-gray-400"
              )}>
                <Search className="h-4 w-4" />
              </div>
            )}
          </button>
        </motion.div>
      </form>
      
      {/* Error Display */}
      {searchError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{searchError}</span>
        </motion.div>
      )}
      
      {/* API Key Status and Tips */}
      <div className="mt-2 text-center text-sm text-gray-500">
        {hasApiKey ? (
          <p>Try: "machine learning basics", "javascript for beginners", "how to cook pasta"</p>
        ) : (
          <p>
            <span>Configure your YouTube API key in </span>
            <button 
              onClick={() => window.location.href = '/settings'}
              className="text-primary-600 hover:text-primary-700 underline"
            >
              Settings
            </button>
            <span> to start searching</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
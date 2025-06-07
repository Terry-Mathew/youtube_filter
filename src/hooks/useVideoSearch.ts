import { useState, useEffect, useCallback } from 'react';
import { YouTubeApiClient } from '@/lib/youtube-api';
import { useAppStore } from '@/store';
import { useCategoriesStore } from '@/store/categories';
import { transformYouTubeVideoToUI } from '@/lib/video-ui-transformers';
import type { VideoUI } from '@/types/video-ui';
import type { SearchOptions, PaginatedSearchResponse } from '@/types/youtube';
import { useToast } from '@/hooks/use-toast';

interface UseVideoSearchResult {
  videos: VideoUI[];
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalResults: number;
  searchQuery: string;
  searchVideos: (query: string, options?: SearchOptions) => Promise<void>;
  loadNextPage: () => Promise<void>;
  loadPrevPage: () => Promise<void>;
  clearResults: () => void;
  refetchCurrentSearch: () => Promise<void>;
}

export function useVideoSearch(): UseVideoSearchResult {
  const [videos, setVideos] = useState<VideoUI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<{
    query: string;
    options?: SearchOptions;
    currentResponse?: PaginatedSearchResponse;
  }>({
    query: '',
  });

  const { toast } = useToast();
  const { selectedCategory } = useCategoriesStore();
  
  // Initialize YouTube API client
  const youtubeClient = new YouTubeApiClient();

  const searchVideos = useCallback(async (query: string, options?: SearchOptions) => {
    if (!query.trim()) {
      setVideos([]);
      setSearchState({ query: '' });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Enhance search query with category keywords if available
      let enhancedQuery = query;
      if (selectedCategory && selectedCategory.keywords?.length > 0) {
        const categoryKeywords = selectedCategory.keywords.join(' ');
        enhancedQuery = `${query} ${categoryKeywords}`;
      }

      // Set default options
      const searchOptions: SearchOptions = {
        maxResults: 25,
        type: 'video',
        order: 'relevance',
        videoDuration: 'any',
        ...options,
      };

      const response = await youtubeClient.searchVideos(enhancedQuery, searchOptions);
      
      // Transform YouTube videos to VideoUI format
      const transformedVideos = response.videos.map(video => 
        transformYouTubeVideoToUI(video)
      );

      setVideos(transformedVideos);
      setSearchState({
        query,
        options: searchOptions,
        currentResponse: response,
      });

      // Show success toast for new searches
      if (transformedVideos.length > 0) {
        toast({
          title: "Search completed",
          description: `Found ${response.totalResults.toLocaleString()} videos`,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search videos';
      setError(errorMessage);
      setVideos([]);
      
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, toast]);

  const loadNextPage = useCallback(async () => {
    if (!searchState.currentResponse?.nextPageToken || !searchState.query) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPageOptions = {
        ...searchState.options,
        pageToken: searchState.currentResponse.nextPageToken,
      };

      const response = await youtubeClient.searchVideos(searchState.query, nextPageOptions);
      const transformedVideos = response.videos.map(video => 
        transformYouTubeVideoToUI(video)
      );

      setVideos(transformedVideos);
      setSearchState(prev => ({
        ...prev,
        currentResponse: response,
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load next page';
      setError(errorMessage);
      
      toast({
        title: "Failed to load next page",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchState, toast]);

  const loadPrevPage = useCallback(async () => {
    if (!searchState.currentResponse?.prevPageToken || !searchState.query) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const prevPageOptions = {
        ...searchState.options,
        pageToken: searchState.currentResponse.prevPageToken,
      };

      const response = await youtubeClient.searchVideos(searchState.query, prevPageOptions);
      const transformedVideos = response.videos.map(video => 
        transformYouTubeVideoToUI(video)
      );

      setVideos(transformedVideos);
      setSearchState(prev => ({
        ...prev,
        currentResponse: response,
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load previous page';
      setError(errorMessage);
      
      toast({
        title: "Failed to load previous page",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchState, toast]);

  const refetchCurrentSearch = useCallback(async () => {
    if (searchState.query) {
      await searchVideos(searchState.query, searchState.options);
    }
  }, [searchState.query, searchState.options, searchVideos]);

  const clearResults = useCallback(() => {
    setVideos([]);
    setSearchState({ query: '' });
    setError(null);
  }, []);

  // Auto-search when category changes if there's an existing query
  useEffect(() => {
    if (searchState.query && selectedCategory) {
      refetchCurrentSearch();
    }
  }, [selectedCategory?.id]); // Only trigger on category ID change

  return {
    videos,
    isLoading,
    error,
    hasNextPage: Boolean(searchState.currentResponse?.nextPageToken),
    hasPrevPage: Boolean(searchState.currentResponse?.prevPageToken),
    currentPage: searchState.currentResponse?.currentPage || 1,
    totalResults: searchState.currentResponse?.totalResults || 0,
    searchQuery: searchState.query,
    searchVideos,
    loadNextPage,
    loadPrevPage,
    clearResults,
    refetchCurrentSearch,
  };
} 
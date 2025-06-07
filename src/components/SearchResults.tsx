import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, AlertCircle, Filter, SortDesc, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import VideoCard from './VideoCard';
import FilterPanel from './FilterPanel';
import { useAppStore } from '../store';
import { useVideoSearch } from '../hooks/useVideoSearch';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../utils/cn';

// Types for enhanced filtering
import type { 
  VideoFilters, 
  VideoSort, 
  FilterStats,
  FilterResult 
} from '../types/video-filters';
import { VideoFilterUtils } from '../types/video-filters';
import type { VideoUI } from '../types/video-ui';

// Import the video services
import { VideoService } from '../api/videos';
import { VideoFilterService } from '../lib/video-filter-service';
import type { CategoryFilteringOptions } from '../types/youtube';

const SearchResults: React.FC = () => {
  const { 
    videos, 
    isSearching, 
    searchQuery,
    getSelectedCategories,
    categories,
    userPreferences 
  } = useAppStore();
  
  // YouTube API integration
  const {
    videos: youtubeVideos,
    isLoading: isYouTubeSearching,
    error: youtubeError,
    hasNextPage,
    hasPrevPage,
    currentPage,
    totalResults,
    searchVideos: searchYouTubeVideos,
    loadNextPage,
    loadPrevPage,
    clearResults: clearYouTubeResults,
  } = useVideoSearch();
  
  // Filter and sort state
  const [filters, setFilters] = useState<VideoFilters>({});
  const [sort, setSort] = useState<VideoSort>({ field: 'relevance', order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  
  // Integration state
  const [filteredVideos, setFilteredVideos] = useState<VideoUI[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [lastFilterResult, setLastFilterResult] = useState<FilterResult | null>(null);
  
  // Video service instance
  const [videoService] = useState(() => new VideoService());
  
  // Initialize video service
  useEffect(() => {
    const initService = async () => {
      try {
        await videoService.initialize();
      } catch (error) {
        console.error('Failed to initialize video service:', error);
        setFilterError('Failed to initialize video filtering service');
      }
    };
    
    if (userPreferences?.youtubeApiKey) {
      initService();
    }
  }, [videoService, userPreferences?.youtubeApiKey]);

  // Apply filtering when filters, sort, or videos change
  useEffect(() => {
    applyFiltersWithAPI();
  }, [filters, sort, videos, searchQuery]);

  // Advanced filtering with YouTube API integration
  const applyFiltersWithAPI = useCallback(async () => {
    if (!searchQuery && videos.length === 0) {
      setFilteredVideos([]);
      return;
    }

    setIsFiltering(true);
    setFilterError(null);
    
    try {
      const startTime = Date.now();
      
      // If we have a search query and YouTube API is available, use API filtering
      if (searchQuery && userPreferences?.youtubeApiKey) {
        await applyAPIBasedFiltering();
      } else {
        // Fall back to local filtering for existing videos
        await applyLocalFiltering();
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`Filtering completed in ${processingTime}ms`);
      
    } catch (error) {
      console.error('Filtering error:', error);
      setFilterError(error instanceof Error ? error.message : 'Filtering failed');
      // Fall back to local filtering on API error
      await applyLocalFiltering();
    } finally {
      setIsFiltering(false);
    }
  }, [searchQuery, videos, filters, sort, userPreferences?.youtubeApiKey, videoService]);

  // API-based filtering using VideoService
  const applyAPIBasedFiltering = useCallback(async () => {
    const selectedCategories = getSelectedCategories();
    
    // Convert our filters to YouTube API filters
    const categoryFilteringOptions: CategoryFilteringOptions = {
      maxResults: 50,
      order: sort.field === 'publishedAt' ? 'date' : 
             sort.field === 'viewCount' ? 'viewCount' : 'relevance',
      autoMapCategories: true,
      confidenceThreshold: 0.6,
      categoryFilters: {
        learningTubeCategories: selectedCategories.map(c => c.id),
        duration: filters.duration ? {
          min: filters.duration.range?.min,
          max: filters.duration.range?.max,
          youtubeDuration: filters.duration.preset === 'short' ? 'short' :
                          filters.duration.preset === 'medium' ? 'medium' :
                          filters.duration.preset === 'long' ? 'long' : 'any'
        } : undefined,
        uploadDate: filters.publishedDate ? {
          after: filters.publishedDate.range?.start,
          before: filters.publishedDate.range?.end,
          period: filters.publishedDate.preset === 'today' ? 'today' :
                  filters.publishedDate.preset === 'week' ? 'week' :
                  filters.publishedDate.preset === 'month' ? 'month' :
                  filters.publishedDate.preset === 'year' ? 'year' : undefined
        } : undefined,
        quality: {
          definition: filters.quality?.includes('high') ? 'high' : 'any',
          caption: filters.hasCaptions ? 'closedCaption' : 'any',
        },
        engagement: {
          minViews: filters.viewCount?.min,
          engagementRate: filters.minEngagementRate,
        },
        safeSearch: 'moderate',
        relevanceLanguage: filters.languages?.[0] || 'en',
      }
    };

    // Search videos with category-based filtering
    const searchResult = await videoService.searchVideosWithCategories(
      searchQuery || '', 
      categoryFilteringOptions
    );

    // Convert YouTube videos to VideoUI format
    const convertedVideos: VideoUI[] = searchResult.videos.map(video => ({
      id: video.id?.videoId || '',
      youtube_id: video.id?.videoId || '',
      title: video.snippet?.title || '',
      channelTitle: video.snippet?.channelTitle || '',
      channel_id: video.snippet?.channelId || '',
      thumbnailUrl: video.snippet?.thumbnails?.high?.url || 
                   video.snippet?.thumbnails?.medium?.url || '',
      publishedAt: video.snippet?.publishedAt || new Date().toISOString(),
      description: video.snippet?.description || '',
      viewCount: 0, // Would need detailed video info for this
      duration: '', // Would need detailed video info for this
      language: video.snippet?.defaultLanguage || 'en',
      relevanceScore: 85, // Default high relevance for API results
      keyPoints: [],
      quality: 'high' as const,
      // Add category mapping info if available
      categories: video.categoryMapping?.suggestedLearningTubeCategories?.map(c => c.categoryId) || [],
      tags: video.snippet?.tags || [],
      hasCaptions: false, // Would need detailed video info
    }));

    // Apply additional local filtering for criteria not supported by API
    let finalVideos = convertedVideos;
    
    if (filters.minRelevanceScore !== undefined) {
      finalVideos = finalVideos.filter(v => v.relevanceScore >= (filters.minRelevanceScore || 0));
    }
    
    if (filters.tags?.length) {
      finalVideos = finalVideos.filter(video => 
        video.tags && filters.tags!.some(tag => 
          video.tags!.some(videoTag => 
            videoTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // Apply sorting
    finalVideos.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'publishedAt':
          comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = 0;
      }
      
      return sort.order === 'desc' ? -comparison : comparison;
    });

    setFilteredVideos(finalVideos);
    
    // Create filter result for statistics
    const filterResult: FilterResult = {
      videos: finalVideos,
      totalCount: searchResult.totalResults,
      appliedFilters: filters,
      sort: sort,
      processingTime: 0 // Will be set by parent function
    };
    
    setLastFilterResult(filterResult);
  }, [searchQuery, filters, sort, getSelectedCategories, videoService, userPreferences]);

  // Local filtering fallback
  const applyLocalFiltering = useCallback(async () => {
    let filtered = [...videos];

    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query) ||
        video.channelTitle.toLowerCase().includes(query)
      );
    }

    if (filters.duration) {
      const range = VideoFilterUtils.getDurationRange(filters.duration.preset) || filters.duration.range;
      if (range) {
        filtered = filtered.filter(video => {
          if (!video.duration) return false;
          const durationInSeconds = parseDuration(video.duration);
          const min = range.min || 0;
          const max = range.max || Infinity;
          return durationInSeconds >= min && durationInSeconds <= max;
        });
      }
    }

    if (filters.publishedDate) {
      const range = VideoFilterUtils.getDateRange(filters.publishedDate.preset) || filters.publishedDate.range;
      if (range) {
        filtered = filtered.filter(video => {
          const publishedAt = new Date(video.publishedAt);
          const start = range.start || new Date(0);
          const end = range.end || new Date();
          return publishedAt >= start && publishedAt <= end;
        });
      }
    }

    if (filters.viewCount) {
      filtered = filtered.filter(video => {
        const min = filters.viewCount?.min || 0;
        const max = filters.viewCount?.max || Infinity;
        return video.viewCount >= min && video.viewCount <= max;
      });
    }

    if (filters.quality?.length) {
      filtered = filtered.filter(video => 
        video.quality && filters.quality!.includes(video.quality)
      );
    }

    if (filters.hasCaptions !== undefined) {
      filtered = filtered.filter(video => 
        Boolean(video.hasCaptions) === filters.hasCaptions
      );
    }

    if (filters.minRelevanceScore !== undefined) {
      filtered = filtered.filter(video => 
        video.relevanceScore >= (filters.minRelevanceScore || 0)
      );
    }

    if (filters.minEngagementRate !== undefined && filters.minEngagementRate > 0) {
      filtered = filtered.filter(video => 
        video.engagement && video.engagement.engagementRate >= (filters.minEngagementRate || 0)
      );
    }

    if (filters.languages?.length) {
      filtered = filtered.filter(video => 
        video.language && filters.languages!.includes(video.language)
      );
    }

    if (filters.tags?.length) {
      filtered = filtered.filter(video => 
        video.tags && filters.tags!.some(tag => 
          video.tags!.some(videoTag => 
            videoTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'publishedAt':
          comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          break;
        case 'viewCount':
          comparison = a.viewCount - b.viewCount;
          break;
        case 'duration':
          comparison = parseDuration(a.duration) - parseDuration(b.duration);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'quality':
          const qualityOrder = { excellent: 4, high: 3, medium: 2, low: 1 };
          comparison = (qualityOrder[a.quality || 'medium'] || 2) - (qualityOrder[b.quality || 'medium'] || 2);
          break;
        case 'engagement':
          const aEngagement = a.engagement?.engagementRate || 0;
          const bEngagement = b.engagement?.engagementRate || 0;
          comparison = aEngagement - bEngagement;
          break;
        default:
          comparison = 0;
      }
      
      return sort.order === 'desc' ? -comparison : comparison;
    });

    setFilteredVideos(filtered);
    
    // Create filter result for statistics
    const filterResult: FilterResult = {
      videos: filtered,
      totalCount: filtered.length,
      appliedFilters: filters,
      sort: sort,
      processingTime: 0
    };
    
    setLastFilterResult(filterResult);
  }, [videos, filters, sort]);

  // Calculate filter statistics
  const filterStats = useMemo((): FilterStats => {
    const allVideos = videos.length > 0 ? videos : filteredVideos;
    
    return {
      totalVideos: allVideos.length,
      filteredVideos: filteredVideos.length,
      averageRelevanceScore: filteredVideos.length > 0 
        ? filteredVideos.reduce((sum, v) => sum + v.relevanceScore, 0) / filteredVideos.length 
        : 0,
      durationDistribution: {
        any: allVideos.length,
        short: allVideos.filter(v => v.duration && parseDuration(v.duration) < 240).length,
        medium: allVideos.filter(v => v.duration && parseDuration(v.duration) >= 240 && parseDuration(v.duration) < 1200).length,
        long: allVideos.filter(v => v.duration && parseDuration(v.duration) >= 1200).length,
        custom: 0,
      },
      qualityDistribution: {
        excellent: allVideos.filter(v => v.quality === 'excellent').length,
        high: allVideos.filter(v => v.quality === 'high').length,
        medium: allVideos.filter(v => v.quality === 'medium').length,
        low: allVideos.filter(v => v.quality === 'low').length,
      },
      dateDistribution: {
        today: 0, // Would need proper date calculation
        week: 0,
        month: 0,
        year: 0,
        older: 0,
      },
    };
  }, [videos, filteredVideos]);

  // Helper function to parse duration
  const parseDuration = (duration: string): number => {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: VideoFilters, newSort: VideoSort) => {
    setFilters(newFilters);
    setSort(newSort);
  }, []);

  // Get filter description for display
  const getFilterDescription = useCallback(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return 'No filters applied';
    }
    
    return VideoFilterUtils.describeFilters(filters);
  }, [filters]);

  // Handle refresh with current filters
  const handleRefresh = useCallback(() => {
    applyFiltersWithAPI();
  }, [applyFiltersWithAPI]);

  // Show loading state
  if (isSearching || isFiltering) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">
          {isSearching ? 'Searching videos...' : 'Applying filters...'}
        </p>
      </div>
    );
  }

  // Show error state
  if (filterError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">Filtering Error</h3>
              <p className="text-red-600">{filterError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (filteredVideos.length === 0 && !isSearching) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {searchQuery ? 'No videos found' : 'Start searching for videos'}
        </h3>
        <p className="text-gray-500 mb-4">
          {searchQuery 
            ? 'Try adjusting your filters or search terms'
            : 'Enter a search query to find educational content'
          }
        </p>
        {Object.keys(filters).length > 0 && (
          <Button variant="outline" onClick={() => setFilters({})}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter controls and results summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-blue-50 border-blue-300")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.keys(filters).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {Object.keys(filters).length}
              </Badge>
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>
            {filteredVideos.length} of {filterStats.totalVideos} videos
          </span>
          {lastFilterResult && (
            <Badge variant="outline">
              {lastFilterResult.processingTime}ms
            </Badge>
          )}
        </div>
      </div>

      {/* Filter description */}
      {Object.keys(filters).length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <p className="text-sm text-blue-700">
              <strong>Active filters:</strong> {getFilterDescription()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filter panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <FilterPanel 
            onFiltersChange={handleFiltersChange}
            resultCount={filteredVideos.length}
            filterStats={filterStats}
            variant="panel"
          />
        </motion.div>
      )}

      {/* Video grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            showRelevanceScore={true}
            showCategoryInfo={true}
          />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, AlertCircle, Filter, SortDesc } from 'lucide-react';
import VideoCard from './VideoCard';
import FilterPanel from './FilterPanel';
import { useAppStore } from '../store';
import { Button } from './ui/button';
import { cn } from '../utils/cn';

// Types for enhanced filtering
import type { 
  VideoFilters, 
  VideoSort, 
  FilterStats 
} from '../types/video-filters';
import { VideoFilterUtils } from '../types/video-filters';
import type { VideoUI } from '../types/video-ui';

const SearchResults: React.FC = () => {
  const { videos, isSearching, searchQuery } = useAppStore();
  
  // Filter and sort state
  const [filters, setFilters] = useState<VideoFilters>({});
  const [sort, setSort] = useState<VideoSort>({ field: 'relevance', order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort videos
  const { filteredAndSortedVideos, filterStats } = useMemo(() => {
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

    // Calculate filter statistics
    const stats: FilterStats = {
      totalVideos: videos.length,
      filteredVideos: filtered.length,
      averageRelevanceScore: filtered.length > 0 
        ? filtered.reduce((sum, v) => sum + v.relevanceScore, 0) / filtered.length 
        : 0,
      durationDistribution: {
        any: videos.length,
        short: videos.filter(v => v.duration && parseDuration(v.duration) < 240).length,
        medium: videos.filter(v => v.duration && parseDuration(v.duration) >= 240 && parseDuration(v.duration) < 1200).length,
        long: videos.filter(v => v.duration && parseDuration(v.duration) >= 1200).length,
        custom: 0,
      },
      qualityDistribution: {
        excellent: videos.filter(v => v.quality === 'excellent').length,
        high: videos.filter(v => v.quality === 'high').length,
        medium: videos.filter(v => v.quality === 'medium').length,
        low: videos.filter(v => v.quality === 'low').length,
      },
      dateDistribution: {
        today: 0, // Would need proper date calculation
        week: 0,
        month: 0,
        year: 0,
        older: 0,
      },
    };

    return { 
      filteredAndSortedVideos: filtered, 
      filterStats: stats 
    };
  }, [videos, filters, sort]);

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
  const filterDescription = useMemo(() => {
    const hasFilters = Object.keys(filters).length > 0;
    if (!hasFilters) return null;
    
    return VideoFilterUtils.describeFilters(filters);
  }, [filters]);

  if (isSearching) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-primary-500/30 blur-sm"></div>
          <div className="relative bg-white rounded-full p-4">
            <RefreshCw size={24} className="text-primary-600 animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-gray-600 animate-pulse">
          Analyzing videos for "{searchQuery}"...
        </p>
      </div>
    );
  }
  
  if (videos.length === 0 && searchQuery) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="bg-gray-100 rounded-full p-4">
          <AlertCircle size={24} className="text-gray-400" />
        </div>
        <p className="mt-4 text-gray-600">
          No videos found for "{searchQuery}". Try a different search term.
        </p>
      </div>
    );
  }
  
  if (videos.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="bg-gray-100 rounded-full p-4">
          <Search size={24} className="text-gray-400" />
        </div>
        <p className="mt-4 text-gray-600">
          Search for a topic to see curated learning videos
        </p>
      </div>
    );
  }

  // Show filtered results with no matches
  if (filteredAndSortedVideos.length === 0 && videos.length > 0) {
    return (
      <div className="py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header with filter controls */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Results for "{searchQuery}"</h2>
              <p className="text-gray-500">
                No videos match your current filters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-primary/10")}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.keys(filters).length > 0 && (
                  <span className="ml-1 bg-primary/20 text-xs px-1.5 py-0.5 rounded-full">
                    {Object.keys(filters).length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6">
              <FilterPanel
                variant="panel"
                onFiltersChange={handleFiltersChange}
                resultCount={filteredAndSortedVideos.length}
                filterStats={filterStats}
              />
            </div>
          )}

          {/* No results state */}
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos match your filters</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your filters or search criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({});
                setSort({ field: 'relevance', order: 'desc' });
              }}
            >
              Clear All Filters
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header with filter controls */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Results for "{searchQuery}"</h2>
            <div className="flex items-center gap-2 text-gray-500">
              <span>
                Found {filteredAndSortedVideos.length} videos
                {filteredAndSortedVideos.length !== videos.length && 
                  ` (filtered from ${videos.length} total)`
                } ranked by {sort.field}
              </span>
              {filterDescription && (
                <>
                  <span>•</span>
                  <span className="text-sm">{filterDescription}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-primary/10")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {Object.keys(filters).length > 0 && (
                <span className="ml-1 bg-primary/20 text-xs px-1.5 py-0.5 rounded-full">
                  {Object.keys(filters).length}
                </span>
              )}
            </Button>
            <div className="flex items-center text-sm text-gray-500">
              <SortDesc className="h-4 w-4 mr-1" />
              <span className="capitalize">
                {sort.field} ({sort.order === 'desc' ? 'high to low' : 'low to high'})
              </span>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6">
            <FilterPanel
              variant="panel"
              onFiltersChange={handleFiltersChange}
              resultCount={filteredAndSortedVideos.length}
              filterStats={filterStats}
            />
          </div>
        )}

        {/* Video Results */}
        <div className="space-y-4">
          {filteredAndSortedVideos.map((video, index) => (
            <VideoCard key={video.id} video={video} index={index} />
          ))}
        </div>

        {/* Load More / Pagination placeholder */}
        {filteredAndSortedVideos.length >= 20 && (
          <div className="mt-8 text-center">
            <Button variant="outline">
              Load More Videos
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SearchResults;
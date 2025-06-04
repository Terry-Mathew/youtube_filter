// Example usage of YouTube API Client
// This file demonstrates proper implementation patterns

import { YouTubeApiClient } from './youtube-api';
import { createVideoId, createApiKey, createChannelId } from '../types/youtube';
import type { YouTubeVideoId, YouTubeApiKey } from '../types/youtube';

/**
 * Example: Initialize YouTube API client
 */
export async function initializeYouTubeClient(): Promise<YouTubeApiClient> {
  // Client will automatically retrieve API key from Supabase storage
  const client = new YouTubeApiClient({
    config: {
      defaultMaxResults: 25,
      retryAttempts: 3,
    },
    enableCaching: true,
    enableQuotaManagement: true,
    enableRetry: true,
  });

  // Validate API key is working
  const isValid = await client.validateApiKey();
  if (!isValid) {
    throw new Error('YouTube API key validation failed');
  }

  return client;
}

/**
 * Example: Get video details safely with error handling
 */
export async function getVideoDetailsExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Using branded types for type safety
    const videoIds: YouTubeVideoId[] = [
      createVideoId('dQw4w9WgXcQ'), // Rick Roll
      createVideoId('9bZkp7q19f0'), // PSY - GANGNAM STYLE
    ];

    // Get video details with automatic quota management
    const videos = await client.getVideoDetails(videoIds);
    
    console.log(`Retrieved ${videos.length} videos`);
    videos.forEach(video => {
      console.log(`- ${video.snippet?.title} by ${video.snippet?.channelTitle}`);
    });

    return videos;
  } catch (error) {
    console.error('Failed to get video details:', error);
    throw error;
  }
}

/**
 * Example: Batch processing with quota efficiency
 */
export async function batchProcessVideosExample(videoIds: string[]) {
  try {
    const client = await initializeYouTubeClient();
    
    // Convert to branded types
    const typedVideoIds = videoIds.map(createVideoId);
    
    // Check quota availability
    const quotaInfo = await client.getQuotaStatus();
    console.log(`Quota remaining: ${quotaInfo.remaining}/${quotaInfo.dailyLimit}`);
    
    // Batch process efficiently
    const videoMap = await client.batchGetVideoDetails(typedVideoIds);
    
    console.log(`Processed ${videoMap.size} videos in batches`);
    return videoMap;
  } catch (error) {
    console.error('Batch processing failed:', error);
    throw error;
  }
}

/**
 * Example: Monitoring quota usage
 */
export async function monitorQuotaUsage(): Promise<void> {
  try {
    const client = await initializeYouTubeClient();
    const quotaInfo = await client.getQuotaStatus();
    
    const usagePercentage = (Number(quotaInfo.used) / Number(quotaInfo.dailyLimit)) * 100;
    
    console.log('Quota Status:');
    console.log(`- Used: ${quotaInfo.used} units`);
    console.log(`- Remaining: ${quotaInfo.remaining} units`);
    console.log(`- Usage: ${usagePercentage.toFixed(1)}%`);
    console.log(`- Resets at: ${quotaInfo.resetTime.toLocaleString()}`);
    
    if (usagePercentage > 80) {
      console.warn('⚠️ Warning: High quota usage detected');
    }
    
    if (usagePercentage > 95) {
      console.error('🚨 Critical: Quota near exhaustion');
    }
  } catch (error) {
    console.error('Failed to monitor quota:', error);
  }
}

/**
 * Example: Error handling with user-friendly messages
 */
export async function handleYouTubeErrors(videoId: string): Promise<void> {
  try {
    const client = await initializeYouTubeClient();
    const video = await client.getVideo(createVideoId(videoId));
    
    if (video) {
      console.log(`Found video: ${video.snippet?.title}`);
    } else {
      console.log('Video not found or private');
    }
  } catch (error: any) {
    // Handle different error types appropriately
    if (error.type) {
      switch (error.type) {
        case 'QUOTA_EXCEEDED':
          console.error('Quota exceeded. Try again tomorrow.');
          break;
        case 'AUTHENTICATION_ERROR':
          console.error('API key issue. Check settings.');
          break;
        case 'RATE_LIMITED':
          console.error('Too many requests. Slow down.');
          break;
        case 'NOT_FOUND':
          console.error('Video not found or private.');
          break;
        default:
          console.error('Unexpected error:', error.userMessage);
      }
    } else {
      console.error('Unknown error:', error.message);
    }
  }
}

/**
 * Example: Cache management
 */
export async function manageCacheExample(): Promise<void> {
  const client = await initializeYouTubeClient();
  
  // Get cache statistics
  const stats = client.getCacheStats();
  console.log(`Cache contains ${stats.size} items`);
  
  // Clear cache if needed
  if (stats.size > 1000) {
    client.clearCache();
    console.log('Cache cleared due to size limit');
  }
}

/**
 * Example: Proper client disposal
 */
export async function cleanupExample(): Promise<void> {
  const client = await initializeYouTubeClient();
  
  try {
    // Use the client...
    await client.getQuotaStatus();
  } finally {
    // Always dispose of resources
    client.dispose();
    console.log('YouTube client disposed');
  }
}

/**
 * Example: Basic search functionality
 */
export async function basicSearchExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Basic search for videos, channels, and playlists
    const searchResults = await client.search('React tutorials', {
      maxResults: 10,
      order: 'relevance',
    });
    
    console.log(`Found ${searchResults.items.length} results`);
    console.log(`Total available: ${searchResults.pagination.totalResults}`);
    
    // Group results by type
    if (searchResults.grouped) {
      console.log(`Videos: ${searchResults.grouped.videos.length}`);
      console.log(`Channels: ${searchResults.grouped.channels.length}`);
      console.log(`Playlists: ${searchResults.grouped.playlists.length}`);
    }
    
    return searchResults;
  } catch (error) {
    console.error('Basic search failed:', error);
    throw error;
  }
}

/**
 * Example: Advanced search with filters
 */
export async function advancedSearchExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Search for recent HD programming tutorials
    const results = await client.advancedSearch('programming tutorial', {
      duration: 'medium', // 4-20 minutes
      definition: 'high', // HD videos only
      caption: 'closedCaption', // Videos with captions
      license: 'creativeCommon', // Creative Commons only
      publishedAfter: new Date('2023-01-01'), // Recent videos
      safeSearch: 'strict',
    }, {
      maxResults: 25,
      order: 'viewCount', // Most viewed first
      regionCode: 'US',
    });
    
    console.log(`Advanced search found ${results.items.length} results`);
    return results;
  } catch (error) {
    console.error('Advanced search failed:', error);
    throw error;
  }
}

/**
 * Example: Search specific content types
 */
export async function contentTypeSearchExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Search for videos only
    const videoResults = await client.searchVideos('JavaScript', {
      maxResults: 10,
      order: 'date',
    });
    
    // Search for channels only
    const channelResults = await client.searchChannels('programming', {
      maxResults: 5,
    });
    
    // Search for playlists only
    const playlistResults = await client.searchPlaylists('web development course', {
      maxResults: 5,
    });
    
    console.log('Content type search results:');
    console.log(`Videos: ${videoResults.items.length}`);
    console.log(`Channels: ${channelResults.items.length}`);
    console.log(`Playlists: ${playlistResults.items.length}`);
    
    return { videoResults, channelResults, playlistResults };
  } catch (error) {
    console.error('Content type search failed:', error);
    throw error;
  }
}

/**
 * Example: Pagination handling
 */
export async function paginationExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Get first page
    const firstPage = await client.search('TypeScript', {
      maxResults: 10,
      order: 'relevance',
    });
    
    console.log(`First page: ${firstPage.items.length} results`);
    console.log(`Has next page: ${firstPage.pagination.hasNextPage}`);
    
    // Get next page if available
    if (firstPage.pagination.hasNextPage) {
      const secondPage = await client.getNextSearchPage(firstPage, 'TypeScript', {
        maxResults: 10,
        order: 'relevance',
      });
      
      if (secondPage) {
        console.log(`Second page: ${secondPage.items.length} results`);
        console.log(`Total pages processed: 2`);
      }
    }
    
    return firstPage;
  } catch (error) {
    console.error('Pagination example failed:', error);
    throw error;
  }
}

/**
 * Example: Channel-specific search
 */
export async function channelSearchExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Search within a specific channel (example: Google Developers)
    const channelId = createChannelId('UC_x5XG1OV2P6uZZ5FSM9Ttw'); // Google Developers
    
    const results = await client.searchInChannel(channelId, 'API', {
      maxResults: 15,
      order: 'date',
    });
    
    console.log(`Channel search found ${results.items.length} results`);
    return results;
  } catch (error) {
    console.error('Channel search failed:', error);
    throw error;
  }
}

/**
 * Example: Location-based search
 */
export async function locationSearchExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Search for videos near San Francisco
    const results = await client.search('tech meetup', {
      maxResults: 10,
      filters: {
        location: {
          lat: 37.7749,
          lng: -122.4194,
          radius: '50km',
        },
      },
    });
    
    console.log(`Location-based search found ${results.items.length} results`);
    return results;
  } catch (error) {
    console.error('Location search failed:', error);
    throw error;
  }
}

/**
 * Example: Comprehensive search with all results
 */
export async function comprehensiveSearchExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Get all results across multiple pages (with limit)
    const allResults = await client.searchAll('machine learning', {
      maxResults: 50, // Per page
      order: 'relevance',
      filters: {
        duration: 'long', // Educational content is often longer
        caption: 'closedCaption', // Accessibility
      },
    }, 3); // Max 3 pages = 150 results total
    
    console.log(`Comprehensive search collected ${allResults.length} total results`);
    
    // Analyze results
    const videoCount = allResults.filter(r => r.type === 'video').length;
    const channelCount = allResults.filter(r => r.type === 'channel').length;
    const playlistCount = allResults.filter(r => r.type === 'playlist').length;
    
    console.log(`Videos: ${videoCount}, Channels: ${channelCount}, Playlists: ${playlistCount}`);
    
    return allResults;
  } catch (error) {
    console.error('Comprehensive search failed:', error);
    throw error;
  }
}

/**
 * Example: Search parameter validation
 */
export async function searchValidationExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Test validation
    const validationResult = client.validateSearchParameters('test query', {
      maxResults: 25,
      filters: {
        location: {
          lat: 40.7128,
          lng: -74.0060,
          radius: '10km',
        },
        publishedAfter: new Date('2023-01-01'),
        publishedBefore: new Date('2023-12-31'),
      },
    });
    
    if (validationResult.success) {
      console.log('Search parameters are valid');
      // Proceed with search using validated parameters
      const results = await client.search('test query', {
        maxResults: 25,
        filters: validationResult.data ? {
          location: {
            lat: 40.7128,
            lng: -74.0060,
            radius: '10km',
          },
        } : undefined,
      });
      return results;
    } else {
      console.error('Validation errors:', validationResult.errors);
      throw new Error('Invalid search parameters');
    }
  } catch (error) {
    console.error('Search validation failed:', error);
    throw error;
  }
}

/**
 * Example: Detailed video metadata retrieval
 */
export async function detailedVideoMetadataExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Get detailed information for specific videos
    const videoIds = [
      createVideoId('dQw4w9WgXcQ'), // Rick Roll
      createVideoId('9bZkp7q19f0'), // PSY - GANGNAM STYLE
    ];
    
    const detailedVideos = await client.getDetailedVideoInfo(videoIds, {
      includeStatistics: true,
      includeContentDetails: true,
      includeTopicDetails: true,
      processMetadata: true,
    });
    
    console.log(`Retrieved detailed info for ${detailedVideos.length} videos`);
    
    detailedVideos.forEach(video => {
      console.log(`\n=== ${video.snippet?.title} ===`);
      console.log(`Views: ${video.statistics?.viewCountNumber?.toLocaleString()}`);
      console.log(`Likes: ${video.statistics?.likeCountNumber?.toLocaleString()}`);
      console.log(`Engagement Rate: ${video.statistics?.engagementRate?.toFixed(2)}%`);
      console.log(`Duration: ${video.contentDetails?.durationFormatted}`);
      console.log(`Quality: ${video.contentDetails?.isHD ? 'HD' : 'SD'}`);
      console.log(`Captions: ${video.contentDetails?.hasClosedCaptions ? 'Yes' : 'No'}`);
      console.log(`Keywords: ${video.metadata?.extractedKeywords?.slice(0, 5).join(', ')}`);
    });
    
    return detailedVideos;
  } catch (error) {
    console.error('Detailed video metadata retrieval failed:', error);
    throw error;
  }
}

/**
 * Example: Enhanced video statistics analysis
 */
export async function videoStatisticsAnalysisExample() {
  try {
    const client = await initializeYouTubeClient();
    
    const videoIds = [
      createVideoId('dQw4w9WgXcQ'),
      createVideoId('9bZkp7q19f0'),
      createVideoId('kJQP7kiw5Fk'), // Despacito
    ];
    
    // Get enhanced statistics
    const statisticsMap = await client.getVideoStatistics(videoIds);
    
    console.log('Enhanced Video Statistics:');
    
    for (const [videoId, stats] of statisticsMap.entries()) {
      console.log(`\nVideo ID: ${videoId}`);
      console.log(`Views: ${stats.viewCountNumber.toLocaleString()}`);
      console.log(`Likes: ${stats.likeCountNumber.toLocaleString()}`);
      console.log(`Comments: ${stats.commentCountNumber.toLocaleString()}`);
      console.log(`Engagement Rate: ${stats.engagementRate?.toFixed(2)}%`);
      console.log(`Like-to-View Ratio: ${stats.likeToViewRatio?.toFixed(4)}%`);
    }
    
    return statisticsMap;
  } catch (error) {
    console.error('Video statistics analysis failed:', error);
    throw error;
  }
}

/**
 * Example: Video content details with processing
 */
export async function videoContentDetailsExample() {
  try {
    const client = await initializeYouTubeClient();
    
    const videoIds = [
      createVideoId('dQw4w9WgXcQ'),
      createVideoId('9bZkp7q19f0'),
    ];
    
    const contentDetailsMap = await client.getVideoContentDetails(videoIds);
    
    console.log('Enhanced Content Details:');
    
    for (const [videoId, details] of contentDetailsMap.entries()) {
      console.log(`\nVideo ID: ${videoId}`);
      console.log(`Duration: ${details.durationFormatted} (${details.durationSeconds} seconds)`);
      console.log(`Quality: ${details.isHD ? 'HD' : 'SD'}`);
      console.log(`Dimension: ${details.dimension}`);
      console.log(`Closed Captions: ${details.hasClosedCaptions ? 'Available' : 'Not Available'}`);
      console.log(`Licensed Content: ${details.isLicensed ? 'Yes' : 'No'}`);
      console.log(`Embeddable: ${details.contentRating ? 'Yes' : 'Restricted'}`);
      
      if (details.regionRestriction) {
        if (details.regionRestriction.blocked) {
          console.log(`Blocked in: ${details.regionRestriction.blocked.join(', ')}`);
        }
        if (details.regionRestriction.allowed) {
          console.log(`Allowed in: ${details.regionRestriction.allowed.join(', ')}`);
        }
      }
    }
    
    return contentDetailsMap;
  } catch (error) {
    console.error('Video content details retrieval failed:', error);
    throw error;
  }
}

/**
 * Example: Popular videos with enhanced metadata
 */
export async function popularVideosExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Get popular videos in a specific category and region
    const popularVideos = await client.getPopularVideos({
      chart: 'mostPopular',
      part: ['snippet', 'statistics', 'contentDetails'],
      regionCode: 'US',
      videoCategoryId: '22', // People & Blogs
      maxResults: 10,
    });
    
    console.log(`Found ${popularVideos.length} popular videos`);
    
    popularVideos.forEach((video, index) => {
      console.log(`\n${index + 1}. ${video.snippet?.title}`);
      console.log(`   Channel: ${video.snippet?.channelTitle}`);
      console.log(`   Views: ${video.statistics?.viewCountNumber?.toLocaleString()}`);
      console.log(`   Duration: ${video.contentDetails?.durationFormatted}`);
      console.log(`   Quality: ${video.contentDetails?.isHD ? 'HD' : 'SD'}`);
      console.log(`   Engagement: ${video.statistics?.engagementRate?.toFixed(2)}%`);
    });
    
    return popularVideos;
  } catch (error) {
    console.error('Popular videos retrieval failed:', error);
    throw error;
  }
}

/**
 * Example: Single video detailed analysis
 */
export async function singleVideoAnalysisExample() {
  try {
    const client = await initializeYouTubeClient();
    
    const videoId = createVideoId('dQw4w9WgXcQ');
    
    // Get comprehensive video details
    const video = await client.getDetailedVideo(videoId, {
      includeStatistics: true,
      includeContentDetails: true,
      includeTopicDetails: true,
      includeLiveStreamingDetails: true,
      includeRecordingDetails: true,
      includePlayerDetails: true,
      processMetadata: true,
    });
    
    if (!video) {
      console.log('Video not found');
      return null;
    }
    
    console.log('=== Comprehensive Video Analysis ===');
    console.log(`Title: ${video.snippet?.title}`);
    console.log(`Channel: ${video.snippet?.channelTitle}`);
    console.log(`Published: ${new Date(video.snippet?.publishedAt || '').toLocaleDateString()}`);
    console.log(`Category: ${video.snippet?.categoryId}`);
    
    console.log('\n=== Statistics ===');
    console.log(`Views: ${video.statistics?.viewCountNumber?.toLocaleString()}`);
    console.log(`Likes: ${video.statistics?.likeCountNumber?.toLocaleString()}`);
    console.log(`Comments: ${video.statistics?.commentCountNumber?.toLocaleString()}`);
    console.log(`Engagement Rate: ${video.statistics?.engagementRate?.toFixed(2)}%`);
    
    console.log('\n=== Content Details ===');
    console.log(`Duration: ${video.contentDetails?.durationFormatted}`);
    console.log(`Quality: ${video.contentDetails?.isHD ? 'HD' : 'SD'}`);
    console.log(`Closed Captions: ${video.contentDetails?.hasClosedCaptions ? 'Yes' : 'No'}`);
    console.log(`Licensed: ${video.contentDetails?.isLicensed ? 'Yes' : 'No'}`);
    
    console.log('\n=== Metadata ===');
    console.log(`Processing Complete: ${video.metadata?.processingComplete ? 'Yes' : 'No'}`);
    console.log(`Tags: ${video.metadata?.tags?.length || 0} tags`);
    console.log(`Keywords: ${video.metadata?.extractedKeywords?.slice(0, 10).join(', ')}`);
    
    if (video.topicDetails?.topicCategories) {
      console.log(`\n=== Topic Details ===`);
      console.log(`Categories: ${video.topicDetails.topicCategories.join(', ')}`);
    }
    
    return video;
  } catch (error) {
    console.error('Single video analysis failed:', error);
    throw error;
  }
}

/**
 * Example: Duration and quality-based filtering
 */
export async function videoFilteringExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Search for programming tutorials
    const searchResults = await client.search('programming tutorial', {
      maxResults: 25,
      order: 'relevance',
    });
    
    // Extract video IDs from search results
    const videoIds = searchResults.items
      .filter(item => item.id.kind === 'youtube#video')
      .map(item => createVideoId(item.id.videoId!))
      .slice(0, 10); // Limit for demo
    
    // Get detailed video info
    const detailedVideos = await client.getDetailedVideoInfo(videoIds, {
      includeStatistics: true,
      includeContentDetails: true,
    });
    
    console.log('=== Video Filtering Results ===');
    
    // Filter by various criteria
    const hdVideos = detailedVideos.filter(v => v.contentDetails?.isHD);
    console.log(`HD Videos: ${hdVideos.length}/${detailedVideos.length}`);
    
    const longVideos = detailedVideos.filter(v => (v.contentDetails?.durationSeconds || 0) > 600); // > 10 minutes
    console.log(`Long Videos (>10 min): ${longVideos.length}/${detailedVideos.length}`);
    
    const captionedVideos = detailedVideos.filter(v => v.contentDetails?.hasClosedCaptions);
    console.log(`Videos with Captions: ${captionedVideos.length}/${detailedVideos.length}`);
    
    const popularVideos = detailedVideos.filter(v => (v.statistics?.viewCountNumber || 0) > 100000);
    console.log(`Popular Videos (>100K views): ${popularVideos.length}/${detailedVideos.length}`);
    
    const highEngagementVideos = detailedVideos.filter(v => (v.statistics?.engagementRate || 0) > 2);
    console.log(`High Engagement (>2%): ${highEngagementVideos.length}/${detailedVideos.length}`);
    
    // Show top 3 by engagement
    const topByEngagement = detailedVideos
      .sort((a, b) => (b.statistics?.engagementRate || 0) - (a.statistics?.engagementRate || 0))
      .slice(0, 3);
    
    console.log('\n=== Top 3 by Engagement ===');
    topByEngagement.forEach((video, index) => {
      console.log(`${index + 1}. ${video.snippet?.title}`);
      console.log(`   Engagement: ${video.statistics?.engagementRate?.toFixed(2)}%`);
      console.log(`   Duration: ${video.contentDetails?.durationFormatted}`);
      console.log(`   Quality: ${video.contentDetails?.isHD ? 'HD' : 'SD'}`);
    });
    
    return {
      total: detailedVideos.length,
      hd: hdVideos.length,
      long: longVideos.length,
      captioned: captionedVideos.length,
      popular: popularVideos.length,
      highEngagement: highEngagementVideos.length,
      topByEngagement,
    };
  } catch (error) {
    console.error('Video filtering failed:', error);
    throw error;
  }
}

/**
 * Example: Performance comparison between videos
 */
export async function videoPerformanceComparisonExample() {
  try {
    const client = await initializeYouTubeClient();
    
    // Compare famous videos
    const videoIds = [
      createVideoId('dQw4w9WgXcQ'), // Rick Roll
      createVideoId('9bZkp7q19f0'), // Gangnam Style
      createVideoId('kJQP7kiw5Fk'), // Despacito
      createVideoId('JGwWNGJdvx8'), // Ed Sheeran - Shape of You
    ];
    
    const videos = await client.getDetailedVideoInfo(videoIds, {
      includeStatistics: true,
      includeContentDetails: true,
      processMetadata: true,
    });
    
    console.log('=== Video Performance Comparison ===');
    
    // Create comparison table
    const comparison = videos.map(video => ({
      title: video.snippet?.title?.substring(0, 30) + '...',
      views: video.statistics?.viewCountNumber || 0,
      likes: video.statistics?.likeCountNumber || 0,
      engagement: video.statistics?.engagementRate || 0,
      duration: video.contentDetails?.durationFormatted || 'N/A',
      quality: video.contentDetails?.isHD ? 'HD' : 'SD',
    }));
    
    // Sort by views
    comparison.sort((a, b) => b.views - a.views);
    
    console.table(comparison);
    
    // Find best performers
    const bestByViews = comparison[0];
    const bestByEngagement = comparison.reduce((prev, current) => 
      current.engagement > prev.engagement ? current : prev
    );
    
    console.log(`\nMost Viewed: ${bestByViews.title} (${bestByViews.views.toLocaleString()} views)`);
    console.log(`Most Engaging: ${bestByEngagement.title} (${bestByEngagement.engagement.toFixed(2)}% engagement)`);
    
    return { videos, comparison, bestByViews, bestByEngagement };
  } catch (error) {
    console.error('Video performance comparison failed:', error);
    throw error;
  }
} 
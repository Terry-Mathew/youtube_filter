// Example usage of YouTube API Client
// This file demonstrates proper implementation patterns

import { YouTubeApiClient } from './youtube-api';
import { createVideoId, createApiKey } from '../types/youtube';
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
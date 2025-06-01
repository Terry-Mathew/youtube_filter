import { Video } from '../types';

// This is a mock function that simulates the backend API call
// In a real app, this would make calls to your backend which would handle:
// 1. YouTube API requests
// 2. Video transcription
// 3. LLM analysis for relevance scoring and key points extraction
export const mockSearch = async (query: string): Promise<Video[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  // Return mock data based on the query
  const mockVideos: Video[] = [
    {
      id: 'dQw4w9WgXcQ',
      title: `Top ${query} Concepts Explained Simply`,
      channelTitle: 'Learning Academy',
      thumbnailUrl: 'https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      publishedAt: '2023-09-15T14:30:00Z',
      viewCount: 1250000,
      relevanceScore: 92,
      keyPoints: [
        'Comprehensive overview of fundamental concepts',
        'Clear explanations with practical examples',
        'Covers advanced topics in an accessible way'
      ],
      duration: '15:24'
    },
    {
      id: 'xvFZjo5PgG0',
      title: `${query} for Beginners - Complete Tutorial`,
      channelTitle: 'Tech Simplified',
      thumbnailUrl: 'https://images.pexels.com/photos/4050421/pexels-photo-4050421.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      publishedAt: '2023-11-22T10:15:00Z',
      viewCount: 875000,
      relevanceScore: 88,
      keyPoints: [
        'Step-by-step introduction for absolute beginners',
        'Includes interactive exercises and challenges',
        'Covers all essential concepts with real-world applications'
      ],
      duration: '42:18'
    },
    {
      id: 'o-YBDTqX_ZU',
      title: `Advanced ${query} Techniques You Need to Know`,
      channelTitle: 'Professional Insights',
      thumbnailUrl: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      publishedAt: '2024-01-05T16:45:00Z',
      viewCount: 450000,
      relevanceScore: 85,
      keyPoints: [
        'Explores cutting-edge techniques for professionals',
        'Demonstrates optimization strategies',
        'Includes case studies from industry leaders'
      ],
      duration: '28:45'
    },
    {
      id: 'jNQXAC9IVRw',
      title: `${query} - Common Mistakes and How to Avoid Them`,
      channelTitle: 'MistakeFree Learning',
      thumbnailUrl: 'https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      publishedAt: '2023-08-12T09:30:00Z',
      viewCount: 680000,
      relevanceScore: 79,
      keyPoints: [
        'Identifies frequent pitfalls faced by learners',
        'Provides practical solutions to common problems',
        'Shows before/after examples for clarity'
      ],
      duration: '18:32'
    },
    {
      id: 'QH2-TGUlwu4',
      title: `${query} in 2024: What's Changed and What's Coming`,
      channelTitle: 'Future Trends',
      thumbnailUrl: 'https://images.pexels.com/photos/4145354/pexels-photo-4145354.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      publishedAt: '2024-02-28T13:20:00Z',
      viewCount: 320000,
      relevanceScore: 75,
      keyPoints: [
        'Covers latest developments and industry trends',
        'Interviews with leading experts in the field',
        'Predictions for future directions and opportunities'
      ],
      duration: '36:10'
    },
    {
      id: 'rTgj1HxmUbg',
      title: `Practical ${query} Projects for Portfolio Building`,
      channelTitle: 'Project-Based Learning',
      thumbnailUrl: 'https://images.pexels.com/photos/4144179/pexels-photo-4144179.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      publishedAt: '2023-10-18T11:45:00Z',
      viewCount: 540000,
      relevanceScore: 68,
      keyPoints: [
        'Step-by-step guide to building 3 portfolio-worthy projects',
        'Includes downloadable starter files and resources',
        'Shows how to present projects to potential employers'
      ],
      duration: '52:28'
    }
  ];
  
  return mockVideos;
};
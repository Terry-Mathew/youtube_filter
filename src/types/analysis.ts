export interface VideoInsights {
  // Educational Classification
  contentType: 'tutorial' | 'explanation' | 'demonstration' | 'discussion' | 'lecture' | 'review';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Learning Metadata
  estimatedLearningTime: number; // minutes of focused learning
  prerequisites: string[];
  learningObjectives: string[];
  
  // Quality Indicators
  contentQuality: {
    clarity: number;        // 0-100
    completeness: number;   // 0-100
    practicalValue: number; // 0-100
  };
  
  // Key Concepts
  mainTopics: string[];      // Top 5 topics
  technicalTerms: string[];  // Important terminology
  
  // Actionable Summary
  summary: string;           // 2-3 sentence overview
  bestFor: string[];         // Who benefits most
  
  // Confidence and metadata
  confidence: number;        // 0-100
  analysisVersion: string;
  modelUsed: string;
  tokensUsed: number;
  estimatedCost: number;
}

export interface CategoryAnalysis {
  // Match against existing categories
  categoryMatches: Array<{
    categoryId: string;
    relevanceScore: number;
    matchedKeywords: string[];
    confidence: number;
  }>;
  
  // Suggest new categories if no good matches
  suggestedCategories: Array<{
    name: string;
    description: string;
    keywords: string[];
    confidence: number;
  }>;
  
  // Auto-categorization threshold
  autoAssignThreshold: number;
}

export interface AnalysisRequest {
  videoId: string;
  transcript: string;
  categories: Array<{
    id: string;
    name: string;
    keywords: string[];
  }>;
  depth: AnalysisDepth;
  options?: {
    includeInsights?: boolean;
    includeCategoryAnalysis?: boolean;
    maxCost?: number;
  };
}

export interface AnalysisResult {
  videoId: string;
  relevanceScores: Record<string, number>; // categoryId -> score
  insights: VideoInsights;
  categoryAnalysis: CategoryAnalysis;
  processingTime: number;
  timestamp: string;
  cacheKey: string;
}

export type AnalysisDepth = 'quick' | 'basic' | 'standard' | 'deep';

export interface TokenEstimation {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

export interface CacheStrategy {
  relevanceScores: {
    ttl: number;
    storage: 'memory' | 'indexeddb' | 'memory+indexeddb';
  };
  contentInsights: {
    ttl: number;
    storage: 'memory' | 'indexeddb' | 'memory+indexeddb' | 'memory+indexeddb+supabase';
  };
  categoryMatches: {
    ttl: number;
    storage: 'memory';
  };
} 
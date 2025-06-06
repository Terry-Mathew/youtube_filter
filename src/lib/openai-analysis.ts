import { openAIClient } from './openai-client';
import { transcriptProcessor } from './transcript-processor';
import { transcriptAnalyzer } from './transcript-analyzer';
import { relevanceScorer } from './relevance-scorer';
import { contentInsights } from './content-insights';
import { analysisCache } from './analysis-cache';
import type {
  AnalysisRequest,
  AnalysisResult,
  VideoInsights,
  CategoryAnalysis,
  AnalysisDepth
} from '../types/analysis';

export class OpenAIAnalysis {
  private readonly ANALYSIS_VERSION = '1.0.0';

  /**
   * Analyze video content with smart cost controls and caching
   */
  async analyzeVideo(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = analysisCache.generateCacheKey(
        request.videoId,
        request.categories.map(c => c.id),
        request.depth
      );

      // Check cache first
      const cachedResult = await analysisCache.get(cacheKey);
      if (cachedResult) {
        console.log(`Cache hit for video ${request.videoId}`);
        return cachedResult;
      }

      // Ensure OpenAI client is ready
      if (!openAIClient.isReady()) {
        await openAIClient.initialize();
      }

      // Process transcript for analysis
      const processedTranscript = transcriptAnalyzer.prepareTranscriptForAnalysis(
        request.transcript, 
        request.depth
      );

      // Perform analysis based on depth and options
      const [insights, categoryAnalysis] = await Promise.all([
        request.options?.includeInsights !== false 
          ? this.analyzeContentInsights(processedTranscript, request.depth)
          : this.createEmptyInsights(),
        request.options?.includeCategoryAnalysis !== false
          ? this.analyzeCategoryRelevance(processedTranscript, request.categories, request.depth)
          : this.createEmptyCategoryAnalysis()
      ]);

      // Calculate relevance scores using the relevance scorer
      const relevanceScores = relevanceScorer.calculateRelevanceScores(categoryAnalysis);

      const processingTime = Date.now() - startTime;

      const result: AnalysisResult = {
        videoId: request.videoId,
        relevanceScores,
        insights,
        categoryAnalysis,
        processingTime,
        timestamp: new Date().toISOString(),
        cacheKey
      };

      // Cache the result
      await analysisCache.set(cacheKey, result);

      return result;

    } catch (error) {
      console.error(`Video analysis failed for ${request.videoId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze content insights using the transcript analyzer
   */
  private async analyzeContentInsights(
    transcript: string,
    depth: AnalysisDepth
  ): Promise<VideoInsights> {
    try {
      return await transcriptAnalyzer.analyzeContentInsights(transcript, depth);
    } catch (error) {
      console.warn('Failed to analyze content insights, using content insights fallback:', error);
      return contentInsights.generateInsights('explanation', 'intermediate', transcript);
    }
  }

  /**
   * Analyze category relevance using the transcript analyzer
   */
  private async analyzeCategoryRelevance(
    transcript: string,
    categories: AnalysisRequest['categories'],
    depth: AnalysisDepth
  ): Promise<CategoryAnalysis> {
    try {
      return await transcriptAnalyzer.analyzeCategoryRelevance(transcript, categories, depth);
    } catch (error) {
      console.warn('Failed to analyze category relevance, using fallback:', error);
      return this.createFallbackCategoryAnalysis(categories);
    }
  }

  /**
   * Get analysis from cache if available
   */
  async getCachedAnalysis(videoId: string, categories: string[], depth: AnalysisDepth): Promise<AnalysisResult | null> {
    const cacheKey = analysisCache.generateCacheKey(videoId, categories, depth);
    return await analysisCache.get(cacheKey);
  }

  /**
   * Invalidate cached analysis for a video
   */
  async invalidateCache(videoId: string): Promise<void> {
    // For now, we'll clear all cache entries for this video
    // In a more sophisticated implementation, we'd track video-specific keys
    console.log(`Invalidating cache for video ${videoId}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return analysisCache.getStats();
  }

  /**
   * Check if OpenAI analysis is available
   */
  isAvailable(): boolean {
    return openAIClient.isReady();
  }

  /**
   * Estimate cost for analysis request
   */
  async estimateCost(request: AnalysisRequest): Promise<number> {
    const processedTranscript = transcriptAnalyzer.prepareTranscriptForAnalysis(
      request.transcript,
      request.depth
    );

    // Rough estimation based on transcript length and depth
    const baseTokens = Math.ceil(processedTranscript.length / 4); // ~4 chars per token
    const outputTokens = request.depth === 'deep' ? 800 : 500;
    
    return openAIClient.estimateCost(baseTokens, outputTokens, 'gpt-4o-mini');
  }

  /**
   * Update relevance scoring strategy
   */
  updateScoringStrategy(strategy: any): void {
    relevanceScorer.updateStrategy(strategy);
  }

  /**
   * Get current scoring strategy
   */
  getScoringStrategy() {
    return relevanceScorer.getStrategy();
  }

  /**
   * Create empty insights when analysis is disabled
   */
  private createEmptyInsights(): VideoInsights {
    return {
      contentType: 'explanation',
      difficulty: 'intermediate',
      estimatedLearningTime: 15,
      prerequisites: [],
      learningObjectives: [],
      contentQuality: {
        clarity: 70,
        completeness: 70,
        practicalValue: 70
      },
      mainTopics: [],
      technicalTerms: [],
      summary: 'Content analysis not performed.',
      bestFor: [],
      confidence: 0,
      analysisVersion: this.ANALYSIS_VERSION,
      modelUsed: 'none',
      tokensUsed: 0,
      estimatedCost: 0
    };
  }

  /**
   * Create empty category analysis when analysis is disabled
   */
  private createEmptyCategoryAnalysis(): CategoryAnalysis {
    return {
      categoryMatches: [],
      suggestedCategories: [],
      autoAssignThreshold: 70
    };
  }

  /**
   * Create fallback category analysis when AI analysis fails
   */
  private createFallbackCategoryAnalysis(categories: AnalysisRequest['categories']): CategoryAnalysis {
    return {
      categoryMatches: categories.map(cat => ({
        categoryId: cat.id,
        relevanceScore: 50,
        matchedKeywords: [],
        confidence: 30
      })),
      suggestedCategories: [],
      autoAssignThreshold: 70
    };
  }
}

// Export singleton instance
export const openAIAnalysis = new OpenAIAnalysis();
import type { 
  RelevanceStrategy, 
  RelevanceScore, 
  ScoringOptions, 
  ScoringResult 
} from '../types/scoring';
import type { CategoryAnalysis } from '../types/analysis';

export class RelevanceScorer {
  private readonly strategy: RelevanceStrategy;

  constructor() {
    // Initialize relevance scoring strategy
    this.strategy = {
      method: 'weighted-chunks',
      chunkScoring: {
        first: 0.4,      // First chunk (intro) weight
        middle: 0.4,     // Body content weight
        last: 0.2        // Conclusion weight
      },
      scale: {
        min: 0,
        max: 100,        // 0-100 for user-friendly display
        threshold: 70    // 70+ is "relevant"
      }
    };
  }

  /**
   * Calculate relevance scores from category analysis
   */
  calculateRelevanceScores(categoryAnalysis: CategoryAnalysis): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (const match of categoryAnalysis.categoryMatches) {
      // Apply the relevance strategy scaling
      const normalizedScore = Math.min(
        this.strategy.scale.max,
        Math.max(
          this.strategy.scale.min,
          match.relevanceScore * (match.confidence / 100)
        )
      );
      
      scores[match.categoryId] = Math.round(normalizedScore);
    }
    
    return scores;
  }

  /**
   * Score video content against categories with custom options
   */
  scoreContent(
    categoryAnalysis: CategoryAnalysis,
    options?: Partial<ScoringOptions>
  ): ScoringResult {
    const startTime = Date.now();
    
    const scoringOptions: ScoringOptions = {
      useWeightedChunks: true,
      boostFirstChunk: this.strategy.chunkScoring.first,
      boostMiddleChunk: this.strategy.chunkScoring.middle,
      boostLastChunk: this.strategy.chunkScoring.last,
      threshold: this.strategy.scale.threshold,
      ...options
    };

    const scores = this.calculateRelevanceScores(categoryAnalysis);
    const confidence = this.calculateOverallConfidence(categoryAnalysis);
    
    return {
      scores,
      categoryAnalysis,
      confidence,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Get relevance threshold for auto-assignment
   */
  getRelevanceThreshold(): number {
    return this.strategy.scale.threshold;
  }

  /**
   * Check if a score meets the relevance threshold
   */
  isRelevant(score: number): boolean {
    return score >= this.strategy.scale.threshold;
  }

  /**
   * Get the top scoring categories
   */
  getTopCategories(scores: Record<string, number>, limit: number = 5): RelevanceScore[] {
    return Object.entries(scores)
      .map(([categoryId, score]) => ({
        categoryId,
        score,
        confidence: score >= this.strategy.scale.threshold ? 90 : 60,
        matchedKeywords: [] // Would be populated by the analysis
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate weighted score with chunk importance
   */
  calculateWeightedScore(
    firstChunkScore: number,
    middleChunkScore: number,
    lastChunkScore: number
  ): number {
    return (
      firstChunkScore * this.strategy.chunkScoring.first +
      middleChunkScore * this.strategy.chunkScoring.middle +
      lastChunkScore * this.strategy.chunkScoring.last
    );
  }

  /**
   * Update relevance strategy
   */
  updateStrategy(strategy: Partial<RelevanceStrategy>): void {
    Object.assign(this.strategy, strategy);
  }

  /**
   * Get current strategy
   */
  getStrategy(): RelevanceStrategy {
    return { ...this.strategy };
  }

  /**
   * Calculate overall confidence from category analysis
   */
  private calculateOverallConfidence(categoryAnalysis: CategoryAnalysis): number {
    if (categoryAnalysis.categoryMatches.length === 0) {
      return 30; // Low confidence if no matches
    }

    const avgConfidence = categoryAnalysis.categoryMatches.reduce(
      (sum, match) => sum + match.confidence, 0
    ) / categoryAnalysis.categoryMatches.length;

    // Boost confidence if we have multiple good matches
    const relevantMatches = categoryAnalysis.categoryMatches.filter(
      match => match.relevanceScore >= this.strategy.scale.threshold
    ).length;

    const confidenceBoost = Math.min(15, relevantMatches * 5);
    
    return Math.min(95, Math.max(40, avgConfidence + confidenceBoost));
  }
}

// Export singleton instance
export const relevanceScorer = new RelevanceScorer(); 
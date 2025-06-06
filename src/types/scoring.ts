import type { CategoryAnalysis } from './analysis';

export interface RelevanceStrategy {
  method: 'weighted-chunks';
  chunkScoring: {
    first: number;
    middle: number;
    last: number;
  };
  scale: {
    min: number;
    max: number;
    threshold: number;
  };
}

export interface RelevanceScore {
  categoryId: string;
  score: number;
  confidence: number;
  matchedKeywords: string[];
}

export interface ScoringOptions {
  useWeightedChunks: boolean;
  boostFirstChunk: number;
  boostMiddleChunk: number;
  boostLastChunk: number;
  threshold: number;
}

export interface ScoringResult {
  scores: Record<string, number>;
  categoryAnalysis: CategoryAnalysis;
  confidence: number;
  processingTime: number;
} 
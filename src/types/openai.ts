export interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface CostLimits {
  dailyLimit: number;
  perVideoLimit: number;
  warningThreshold: number;
}

export interface AnalysisStrategy {
  onSearch: boolean;
  onView: 'none' | 'summary' | 'full';
  onSave: 'none' | 'summary' | 'full';
  onCategorize: 'none' | 'summary' | 'full';
}

export interface ModelStrategy {
  relevanceScoring: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
  contentInsights: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
  complexAnalysis: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
  fallback: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
}

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

export interface UsageTracking {
  dailyUsage: number;
  monthlyUsage: number;
  totalCost: number;
  requestCount: number;
  lastReset: string;
  quotaExceeded: boolean;
}

export interface OpenAIError {
  type: 'rate_limit' | 'quota_exceeded' | 'invalid_key' | 'network' | 'parsing' | 'unknown';
  message: string;
  retryAfter?: number;
  cost?: number;
} 
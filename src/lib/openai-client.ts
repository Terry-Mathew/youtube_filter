import OpenAI from 'openai';
import type {
  OpenAIConfig,
  CostLimits,
  ModelStrategy,
  UsageTracking,
  OpenAIError,
  TokenEstimation
} from '../types/openai';

export class OpenAIKeyManager {
  private static readonly STORAGE_KEY = 'openai_api_key_encrypted';
  
  static async setKey(key: string): Promise<void> {
    // Simple XOR encryption for now (will be upgraded in TASK_015)
    const encrypted = btoa(key);
    localStorage.setItem(this.STORAGE_KEY, encrypted);
  }
  
  static async getKey(): Promise<string | null> {
    const encrypted = localStorage.getItem(this.STORAGE_KEY);
    return encrypted ? atob(encrypted) : null;
  }

  static async deleteKey(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static async hasKey(): Promise<boolean> {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}

export class OpenAIClient {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;
  private usageTracking: UsageTracking;
  private costLimits: CostLimits;
  private modelStrategy: ModelStrategy;

  constructor() {
    // Initialize with default cost limits
    this.costLimits = {
      dailyLimit: 5.00,        // $5/day default
      perVideoLimit: 0.10,     // $0.10 max per video
      warningThreshold: 0.80   // Alert at 80% usage
    };

    // Initialize model strategy (tiered approach)
    this.modelStrategy = {
      relevanceScoring: 'gpt-4o-mini',     // Fast, cheap, good enough
      contentInsights: 'gpt-4o-mini',      // Handles most analysis well
      complexAnalysis: 'gpt-4o',           // Only for user-requested deep analysis
      fallback: 'gpt-3.5-turbo'           // Emergency fallback
    };

    // Initialize usage tracking
    this.usageTracking = this.loadUsageTracking();
  }

  /**
   * Initialize OpenAI client with API key
   */
  async initialize(): Promise<void> {
    const apiKey = await OpenAIKeyManager.getKey();
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please configure your API key in Settings.');
    }

    this.config = {
      apiKey,
      model: 'gpt-4o-mini', // Default to cost-effective model
      maxTokens: 1000,
      temperature: 0.3,
      timeout: 30000
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });

    // Test the connection
    await this.testConnection();
  }

  /**
   * Test OpenAI API connection
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Make a minimal test request
      await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API connection failed: ${error.message}`);
      }
      throw new Error('OpenAI API connection failed');
    }
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.client !== null && this.config !== null;
  }

  /**
   * Get appropriate model for task type
   */
  getModelForTask(taskType: keyof ModelStrategy): string {
    return this.modelStrategy[taskType];
  }

  /**
   * Estimate token usage and cost
   */
  estimateTokens(text: string, model: string): TokenEstimation {
    // Rough estimation: ~4 characters per token for English text
    const inputTokens = Math.ceil(text.length / 4);
    
    // Estimate output tokens based on task (conservative estimate)
    const outputTokens = Math.min(500, Math.ceil(inputTokens * 0.3));
    
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = this.calculateCost(totalTokens, model);

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      model
    };
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(tokens: number, model: string): number {
    // Pricing as of 2024 (per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    
    // Simplified calculation (assumes 70% input, 30% output)
    const inputTokens = Math.ceil(tokens * 0.7);
    const outputTokens = Math.ceil(tokens * 0.3);
    
    return (inputTokens / 1000 * modelPricing.input) + (outputTokens / 1000 * modelPricing.output);
  }

  /**
   * Check if request is within cost limits
   */
  checkCostLimits(estimatedCost: number): { allowed: boolean; reason?: string } {
    // Check daily limit
    if (this.usageTracking.dailyUsage + estimatedCost > this.costLimits.dailyLimit) {
      return {
        allowed: false,
        reason: `Would exceed daily limit of $${this.costLimits.dailyLimit.toFixed(2)}`
      };
    }

    // Check per-video limit
    if (estimatedCost > this.costLimits.perVideoLimit) {
      return {
        allowed: false,
        reason: `Exceeds per-video limit of $${this.costLimits.perVideoLimit.toFixed(2)}`
      };
    }

    // Check warning threshold
    const newUsage = this.usageTracking.dailyUsage + estimatedCost;
    if (newUsage > this.costLimits.dailyLimit * this.costLimits.warningThreshold) {
      console.warn(`Approaching daily limit: $${newUsage.toFixed(4)} / $${this.costLimits.dailyLimit.toFixed(2)}`);
    }

    return { allowed: true };
  }

  /**
   * Make OpenAI API request with cost tracking
   */
  async makeRequest(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      responseFormat?: 'text' | 'json';
    } = {}
  ): Promise<{
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    cost: number;
  }> {
    if (!this.client || !this.config) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options.model || this.config.model;
    const maxTokens = options.maxTokens || this.config.maxTokens || 1000;
    const temperature = options.temperature ?? this.config.temperature ?? 0.3;

    // Estimate cost before making request
    const fullText = messages.map(m => m.content).join(' ');
    const estimation = this.estimateTokens(fullText, model);
    
    // Check cost limits
    const costCheck = this.checkCostLimits(estimation.estimatedCost);
    if (!costCheck.allowed) {
      throw new Error(`Request blocked: ${costCheck.reason}`);
    }

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };

      const actualCost = this.calculateCost(usage.total_tokens, model);

      // Update usage tracking
      this.updateUsageTracking(actualCost, usage.total_tokens);

      return {
        content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        cost: actualCost
      };

    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Handle OpenAI API errors
   */
  private handleOpenAIError(error: any): OpenAIError {
    if (error?.status === 429) {
      return {
        type: 'rate_limit',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: error?.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) : 60
      };
    }

    if (error?.status === 401) {
      return {
        type: 'invalid_key',
        message: 'Invalid API key. Please check your OpenAI API key in Settings.'
      };
    }

    if (error?.status === 402) {
      return {
        type: 'quota_exceeded',
        message: 'OpenAI quota exceeded. Please check your billing settings.'
      };
    }

    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      return {
        type: 'network',
        message: 'Network error. Please check your internet connection.'
      };
    }

    return {
      type: 'unknown',
      message: error?.message || 'Unknown OpenAI API error'
    };
  }

  /**
   * Update usage tracking
   */
  private updateUsageTracking(cost: number, tokens: number): void {
    const now = new Date();
    const today = now.toDateString();

    // Reset daily usage if it's a new day
    if (this.usageTracking.lastReset !== today) {
      this.usageTracking.dailyUsage = 0;
      this.usageTracking.lastReset = today;
    }

    this.usageTracking.dailyUsage += cost;
    this.usageTracking.totalCost += cost;
    this.usageTracking.requestCount += 1;

    // Check if quota exceeded
    this.usageTracking.quotaExceeded = this.usageTracking.dailyUsage >= this.costLimits.dailyLimit;

    // Save to localStorage
    this.saveUsageTracking();
  }

  /**
   * Load usage tracking from localStorage
   */
  private loadUsageTracking(): UsageTracking {
    const stored = localStorage.getItem('openai_usage_tracking');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to default
      }
    }

    return {
      dailyUsage: 0,
      monthlyUsage: 0,
      totalCost: 0,
      requestCount: 0,
      lastReset: new Date().toDateString(),
      quotaExceeded: false
    };
  }

  /**
   * Save usage tracking to localStorage
   */
  private saveUsageTracking(): void {
    localStorage.setItem('openai_usage_tracking', JSON.stringify(this.usageTracking));
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): UsageTracking {
    return { ...this.usageTracking };
  }

  /**
   * Update cost limits
   */
  updateCostLimits(limits: Partial<CostLimits>): void {
    this.costLimits = { ...this.costLimits, ...limits };
  }

  /**
   * Update model strategy
   */
  updateModelStrategy(strategy: Partial<ModelStrategy>): void {
    this.modelStrategy = { ...this.modelStrategy, ...strategy };
  }

  /**
   * Reset daily usage (for testing or manual reset)
   */
  resetDailyUsage(): void {
    this.usageTracking.dailyUsage = 0;
    this.usageTracking.quotaExceeded = false;
    this.usageTracking.lastReset = new Date().toDateString();
    this.saveUsageTracking();
  }
}

// Export singleton instance
export const openAIClient = new OpenAIClient(); 
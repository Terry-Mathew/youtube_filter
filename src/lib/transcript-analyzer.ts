import { openAIClient } from './openai-client';
import type { VideoInsights, AnalysisDepth } from '../types/analysis';

export class TranscriptAnalyzer {
  private readonly ANALYSIS_VERSION = '1.0.0';

  /**
   * Analyze content insights using OpenAI
   */
  async analyzeContentInsights(
    transcript: string,
    depth: AnalysisDepth
  ): Promise<VideoInsights> {
    const model = openAIClient.getModelForTask('contentInsights');
    
    const systemPrompt = this.buildInsightsSystemPrompt();
    const userPrompt = this.buildInsightsUserPrompt(transcript, depth);

    try {
      const response = await openAIClient.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model,
        maxTokens: depth === 'deep' ? 800 : 500,
        temperature: 0.3,
        responseFormat: 'json'
      });

      const insights = JSON.parse(response.content);
      
      return {
        ...insights,
        confidence: this.calculateInsightsConfidence(insights, transcript.length),
        analysisVersion: this.ANALYSIS_VERSION,
        modelUsed: model,
        tokensUsed: response.usage.totalTokens,
        estimatedCost: response.cost
      };

    } catch (error) {
      console.warn('Failed to analyze content insights, using fallback:', error);
      return this.createFallbackInsights(transcript);
    }
  }

  /**
   * Analyze category relevance using OpenAI
   */
  async analyzeCategoryRelevance(
    transcript: string,
    categories: Array<{
      id: string;
      name: string;
      keywords: string[];
    }>,
    depth: AnalysisDepth
  ): Promise<any> {
    const model = openAIClient.getModelForTask('relevanceScoring');
    
    const systemPrompt = this.buildCategorySystemPrompt();
    const userPrompt = this.buildCategoryUserPrompt(transcript, categories, depth);

    try {
      const response = await openAIClient.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model,
        maxTokens: 400,
        temperature: 0.2,
        responseFormat: 'json'
      });

      const analysis = JSON.parse(response.content);
      
      return {
        ...analysis,
        autoAssignThreshold: 70 // Default threshold
      };

    } catch (error) {
      console.warn('Failed to analyze category relevance, using fallback:', error);
      return this.createFallbackCategoryAnalysis(categories);
    }
  }

  /**
   * Prepare transcript for analysis with optimal chunking
   */
  prepareTranscriptForAnalysis(transcript: string, depth: AnalysisDepth): string {
    const maxLength = this.getMaxTranscriptLength(depth);
    
    if (transcript.length <= maxLength) {
      return transcript;
    }

    // Use weighted sampling for better representation
    return this.createWeightedSample(transcript, maxLength);
  }

  /**
   * Build system prompt for content insights
   */
  private buildInsightsSystemPrompt(): string {
    return `You are an expert educational content analyzer. Analyze video transcripts to extract learning insights.

Your task is to analyze educational video content and provide structured insights in JSON format.

Response format:
{
  "contentType": "tutorial|explanation|demonstration|discussion|lecture|review",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedLearningTime": number (minutes),
  "prerequisites": ["prerequisite1", "prerequisite2"],
  "learningObjectives": ["objective1", "objective2"],
  "contentQuality": {
    "clarity": number (0-100),
    "completeness": number (0-100),
    "practicalValue": number (0-100)
  },
  "mainTopics": ["topic1", "topic2", "topic3"],
  "technicalTerms": ["term1", "term2"],
  "summary": "2-3 sentence overview",
  "bestFor": ["audience1", "audience2"]
}

Focus on practical learning value and be concise but accurate.`;
  }

  /**
   * Build user prompt for content insights
   */
  private buildInsightsUserPrompt(transcript: string, depth: AnalysisDepth): string {
    const maxLength = this.getMaxTranscriptLength(depth);
    const truncatedTranscript = transcript.length > maxLength 
      ? transcript.substring(0, maxLength) + '...'
      : transcript;

    return `Analyze this educational video transcript and provide insights:

TRANSCRIPT:
${truncatedTranscript}

Return structured JSON analysis focusing on educational value and learning outcomes.`;
  }

  /**
   * Build system prompt for category analysis
   */
  private buildCategorySystemPrompt(): string {
    return `You are an expert content categorization system. Analyze video transcripts to determine category relevance.

Your task is to match video content to user-defined learning categories and suggest new categories if needed.

Response format:
{
  "categoryMatches": [
    {
      "categoryId": "string",
      "relevanceScore": number (0-100),
      "matchedKeywords": ["keyword1", "keyword2"],
      "confidence": number (0-100)
    }
  ],
  "suggestedCategories": [
    {
      "name": "string",
      "description": "string",
      "keywords": ["keyword1", "keyword2"],
      "confidence": number (0-100)
    }
  ]
}

Use a 0-100 relevance scale where 70+ indicates strong relevance.`;
  }

  /**
   * Build user prompt for category analysis
   */
  private buildCategoryUserPrompt(
    transcript: string,
    categories: Array<{
      id: string;
      name: string;
      keywords: string[];
    }>,
    depth: keyof AnalysisDepth
  ): string {
    const maxLength = this.getMaxTranscriptLength(depth);
    const truncatedTranscript = transcript.length > maxLength 
      ? transcript.substring(0, maxLength) + '...'
      : transcript;

    const categoryList = categories.map(cat => 
      `- ID: ${cat.id}, Name: "${cat.name}", Keywords: [${cat.keywords.join(', ')}]`
    ).join('\n');

    return `Analyze this transcript against these categories:

CATEGORIES:
${categoryList}

TRANSCRIPT:
${truncatedTranscript}

Return relevance scores for each category and suggest new categories if content doesn't fit well.`;
  }

  /**
   * Create weighted sample from transcript
   */
  private createWeightedSample(transcript: string, maxLength: number): string {
    const chunkSize = Math.floor(maxLength / 3);
    
    // Take samples from beginning, middle, and end
    const start = transcript.substring(0, chunkSize);
    const middleStart = Math.floor(transcript.length * 0.4);
    const middle = transcript.substring(middleStart, middleStart + chunkSize);
    const end = transcript.substring(transcript.length - chunkSize);
    
    return `${start}\n\n[...]\n\n${middle}\n\n[...]\n\n${end}`;
  }

  /**
   * Get maximum transcript length based on analysis depth
   */
  private getMaxTranscriptLength(depth: keyof AnalysisDepth): number {
    switch (depth) {
      case 'quick': return 500;
      case 'basic': return 2000;
      case 'standard': return 8000;
      case 'deep': return 15000;
      default: return 2000;
    }
  }

  /**
   * Calculate confidence score for insights
   */
  private calculateInsightsConfidence(insights: any, transcriptLength: number): number {
    let confidence = 80; // Base confidence
    
    // Adjust based on transcript length
    if (transcriptLength < 500) confidence -= 15;
    else if (transcriptLength > 5000) confidence += 10;
    
    // Adjust based on content completeness
    if (insights.mainTopics?.length >= 3) confidence += 5;
    if (insights.learningObjectives?.length >= 2) confidence += 5;
    if (insights.prerequisites?.length > 0) confidence += 5;
    
    return Math.min(95, Math.max(60, confidence));
  }

  /**
   * Create fallback insights when analysis fails
   */
  private createFallbackInsights(transcript: string): VideoInsights {
    return {
      contentType: 'explanation',
      difficulty: 'intermediate',
      estimatedLearningTime: Math.max(5, Math.min(60, Math.floor(transcript.length / 100))),
      prerequisites: [],
      learningObjectives: ['Content review and understanding'],
      contentQuality: {
        clarity: 70,
        completeness: 60,
        practicalValue: 65
      },
      mainTopics: ['General content'],
      technicalTerms: [],
      summary: 'Educational content requiring further analysis.',
      bestFor: ['General audience'],
      confidence: 40,
      analysisVersion: this.ANALYSIS_VERSION,
      modelUsed: 'fallback',
      tokensUsed: 0,
      estimatedCost: 0
    };
  }

  /**
   * Create fallback category analysis when analysis fails
   */
  private createFallbackCategoryAnalysis(categories: Array<{
    id: string;
    name: string;
    keywords: string[];
  }>): any {
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
export const transcriptAnalyzer = new TranscriptAnalyzer(); 
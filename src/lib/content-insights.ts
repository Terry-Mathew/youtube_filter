import type { VideoInsights, AnalysisDepth } from '../types/analysis';

export class ContentInsights {
  private readonly ANALYSIS_VERSION = '1.0.0';

  /**
   * Generate educational content insights from video analysis
   */
  generateInsights(
    contentType: VideoInsights['contentType'],
    difficulty: VideoInsights['difficulty'],
    transcript: string,
    analysisData?: any
  ): VideoInsights {
    const estimatedLearningTime = this.estimateLearningTime(transcript, difficulty);
    const contentQuality = this.assessContentQuality(transcript, analysisData);
    const mainTopics = this.extractMainTopics(transcript);
    const technicalTerms = this.extractTechnicalTerms(transcript);
    const prerequisites = this.identifyPrerequisites(difficulty, mainTopics);
    const learningObjectives = this.generateLearningObjectives(contentType, mainTopics);
    const summary = this.generateSummary(transcript, contentType);
    const bestFor = this.identifyTargetAudience(difficulty, contentType, mainTopics);

    return {
      contentType,
      difficulty,
      estimatedLearningTime,
      prerequisites,
      learningObjectives,
      contentQuality,
      mainTopics,
      technicalTerms,
      summary,
      bestFor,
      confidence: this.calculateConfidence(transcript, analysisData),
      analysisVersion: this.ANALYSIS_VERSION,
      modelUsed: analysisData?.modelUsed || 'content-insights',
      tokensUsed: analysisData?.tokensUsed || 0,
      estimatedCost: analysisData?.estimatedCost || 0
    };
  }

  /**
   * Estimate learning time based on transcript and difficulty
   */
  private estimateLearningTime(transcript: string, difficulty: VideoInsights['difficulty']): number {
    const baseTime = Math.max(5, Math.min(120, Math.floor(transcript.length / 100)));
    
    // Adjust based on difficulty
    switch (difficulty) {
      case 'beginner':
        return Math.floor(baseTime * 0.8); // Easier to follow
      case 'intermediate':
        return baseTime;
      case 'advanced':
        return Math.floor(baseTime * 1.3); // Requires more focus
      default:
        return baseTime;
    }
  }

  /**
   * Assess content quality indicators
   */
  private assessContentQuality(
    transcript: string, 
    analysisData?: any
  ): VideoInsights['contentQuality'] {
    let clarity = 75;
    let completeness = 70;
    let practicalValue = 65;

    // Assess clarity based on transcript structure
    if (transcript.includes('Let me explain') || transcript.includes('First,') || transcript.includes('Next,')) {
      clarity += 10;
    }
    
    if (transcript.length > 3000) {
      completeness += 10;
    }
    
    if (transcript.includes('example') || transcript.includes('demo') || transcript.includes('practice')) {
      practicalValue += 15;
    }

    // Use AI analysis data if available
    if (analysisData?.contentQuality) {
      return analysisData.contentQuality;
    }

    return {
      clarity: Math.min(100, clarity),
      completeness: Math.min(100, completeness),
      practicalValue: Math.min(100, practicalValue)
    };
  }

  /**
   * Extract main topics from transcript
   */
  private extractMainTopics(transcript: string): string[] {
    const topics: string[] = [];
    
    // Simple keyword extraction (would be enhanced with AI in real implementation)
    const keywords = transcript.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency: Record<string, number> = {};
    
    keywords.forEach(word => {
      if (!this.isStopWord(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });
    
    const sortedTopics = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => this.capitalizeFirst(word));
    
    return sortedTopics.length > 0 ? sortedTopics : ['General content'];
  }

  /**
   * Extract technical terms from transcript
   */
  private extractTechnicalTerms(transcript: string): string[] {
    const terms: string[] = [];
    
    // Look for capitalized terms, acronyms, and technical patterns
    const matches = transcript.match(/\b[A-Z]{2,}\b|\b[A-Z][a-z]+(?:[A-Z][a-z]*)*\b/g) || [];
    
    const uniqueTerms = [...new Set(matches)]
      .filter(term => term.length > 2 && !this.isCommonWord(term))
      .slice(0, 10);
    
    return uniqueTerms;
  }

  /**
   * Identify prerequisites based on difficulty and topics
   */
  private identifyPrerequisites(
    difficulty: VideoInsights['difficulty'], 
    topics: string[]
  ): string[] {
    const prerequisites: string[] = [];
    
    switch (difficulty) {
      case 'beginner':
        prerequisites.push('Basic computer literacy');
        break;
      case 'intermediate':
        prerequisites.push('Basic understanding of the subject area');
        if (topics.some(topic => topic.toLowerCase().includes('programming'))) {
          prerequisites.push('Familiarity with programming concepts');
        }
        break;
      case 'advanced':
        prerequisites.push('Strong foundation in the subject area');
        prerequisites.push('Previous experience with related topics');
        break;
    }
    
    return prerequisites;
  }

  /**
   * Generate learning objectives based on content type and topics
   */
  private generateLearningObjectives(
    contentType: VideoInsights['contentType'], 
    topics: string[]
  ): string[] {
    const objectives: string[] = [];
    
    switch (contentType) {
      case 'tutorial':
        objectives.push('Follow step-by-step instructions');
        objectives.push('Apply learned techniques');
        break;
      case 'explanation':
        objectives.push('Understand key concepts');
        objectives.push('Explain the subject matter');
        break;
      case 'demonstration':
        objectives.push('Observe practical application');
        objectives.push('Replicate demonstrated techniques');
        break;
      case 'discussion':
        objectives.push('Analyze different perspectives');
        objectives.push('Form informed opinions');
        break;
      case 'lecture':
        objectives.push('Absorb comprehensive information');
        objectives.push('Take structured notes');
        break;
      case 'review':
        objectives.push('Evaluate content or products');
        objectives.push('Make informed decisions');
        break;
    }
    
    if (topics.length > 0) {
      objectives.push(`Gain knowledge about ${topics[0].toLowerCase()}`);
    }
    
    return objectives;
  }

  /**
   * Generate a summary of the content
   */
  private generateSummary(transcript: string, contentType: VideoInsights['contentType']): string {
    const length = transcript.length;
    const contentTypeText = contentType === 'tutorial' ? 'tutorial' : 
                           contentType === 'explanation' ? 'educational content' :
                           `${contentType} content`;
    
    if (length < 1000) {
      return `Brief ${contentTypeText} covering essential information and practical insights.`;
    } else if (length < 5000) {
      return `Comprehensive ${contentTypeText} providing detailed explanations and practical guidance.`;
    } else {
      return `In-depth ${contentTypeText} offering extensive coverage with detailed examples and thorough explanations.`;
    }
  }

  /**
   * Identify target audience
   */
  private identifyTargetAudience(
    difficulty: VideoInsights['difficulty'],
    contentType: VideoInsights['contentType'],
    topics: string[]
  ): string[] {
    const audience: string[] = [];
    
    switch (difficulty) {
      case 'beginner':
        audience.push('Beginners', 'Students new to the subject');
        break;
      case 'intermediate':
        audience.push('Intermediate learners', 'Professionals seeking to expand knowledge');
        break;
      case 'advanced':
        audience.push('Advanced practitioners', 'Experts in the field');
        break;
    }
    
    if (contentType === 'tutorial') {
      audience.push('Hands-on learners');
    } else if (contentType === 'explanation') {
      audience.push('Visual learners');
    }
    
    return audience;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(transcript: string, analysisData?: any): number {
    let confidence = 70; // Base confidence
    
    if (transcript.length > 1000) confidence += 10;
    if (transcript.length > 5000) confidence += 10;
    
    if (analysisData?.confidence) {
      return analysisData.confidence;
    }
    
    return Math.min(95, confidence);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'what', 'about', 'would', 'there', 'could', 'more', 'very', 'when', 'come', 'may', 'use'];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Check if word is a common word
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ['The', 'And', 'But', 'For', 'You', 'Can', 'All', 'Now', 'How', 'But', 'She', 'May', 'Say', 'Her', 'Use', 'One', 'Our', 'Out', 'Day', 'Get', 'His', 'Had', 'Him', 'Old', 'See', 'Two', 'Who', 'Its', 'Did', 'Yes', 'New', 'Way', 'Man', 'Big', 'Too', 'Any', 'My', 'No', 'Go', 'So', 'Up', 'If', 'Do', 'Or', 'An', 'As', 'We', 'Be', 'He', 'In', 'Is', 'It', 'Of', 'On', 'To'];
    return commonWords.includes(word);
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

// Export singleton instance
export const contentInsights = new ContentInsights(); 
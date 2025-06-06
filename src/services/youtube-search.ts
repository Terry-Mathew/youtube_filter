import type { Category, CategoryId } from '../types';
import type { YouTubeVideo, YouTubeSearchOptions } from '../types/youtube';
import { VideoService } from '../api/videos';

/**
 * Enhanced YouTube search service with category-based filtering
 * TASK_008_004: Implement category-based search filtering
 */

export interface CategorySearchContext {
  /** Selected categories for filtering */
  selectedCategories: Category[];
  /** Logic for combining multiple categories */
  categoryLogic: 'AND' | 'OR';
  /** Whether to enhance search query with category keywords */
  enhanceQuery: boolean;
  /** Confidence threshold for category matching */
  confidenceThreshold: number;
}

export interface EnhancedSearchOptions extends YouTubeSearchOptions {
  /** Category-based search context */
  categoryContext?: CategorySearchContext;
  /** Original user query */
  originalQuery: string;
  /** Enhanced query with category keywords */
  enhancedQuery?: string;
}

export interface CategoryKeywords {
  /** Primary keywords from category name */
  primary: string[];
  /** Secondary keywords from description */
  secondary: string[];
  /** Specific criteria keywords */
  criteria: string[];
  /** Combined relevance-weighted keywords */
  combined: string[];
}

export interface SearchEnhancementResult {
  /** Original search query */
  originalQuery: string;
  /** Enhanced query with category keywords */
  enhancedQuery: string;
  /** Keywords extracted from categories */
  extractedKeywords: CategoryKeywords;
  /** Categories used for enhancement */
  appliedCategories: Category[];
  /** Enhancement strategy used */
  strategy: 'keyword_boost' | 'query_expansion' | 'category_filter';
}

/**
 * YouTube Search Service with Category-Based Enhancement
 */
export class CategoryBasedYouTubeSearch {
  private videoService: VideoService;
  private keywordCache: Map<CategoryId, CategoryKeywords> = new Map();

  constructor(videoService: VideoService) {
    this.videoService = videoService;
  }

  /**
   * Search videos with category-based query enhancement
   */
  async searchWithCategoryEnhancement(
    query: string,
    categoryContext: CategorySearchContext,
    options: Partial<YouTubeSearchOptions> = {}
  ): Promise<{
    videos: YouTubeVideo[];
    enhancement: SearchEnhancementResult;
    totalResults: number;
  }> {
    // Extract keywords from selected categories
    const extractedKeywords = this.extractCategoryKeywords(categoryContext.selectedCategories);
    
    // Enhance search query based on category context
    const enhancement = this.enhanceSearchQuery(
      query,
      categoryContext.selectedCategories,
      extractedKeywords,
      categoryContext.enhanceQuery
    );

    // Build YouTube API search options with category context
    const searchOptions: EnhancedSearchOptions = {
      ...options,
      originalQuery: query,
      enhancedQuery: enhancement.enhancedQuery,
      categoryContext,
      // Add category-specific YouTube API parameters
      ...this.buildCategorySpecificParams(categoryContext.selectedCategories),
    };

    // Execute enhanced search
    const searchResult = await this.videoService.searchVideosWithCategories(
      enhancement.enhancedQuery,
      {
        maxResults: options.maxResults || 25,
        order: options.order || 'relevance',
        autoMapCategories: true,
        confidenceThreshold: categoryContext.confidenceThreshold,
        categoryFilters: {
          learningTubeCategories: categoryContext.selectedCategories.map(c => c.id),
        }
      }
    );

    return {
      videos: searchResult.videos,
      enhancement,
      totalResults: searchResult.totalResults,
    };
  }

  /**
   * Extract keywords from category descriptions and criteria
   */
  private extractCategoryKeywords(categories: Category[]): CategoryKeywords {
    const allKeywords: CategoryKeywords = {
      primary: [],
      secondary: [],
      criteria: [],
      combined: [],
    };

    for (const category of categories) {
      // Check cache first
      let categoryKeywords = this.keywordCache.get(category.id);
      
      if (!categoryKeywords) {
        categoryKeywords = this.extractSingleCategoryKeywords(category);
        this.keywordCache.set(category.id, categoryKeywords);
      }

      // Merge keywords
      allKeywords.primary.push(...categoryKeywords.primary);
      allKeywords.secondary.push(...categoryKeywords.secondary);
      allKeywords.criteria.push(...categoryKeywords.criteria);
    }

    // Remove duplicates and create combined list
    allKeywords.primary = [...new Set(allKeywords.primary)];
    allKeywords.secondary = [...new Set(allKeywords.secondary)];
    allKeywords.criteria = [...new Set(allKeywords.criteria)];
    
    // Create relevance-weighted combined keywords
    allKeywords.combined = [
      ...allKeywords.primary.slice(0, 3), // Top 3 primary keywords
      ...allKeywords.criteria.slice(0, 2), // Top 2 criteria keywords
      ...allKeywords.secondary.slice(0, 2), // Top 2 secondary keywords
    ];

    return allKeywords;
  }

  /**
   * Extract keywords from a single category
   */
  private extractSingleCategoryKeywords(category: Category): CategoryKeywords {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
      'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
      'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
    ]);

    // Extract from category name (highest priority)
    const primary = this.extractWordsFromText(category.name, stopWords)
      .filter(word => word.length > 2)
      .slice(0, 5);

    // Extract from description
    const secondary = this.extractWordsFromText(category.description, stopWords)
      .filter(word => word.length > 3 && !primary.includes(word))
      .slice(0, 8);

    // Extract from criteria (specific learning objectives)
    const criteria = this.extractWordsFromText(category.criteria, stopWords)
      .filter(word => word.length > 3 && !primary.includes(word) && !secondary.includes(word))
      .slice(0, 6);

    return { primary, secondary, criteria, combined: [] };
  }

  /**
   * Extract meaningful words from text
   */
  private extractWordsFromText(text: string, stopWords: Set<string>): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word))
      .filter(word => !/^\d+$/.test(word)) // Remove pure numbers
      .sort((a, b) => b.length - a.length); // Prefer longer words
  }

  /**
   * Enhance search query with category keywords
   */
  private enhanceSearchQuery(
    originalQuery: string,
    categories: Category[],
    keywords: CategoryKeywords,
    shouldEnhance: boolean
  ): SearchEnhancementResult {
    if (!shouldEnhance || categories.length === 0) {
      return {
        originalQuery,
        enhancedQuery: originalQuery,
        extractedKeywords: keywords,
        appliedCategories: categories,
        strategy: 'category_filter',
      };
    }

    let enhancedQuery = originalQuery;
    let strategy: SearchEnhancementResult['strategy'] = 'keyword_boost';

    // Strategy 1: Keyword Boost - Add high-relevance keywords
    if (keywords.primary.length > 0) {
      const topKeywords = keywords.primary.slice(0, 2);
      enhancedQuery = `${originalQuery} ${topKeywords.join(' ')}`;
      strategy = 'keyword_boost';
    }

    // Strategy 2: Query Expansion - Add criteria-based terms for specific topics
    if (keywords.criteria.length > 0 && this.isSpecificQuery(originalQuery)) {
      const criteriaTerms = keywords.criteria.slice(0, 1);
      enhancedQuery = `${enhancedQuery} ${criteriaTerms.join(' ')}`;
      strategy = 'query_expansion';
    }

    // Clean up the enhanced query
    enhancedQuery = this.cleanupQuery(enhancedQuery);

    return {
      originalQuery,
      enhancedQuery,
      extractedKeywords: keywords,
      appliedCategories: categories,
      strategy,
    };
  }

  /**
   * Check if query is specific enough to benefit from expansion
   */
  private isSpecificQuery(query: string): boolean {
    const words = query.trim().split(/\s+/);
    return words.length >= 2 && words.some(word => word.length > 4);
  }

  /**
   * Clean up enhanced query
   */
  private cleanupQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 100); // Limit length for YouTube API
  }

  /**
   * Build category-specific YouTube API parameters
   */
  private buildCategorySpecificParams(categories: Category[]): Partial<YouTubeSearchOptions> {
    const params: Partial<YouTubeSearchOptions> = {};

    // Analyze categories to determine optimal search parameters
    const categoryTypes = this.analyzeCategoryTypes(categories);

    // Set duration preferences based on category types
    if (categoryTypes.includes('tutorial') || categoryTypes.includes('course')) {
      params.videoDuration = 'medium'; // 4-20 minutes for tutorials
    } else if (categoryTypes.includes('quick-tip') || categoryTypes.includes('demo')) {
      params.videoDuration = 'short'; // Under 4 minutes for quick content
    }

    // Set order preference based on category characteristics
    if (categoryTypes.includes('trending') || categoryTypes.includes('news')) {
      params.order = 'date'; // Recent content for trending topics
    } else if (categoryTypes.includes('popular') || categoryTypes.includes('beginner')) {
      params.order = 'viewCount'; // Popular content for beginners
    } else {
      params.order = 'relevance'; // Default to relevance
    }

    // Set safe search based on category content
    params.safeSearch = 'moderate';

    return params;
  }

  /**
   * Analyze category types to determine search strategy
   */
  private analyzeCategoryTypes(categories: Category[]): string[] {
    const types: string[] = [];

    for (const category of categories) {
      const text = `${category.name} ${category.description} ${category.criteria}`.toLowerCase();

      if (text.includes('tutorial') || text.includes('how to') || text.includes('guide')) {
        types.push('tutorial');
      }
      if (text.includes('beginner') || text.includes('basic') || text.includes('intro')) {
        types.push('beginner');
      }
      if (text.includes('advanced') || text.includes('expert') || text.includes('deep')) {
        types.push('advanced');
      }
      if (text.includes('quick') || text.includes('tip') || text.includes('short')) {
        types.push('quick-tip');
      }
      if (text.includes('course') || text.includes('series') || text.includes('complete')) {
        types.push('course');
      }
      if (text.includes('demo') || text.includes('example') || text.includes('showcase')) {
        types.push('demo');
      }
      if (text.includes('trending') || text.includes('latest') || text.includes('new')) {
        types.push('trending');
      }
      if (text.includes('popular') || text.includes('best') || text.includes('top')) {
        types.push('popular');
      }
    }

    return [...new Set(types)];
  }

  /**
   * Get search suggestions based on categories
   */
  getSearchSuggestions(categories: Category[], partialQuery: string = ''): string[] {
    if (categories.length === 0) return [];

    const keywords = this.extractCategoryKeywords(categories);
    const suggestions: string[] = [];

    // Generate suggestions based on category keywords
    for (const category of categories) {
      const categoryKeywords = this.keywordCache.get(category.id);
      if (categoryKeywords) {
        // Combine category name with primary keywords
        suggestions.push(`${category.name} tutorial`);
        suggestions.push(`${category.name} guide`);
        suggestions.push(`${category.name} basics`);
        
        // Add specific criteria-based suggestions
        if (categoryKeywords.criteria.length > 0) {
          suggestions.push(`${categoryKeywords.criteria[0]} ${category.name}`);
        }
      }
    }

    // Filter suggestions based on partial query
    if (partialQuery.trim()) {
      const query = partialQuery.toLowerCase();
      return suggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(query)
      ).slice(0, 5);
    }

    return suggestions.slice(0, 8);
  }

  /**
   * Clear keyword cache
   */
  clearCache(): void {
    this.keywordCache.clear();
  }
}

/**
 * Factory function to create category-based search service
 */
export function createCategoryBasedSearch(videoService: VideoService): CategoryBasedYouTubeSearch {
  return new CategoryBasedYouTubeSearch(videoService);
} 
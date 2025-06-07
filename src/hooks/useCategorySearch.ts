import { useEffect, useCallback } from 'react';
import { useCategoriesStore } from '@/store/categories';
import { useVideoSearch } from './useVideoSearch';
import { useAppStore } from '@/store';
import type { SearchOptions } from '@/types/youtube';

interface UseCategorySearchOptions {
  /**
   * Auto-search when category changes
   */
  autoSearch?: boolean;
  
  /**
   * Search options to apply
   */
  defaultSearchOptions?: Partial<SearchOptions>;
  
  /**
   * Minimum keyword confidence to include in search
   */
  keywordConfidence?: number;
}

interface CategorySearchResult {
  /**
   * Search for videos based on category keywords
   */
  searchByCategory: (categoryId: string, query?: string) => Promise<void>;
  
  /**
   * Search videos with current selected category
   */
  searchWithCurrentCategory: (query: string) => Promise<void>;
  
  /**
   * Generate search query from category keywords
   */
  generateCategoryQuery: (categoryId: string, userQuery?: string) => string;
  
  /**
   * Current category being used for search
   */
  currentSearchCategory?: string;
  
  /**
   * All video search functionality
   */
  videoSearch: ReturnType<typeof useVideoSearch>;
}

export function useCategorySearch(options: UseCategorySearchOptions = {}): CategorySearchResult {
  const {
    autoSearch = true,
    defaultSearchOptions = {},
    keywordConfidence = 0.7
  } = options;

  const { selectedCategory, categories } = useCategoriesStore();
  const { searchQuery, setSearchQuery } = useAppStore();
  const videoSearch = useVideoSearch();

  /**
   * Generate enhanced search query from category keywords
   */
  const generateCategoryQuery = useCallback((categoryId: string, userQuery?: string): string => {
    const category = getCategory(categoryId);
    
    if (!category) {
      return userQuery || '';
    }

    // Start with user query
    let enhancedQuery = userQuery || '';
    
    // Add category keywords with high relevance
    const relevantKeywords = category.keywords?.filter(keyword => 
      keyword.length > 2 && // Skip very short keywords
      !enhancedQuery.toLowerCase().includes(keyword.toLowerCase()) // Avoid duplicates
    ) || [];

    // Add top keywords to enhance search
    if (relevantKeywords.length > 0) {
      const keywordString = relevantKeywords.slice(0, 3).join(' ');
      enhancedQuery = enhancedQuery 
        ? `${enhancedQuery} ${keywordString}`
        : keywordString;
    }

    // Add category name if it's not already in the query
    if (category.name && !enhancedQuery.toLowerCase().includes(category.name.toLowerCase())) {
      enhancedQuery = enhancedQuery 
        ? `${category.name} ${enhancedQuery}`
        : category.name;
    }

    return enhancedQuery.trim();
  }, [getCategory]);

  /**
   * Search for videos based on specific category
   */
  const searchByCategory = useCallback(async (categoryId: string, query?: string) => {
    const category = getCategory(categoryId);
    
    if (!category) {
      console.warn(`Category ${categoryId} not found`);
      return;
    }

    // Generate enhanced query
    const enhancedQuery = generateCategoryQuery(categoryId, query);
    
    if (!enhancedQuery) {
      console.warn(`No search query generated for category ${categoryId}`);
      return;
    }

    // Create category-optimized search options
    const searchOptions: SearchOptions = {
      maxResults: 25,
      type: 'video',
      order: 'relevance',
      videoDuration: 'any',
      regionCode: 'US',
      relevanceLanguage: 'en',
      ...defaultSearchOptions,
    };

    // Add category-specific filters if available
    if (category.tags?.length) {
      // Use tags as additional search context
      const tagString = category.tags.slice(0, 2).join(' ');
      const finalQuery = `${enhancedQuery} ${tagString}`;
      
      await videoSearch.searchVideos(finalQuery, searchOptions);
    } else {
      await videoSearch.searchVideos(enhancedQuery, searchOptions);
    }

    // Update search query in store for consistency
    setSearchQuery(enhancedQuery);
  }, [getCategory, generateCategoryQuery, videoSearch, defaultSearchOptions, setSearchQuery]);

  /**
   * Search videos with currently selected category
   */
  const searchWithCurrentCategory = useCallback(async (query: string) => {
    if (!selectedCategory) {
      // No category selected, do regular search
      await videoSearch.searchVideos(query);
      setSearchQuery(query);
      return;
    }

    await searchByCategory(selectedCategory.id, query);
  }, [selectedCategory, searchByCategory, videoSearch, setSearchQuery]);

  /**
   * Auto-search when category changes (if enabled)
   */
  useEffect(() => {
    if (!autoSearch || !selectedCategory || !searchQuery) {
      return;
    }

    // Debounce category changes to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      searchByCategory(selectedCategory.id, searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedCategory?.id, autoSearch, searchQuery]); // Only trigger on category ID change

  /**
   * Auto-search when search query changes with selected category
   */
  useEffect(() => {
    if (!autoSearch || !searchQuery || !selectedCategory) {
      return;
    }

    // Debounce search query changes
    const timeoutId = setTimeout(() => {
      searchWithCurrentCategory(searchQuery);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, autoSearch]); // Don't include selectedCategory to avoid loops

  return {
    searchByCategory,
    searchWithCurrentCategory,
    generateCategoryQuery,
    currentSearchCategory: selectedCategory?.id,
    videoSearch,
  };
} 
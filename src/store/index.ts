import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Video, 
  UserPreferences,
  Category,
  CategorySettings,
  CategoryId,
  CategoryColor,
  UserId,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CATEGORY_DESCRIPTION_LENGTH,
  MAX_CATEGORY_CRITERIA_LENGTH
} from '../types';

// =============================================================================
// TASK_002_004: LocalStorage Persistence Configuration
// =============================================================================

/**
 * Storage keys for different data types
 */
const STORAGE_KEYS = {
  CATEGORIES: 'youtube-filter-categories',
  CATEGORY_SETTINGS: 'youtube-filter-category-settings',
  CATEGORY_SELECTIONS: 'youtube-filter-category-selections',
  CATEGORY_FILTERS: 'youtube-filter-category-filters',
  STORAGE_VERSION: 'youtube-filter-storage-version',
} as const;

/**
 * Current storage version for migration support
 */
const CURRENT_STORAGE_VERSION = '1.0.0';

/**
 * Storage data wrapper interface
 */
interface StorageData {
  version: string;
  timestamp: number;
  data: unknown;
}

/**
 * Safe localStorage operations with error handling
 */
const storage = {
  set: (key: string, value: unknown): boolean => {
    try {
      const storageData: StorageData = {
        version: CURRENT_STORAGE_VERSION,
        timestamp: Date.now(),
        data: value,
      };
      localStorage.setItem(key, JSON.stringify(storageData));
      return true;
    } catch (error) {
      console.error(`Failed to save to localStorage (${key}):`, error);
      return false;
    }
  },

  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;

      const storageData: StorageData = JSON.parse(item);
      
      // Check version compatibility
      if (storageData.version !== CURRENT_STORAGE_VERSION) {
        console.warn(`Storage version mismatch for ${key}. Expected ${CURRENT_STORAGE_VERSION}, got ${storageData.version}`);
        const migrated = migrateStorageData(key, storageData);
        return migrated !== null ? (migrated as T) : defaultValue;
      }

      return storageData.data as T;
    } catch (error) {
      console.error(`Failed to load from localStorage (${key}):`, error);
      return defaultValue;
    }
  },

  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove from localStorage (${key}):`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  },
};

/**
 * Custom serialization for branded types and Date objects
 */
const serialize = {
  categories: (categories: Category[]): Array<Record<string, unknown>> => {
    return categories.map((category) => ({
      ...category,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    }));
  },

  categorySettings: (settings: Record<CategoryId, CategorySettings>): Record<string, Record<string, unknown>> => {
    return Object.fromEntries(
      Object.entries(settings).map(([key, value]) => [
        key,
        {
          ...value,
          updatedAt: value.updatedAt.toISOString(),
        },
      ])
    );
  },
};

/**
 * Custom deserialization for branded types and Date objects
 */
const deserialize = {
  categories: (data: unknown[]): Category[] => {
    if (!Array.isArray(data)) return [];
    
    return data
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: item.id as CategoryId,
        name: item.name as string,
        description: item.description as string,
        criteria: item.criteria as string,
        color: item.color as CategoryColor,
        icon: item.icon as string | undefined,
        isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
        userId: item.userId as UserId,
        createdAt: new Date(item.createdAt as string),
        updatedAt: new Date(item.updatedAt as string),
        tags: (item.tags as string[]) || [],
        videoCount: (item.videoCount as number) || 0,
        sortOrder: (item.sortOrder as number) || 0,
        isAiSuggested: typeof item.isAiSuggested === 'boolean' ? item.isAiSuggested : false,
      }))
      .filter((category) => validateCategoryData(category));
  },

  categorySettings: (data: Record<string, unknown>): Record<CategoryId, CategorySettings> => {
    if (!data || typeof data !== 'object') return {};
    
    return Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value && typeof value === 'object')
        .map(([key, value]) => [
          key as CategoryId,
          {
            ...(value as Record<string, unknown>),
            categoryId: key as CategoryId,
            updatedAt: new Date((value as Record<string, unknown>).updatedAt as string),
          } as CategorySettings,
        ])
    );
  },
};

/**
 * Handle storage version migrations
 */
const migrateStorageData = (key: string, storageData: StorageData): unknown => {
  const { version, data } = storageData;
  
  try {
    // Migration from version 0.x to 1.0.0
    if (version.startsWith('0.')) {
      console.log(`Migrating ${key} from version ${version} to ${CURRENT_STORAGE_VERSION}`);
      
      switch (key) {
        case STORAGE_KEYS.CATEGORIES:
          return migrateCategoriesV0ToV1(data as unknown[]);
        case STORAGE_KEYS.CATEGORY_SETTINGS:
          return migrateCategorySettingsV0ToV1(data as Record<string, unknown>);
        default:
          return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Migration failed for ${key}:`, error);
    return null;
  }
};

/**
 * Migrate categories from v0 to v1
 */
const migrateCategoriesV0ToV1 = (oldData: unknown[]): Category[] => {
  if (!Array.isArray(oldData)) return [];
  
  return oldData
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: item.id as CategoryId,
      name: item.name as string,
      description: item.description as string,
      criteria: item.criteria as string,
      color: item.color as CategoryColor,
      icon: item.icon as string | undefined,
      isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
      userId: item.userId as UserId,
      // Add new fields with defaults
      tags: ((item.tags as string[]) || []),
      videoCount: ((item.videoCount as number) || 0),
      sortOrder: ((item.sortOrder as number) || 0),
      isAiSuggested: false,
      // Convert old date format if needed
      createdAt: new Date((item.createdAt || item.created) as string),
      updatedAt: new Date((item.updatedAt || item.updated || item.createdAt || item.created) as string),
    }))
    .filter((category) => validateCategoryData(category));
};

/**
 * Migrate category settings from v0 to v1
 */
const migrateCategorySettingsV0ToV1 = (oldData: Record<string, unknown>): Record<CategoryId, CategorySettings> => {
  if (!oldData || typeof oldData !== 'object') return {};
  
  return Object.fromEntries(
    Object.entries(oldData).map(([key, value]) => [
      key as CategoryId,
      {
        ...(value as Record<string, unknown>),
        categoryId: key as CategoryId,
        updatedAt: new Date(((value as Record<string, unknown>).updatedAt as string) || Date.now()),
      } as CategorySettings,
    ])
  );
};

// =============================================================================
// Local Type Definitions
// =============================================================================

/**
 * Search history item interface
 */
interface SearchHistoryItem {
  id: string;
  timestamp: number;
  query: string;
  resultCount?: number;
}

/**
 * Payload for creating a new category
 */
interface CreateCategoryPayload {
  name: string;
  description: string;
  criteria: string;
  color?: CategoryColor;
  icon?: string;
  tags?: string[];
}

/**
 * Payload for updating an existing category
 */
interface UpdateCategoryPayload {
  id: CategoryId;
  updates: Partial<Omit<Category, 'id' | 'createdAt' | 'userId'>>;
}

/**
 * Payload for bulk category updates
 */
interface BulkUpdatePayload {
  id: CategoryId;
  updates: Partial<Omit<Category, 'id' | 'createdAt' | 'userId'>>;
}

// =============================================================================
// TASK_002_003: Category Selection and Filtering Types
// =============================================================================

/**
 * Video filtering options for category-based filtering
 */
interface VideoFilterOptions {
  /** Categories to filter by (defaults to selectedCategoryIds if not provided) */
  categories?: CategoryId[];
  /** Minimum relevance threshold for AI analysis (0-1) */
  relevanceThreshold?: number;
  /** Filter mode: 'any' (OR) or 'all' (AND) logic */
  filterMode?: 'any' | 'all';
  /** Whether to include videos not assigned to any category */
  includeUnassigned?: boolean;
}

/**
 * Category statistics interface
 */
interface CategoryStats {
  /** Number of videos in this category */
  videoCount: number;
  /** Average relevance score from AI analysis */
  averageRelevanceScore: number;
  /** Timestamp of the last video added to this category */
  lastVideoAdded: number | null;
  /** Total view count of all videos in this category */
  totalViewCount: number;
}

/**
 * Category combination for saved search patterns
 */
interface CategoryCombination {
  id: string;
  name: string;
  categoryIds: CategoryId[];
  operator: 'AND' | 'OR' | 'NOT';
  description: string;
  createdAt: Date;
}

// =============================================================================
// Category State Interface
// =============================================================================

/**
 * Category-related filter interface for searching and organizing categories
 */
interface CategoryFilters {
  /** Search query for category names, descriptions, and tags */
  searchQuery: string;
  /** Field to sort categories by */
  sortBy: 'name' | 'createdAt' | 'videoCount';
  /** Sort order direction */
  sortOrder: 'asc' | 'desc';
  /** Whether to show inactive categories in the UI */
  showInactive: boolean;
}

/**
 * TASK_002_004: Persistence state interface
 */
interface PersistenceState {
  /** Loading state during hydration */
  isHydrating: boolean;
  /** Persistence error message */
  persistenceError: string | null;
  /** Last successful save timestamp */
  lastSaved: Date | null;
}

/**
 * TASK_002_004: Persistence actions interface
 */
interface PersistenceActions {
  /** Load data from localStorage */
  loadFromStorage: () => Promise<void>;
  /** Save current state to localStorage */
  saveToStorage: () => Promise<void>;
  /** Clear all localStorage data */
  clearStorage: () => Promise<void>;
  /** Export data as JSON string */
  exportData: () => string;
  /** Import data from JSON string */
  importData: (data: string) => Promise<boolean>;
}

/**
 * Category state interface containing all category-related state
 */
interface CategoryState {
  // Categories data
  /** Array of all user categories */
  categories: Category[];
  /** User-specific settings for each category, keyed by category ID */
  categorySettings: Record<CategoryId, CategorySettings>;
  
  // Selection and filtering state (TASK_002_003)
  /** Array of currently selected category IDs for multi-select operations */
  selectedCategoryIds: CategoryId[];
  /** Currently active single category ID, null if none or multi-select */
  activeCategoryId: CategoryId | null;
  /** Saved category combinations for complex filtering */
  categoryCombinations: CategoryCombination[];
  
  // UI state
  /** Current filter and search configuration for categories */
  categoryFilters: CategoryFilters;
  
  // Loading states
  /** Global loading state for category operations */
  categoriesLoading: boolean;
  /** Individual category operation loading states, keyed by category ID */
  categoryOperationLoading: Record<CategoryId, boolean>;
}

/**
 * Category actions interface for CRUD operations
 */
interface CategoryActions {
  // Create operations
  createCategory: (payload: CreateCategoryPayload) => Promise<CategoryId>;
  
  // Update operations
  updateCategory: (payload: UpdateCategoryPayload) => Promise<void>;
  
  // Delete operations
  deleteCategory: (categoryId: CategoryId) => Promise<void>;
  
  // Bulk operations
  bulkUpdateCategories: (updates: BulkUpdatePayload[]) => Promise<void>;
  bulkDeleteCategories: (categoryIds: CategoryId[]) => Promise<void>;
  
  // Category settings operations
  updateCategorySettings: (categoryId: CategoryId, settings: Partial<CategorySettings>) => void;
  getCategorySettings: (categoryId: CategoryId) => CategorySettings | null;
  
  // Utility operations
  getCategoryById: (categoryId: CategoryId) => Category | null;
  validateCategory: (category: Partial<Category>) => boolean;
}

/**
 * TASK_002_003: Category selection and filtering actions interface
 */
interface CategorySelectionActions {
  // Single category selection
  setActiveCategory: (categoryId: CategoryId | null) => void;
  
  // Multi-category selection
  toggleCategorySelection: (categoryId: CategoryId) => void;
  selectCategories: (categoryIds: CategoryId[]) => void;
  clearCategorySelection: () => void;
  
  // Video filtering
  getFilteredVideos: (options?: VideoFilterOptions) => Video[];
  
  // Category statistics and insights
  getCategoryStats: () => Record<CategoryId, CategoryStats>;
  
  // Advanced filtering
  updateCategoryFilters: (filters: Partial<CategoryFilters>) => void;
  getFilteredCategories: () => Category[];
  
  // Smart suggestions
  getSuggestedCategories: (video: Video) => Array<{ category: Category; score: number }>;
  
  // Category combinations
  saveCategoryCombination: (combination: Omit<CategoryCombination, 'id' | 'createdAt'>) => string;
  applyCategoryCombination: (combinationId: string) => void;
  deleteCategoryCombination: (combinationId: string) => void;
  
  // Computed getters
  getSelectedCategories: () => Category[];
  getActiveCategory: () => Category | null;
  hasSelectedCategories: () => boolean;
  getFilteredVideoCount: () => number;
}

// =============================================================================
// TASK_002_005: Category Search and Sorting Types and Interfaces
// =============================================================================

/**
 * Saved search interface for reusable category searches
 */
interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: CategorySearchFilters;
  createdAt: Date;
}

/**
 * Category group interface for organizing categories
 */
interface CategoryGroup {
  id: string;
  name: string;
  description: string;
  categoryIds: CategoryId[];
  color: CategoryColor;
  icon?: string;
}

/**
 * Advanced search filters for category searches
 */
interface CategorySearchFilters {
  colors?: CategoryColor[];
  isActive?: boolean;
  hasVideos?: boolean;
  isAiSuggested?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  videoCountRange?: {
    min: number;
    max: number;
  };
}

/**
 * Category search state interface containing all search-related state
 */
interface CategorySearchState {
  // Search state
  categorySearchQuery: string;
  categorySearchHistory: string[];
  savedSearches: SavedSearch[];
  searchResults: CategoryId[];
  
  // Search configuration
  searchOptions: {
    fuzzyMatching: boolean;
    searchFields: ('name' | 'description' | 'tags' | 'criteria')[];
    caseSensitive: boolean;
    maxResults: number;
  };
  
  // Organization features
  favoriteCategories: CategoryId[];
  categoryGroups: CategoryGroup[];
  recentlyUsed: CategoryId[];
}

/**
 * Sort option configuration for category sorting
 */
interface SortOption {
  field: 'name' | 'createdAt' | 'updatedAt' | 'videoCount' | 'relevance' | 'usage';
  direction: 'asc' | 'desc';
  label: string;
}

/**
 * Search analytics interface for search insights
 */
interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  mostSearchedTerms: Array<{ term: string; count: number }>;
  savedSearchCount: number;
  favoriteCount: number;
  groupCount: number;
}

/**
 * Category search and sorting actions interface
 */
interface CategorySearchActions {
  // Advanced search operations
  searchCategories: (query: string, filters?: CategorySearchFilters) => CategoryId[];
  
  // Sorting operations
  sortCategories: (sortOption: SortOption) => Category[];
  
  // Category organization
  createCategoryGroup: (group: Omit<CategoryGroup, 'id'>) => string;
  addCategoryToGroup: (categoryId: CategoryId, groupId: string) => void;
  removeCategoryFromGroup: (categoryId: CategoryId, groupId: string) => void;
  deleteCategoryGroup: (groupId: string) => void;
  
  // Favorite categories management
  toggleFavoriteCategory: (categoryId: CategoryId) => void;
  
  // Recently used categories tracking
  trackCategoryUsage: (categoryId: CategoryId) => void;
  
  // Saved searches
  saveSearch: (name: string, query: string, filters?: CategorySearchFilters) => string;
  executeSavedSearch: (searchId: string) => CategoryId[];
  deleteSavedSearch: (searchId: string) => void;
  
  // Search utilities
  clearSearch: () => void;
  updateSearchOptions: (options: Partial<CategorySearchState['searchOptions']>) => void;
  getSearchSuggestions: (partialQuery: string) => string[];
  getSearchAnalytics: () => SearchAnalytics;
}

/**
 * Available sort options for categories
 */
export const SORT_OPTIONS: SortOption[] = [
  { field: 'name', direction: 'asc', label: 'Name (A-Z)' },
  { field: 'name', direction: 'desc', label: 'Name (Z-A)' },
  { field: 'createdAt', direction: 'desc', label: 'Recently Created' },
  { field: 'createdAt', direction: 'asc', label: 'Oldest First' },
  { field: 'updatedAt', direction: 'desc', label: 'Recently Modified' },
  { field: 'videoCount', direction: 'desc', label: 'Most Videos' },
  { field: 'videoCount', direction: 'asc', label: 'Least Videos' },
  { field: 'usage', direction: 'desc', label: 'Most Used' },
  { field: 'relevance', direction: 'desc', label: 'Most Relevant' },
];

/**
 * Default search options configuration
 */
const DEFAULT_SEARCH_OPTIONS: CategorySearchState['searchOptions'] = {
  fuzzyMatching: true,
  searchFields: ['name', 'description', 'tags', 'criteria'],
  caseSensitive: false,
  maxResults: 50,
};

/**
 * Initial category search state
 */
const INITIAL_CATEGORY_SEARCH_STATE: CategorySearchState = {
  categorySearchQuery: '',
  categorySearchHistory: [],
  savedSearches: [],
  searchResults: [],
  searchOptions: DEFAULT_SEARCH_OPTIONS,
  favoriteCategories: [],
  categoryGroups: [],
  recentlyUsed: [],
};

// =============================================================================
// TASK_002_005: Utility Functions for Search and Sorting
// =============================================================================

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Calculate fuzzy string matching score
 */
const calculateFuzzyScore = (text: string, query: string): number => {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (textLower.includes(queryLower)) return 1;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(textLower, queryLower);
  const maxLength = Math.max(textLower.length, queryLower.length);
  
  return Math.max(0, 1 - distance / maxLength);
};

/**
 * Calculate search relevance score for a category
 */
const calculateSearchScore = (
  category: Category, 
  query: string, 
  options: CategorySearchState['searchOptions'],
  state: CategorySearchState
): number => {
  let score = 0;
  const fields = options.searchFields;
  const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();

  // Exact matches get highest priority
  if (fields.includes('name')) {
    const name = options.caseSensitive ? category.name : category.name.toLowerCase();
    if (name.includes(normalizedQuery)) {
      score += name === normalizedQuery ? 100 : 50;
    }
  }

  if (fields.includes('description')) {
    const description = options.caseSensitive ? category.description : category.description.toLowerCase();
    if (description.includes(normalizedQuery)) {
      score += 30;
    }
  }

  if (fields.includes('tags') && category.tags?.length) {
    const tagMatch = category.tags.some(tag => {
      const normalizedTag = options.caseSensitive ? tag : tag.toLowerCase();
      return normalizedTag.includes(normalizedQuery);
    });
    if (tagMatch) {
      score += 20;
    }
  }

  if (fields.includes('criteria')) {
    const criteria = options.caseSensitive ? category.criteria : category.criteria.toLowerCase();
    if (criteria.includes(normalizedQuery)) {
      score += 15;
    }
  }

  // Fuzzy matching for partial matches
  if (options.fuzzyMatching && score === 0) {
    score += calculateFuzzyScore(category.name, query) * 10;
  }

  // Boost score for frequently used categories
  if (state.recentlyUsed.includes(category.id)) {
    score += 5;
  }

  if (state.favoriteCategories.includes(category.id)) {
    score += 10;
  }

  return score;
};

/**
 * Generate unique search ID
 */
const generateSearchId = (): string => {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique group ID
 */
const generateGroupId = (): string => {
  return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get most frequent items from an array
 */
const getMostFrequent = <T>(array: T[], count: number): Array<{ term: T; count: number }> => {
  const frequency = new Map<T, number>();
  
  array.forEach(item => {
    frequency.set(item, (frequency.get(item) || 0) + 1);
  });
  
  return Array.from(frequency.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
};

// =============================================================================
// Extended App State Interface
// =============================================================================

/**
 * Main application state interface extending the original state with category functionality
 */
interface AppState extends CategoryState, CategoryActions, CategorySelectionActions, CategorySearchState, CategorySearchActions, PersistenceState, PersistenceActions {
  // Existing search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;

  // Existing video results
  videos: Video[];
  setVideos: (videos: Video[]) => void;
  
  // Existing search history
  searchHistory: SearchHistoryItem[];
  addToSearchHistory: (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => void;
  clearSearchHistory: () => void;
  
  // Existing user preferences
  userPreferences: UserPreferences;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
}

// =============================================================================
// Default Values and Constants
// =============================================================================

/**
 * Default relevance threshold for AI analysis
 */
const DEFAULT_RELEVANCE_THRESHOLD = 0.7;

/**
 * Default category filter configuration
 */
const DEFAULT_CATEGORY_FILTERS: CategoryFilters = {
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  showInactive: false,
};

/**
 * Initial category state with empty values
 */
const INITIAL_CATEGORY_STATE: CategoryState = {
  // Categories data
  categories: [],
  categorySettings: {},
  
  // Selection and filtering state
  selectedCategoryIds: [],
  activeCategoryId: null,
  categoryCombinations: [],
  
  // UI state
  categoryFilters: DEFAULT_CATEGORY_FILTERS,
  
  // Loading states
  categoriesLoading: false,
  categoryOperationLoading: {},
};

/**
 * Initial persistence state
 */
const INITIAL_PERSISTENCE_STATE: PersistenceState = {
  isHydrating: false,
  persistenceError: null,
  lastSaved: null,
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique category ID
 */
const generateCategoryId = (): CategoryId => {
  return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as CategoryId;
};

/**
 * Generate a unique combination ID
 */
const generateCombinationId = (): string => {
  return `comb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get current user ID (placeholder for actual implementation)
 * TODO: Replace with actual user ID retrieval
 */
const getCurrentUserId = (): UserId => {
  return 'temp_user' as UserId;
};

/**
 * Validate category data
 */
const validateCategoryData = (category: Partial<Category>): boolean => {
  if (!category.name || category.name.trim().length === 0) return false;
  if (!category.description || category.description.trim().length === 0) return false;
  if (!category.criteria || category.criteria.trim().length === 0) return false;
  if (category.name.length > MAX_CATEGORY_NAME_LENGTH) return false;
  if (category.description.length > MAX_CATEGORY_DESCRIPTION_LENGTH) return false;
  if (category.criteria.length > MAX_CATEGORY_CRITERIA_LENGTH) return false;
  return true;
};

/**
 * Create default category settings
 */
const createDefaultCategorySettings = (categoryId: CategoryId): CategorySettings => {
  return {
    categoryId,
    relevanceThreshold: 0.7,
    autoAssign: false,
    notifications: true,
    sortOrder: 0,
    viewMode: 'grid' as const,
    showInNavigation: true,
    includeInDigest: true,
    maxVideosInFeed: 10,
    updatedAt: new Date(),
  };
};

/**
 * Auto-save debounce timer
 */
let autoSaveTimeout: number | null = null;
const AUTO_SAVE_DELAY = 1000; // 1 second debounce

/**
 * Trigger debounced auto-save
 */
const triggerAutoSave = (saveFunction: () => Promise<void>) => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(() => {
    saveFunction().catch((error) => {
      console.error('Auto-save failed:', error);
    });
  }, AUTO_SAVE_DELAY);
};

// =============================================================================
// Zustand Store with Persistence
// =============================================================================

/**
 * Main application store with comprehensive category management and persistence
 * 
 * Integrates existing functionality with category CRUD, filtering, selection,
 * and localStorage persistence with proper serialization and error handling.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // =============================================================================
      // Existing State (unchanged)
      // =============================================================================
      
      // Search state
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      isSearching: false,
      setIsSearching: (isSearching) => set({ isSearching }),

      // Video results
      videos: [],
      setVideos: (videos) => set({ videos }),
      
      // Search history
      searchHistory: [],
      addToSearchHistory: (item) => set((state) => ({
        searchHistory: [
          {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            ...item,
          },
          ...state.searchHistory.slice(0, 9), // Keep only the 10 most recent searches
        ],
      })),
      clearSearchHistory: () => set({ searchHistory: [] }),
      
      // User preferences
      userPreferences: {
        theme: 'light',
        resultCount: 10,
        autoplay: false,
      },
      updateUserPreferences: (preferences) => set((state) => ({
        userPreferences: {
          ...state.userPreferences,
          ...preferences,
        },
      })),

      // =============================================================================
      // Category State (from previous tasks)
      // =============================================================================
      
      // Categories data
      categories: INITIAL_CATEGORY_STATE.categories,
      categorySettings: INITIAL_CATEGORY_STATE.categorySettings,
      
      // Selection and filtering state
      selectedCategoryIds: INITIAL_CATEGORY_STATE.selectedCategoryIds,
      activeCategoryId: INITIAL_CATEGORY_STATE.activeCategoryId,
      categoryCombinations: INITIAL_CATEGORY_STATE.categoryCombinations,
      
      // UI state
      categoryFilters: INITIAL_CATEGORY_STATE.categoryFilters,
      
      // Loading states
      categoriesLoading: INITIAL_CATEGORY_STATE.categoriesLoading,
      categoryOperationLoading: INITIAL_CATEGORY_STATE.categoryOperationLoading,

      // =============================================================================
      // TASK_002_005: Category Search State
      // =============================================================================
      
      // Search state
      categorySearchQuery: INITIAL_CATEGORY_SEARCH_STATE.categorySearchQuery,
      categorySearchHistory: INITIAL_CATEGORY_SEARCH_STATE.categorySearchHistory,
      savedSearches: INITIAL_CATEGORY_SEARCH_STATE.savedSearches,
      searchResults: INITIAL_CATEGORY_SEARCH_STATE.searchResults,
      
      // Search configuration
      searchOptions: INITIAL_CATEGORY_SEARCH_STATE.searchOptions,
      
      // Organization features
      favoriteCategories: INITIAL_CATEGORY_SEARCH_STATE.favoriteCategories,
      categoryGroups: INITIAL_CATEGORY_SEARCH_STATE.categoryGroups,
      recentlyUsed: INITIAL_CATEGORY_SEARCH_STATE.recentlyUsed,

      // =============================================================================
      // TASK_002_004: Persistence State
      // =============================================================================
      
      isHydrating: INITIAL_PERSISTENCE_STATE.isHydrating,
      persistenceError: INITIAL_PERSISTENCE_STATE.persistenceError,
      lastSaved: INITIAL_PERSISTENCE_STATE.lastSaved,

      // =============================================================================
      // Category CRUD Actions (from TASK_002_002)
      // =============================================================================

      /**
       * Create a new category with validation and auto-save
       */
      createCategory: async (payload: CreateCategoryPayload): Promise<CategoryId> => {
        const categoryId = generateCategoryId();
        const now = new Date();
        const currentState = get();
        
        const newCategory: Category = {
          id: categoryId,
          name: payload.name.trim(),
          description: payload.description.trim(),
          criteria: payload.criteria.trim(),
          color: payload.color || 'blue',
          icon: payload.icon,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          userId: getCurrentUserId(),
          videoCount: 0,
          tags: payload.tags || [],
          sortOrder: currentState.categories.length,
          isAiSuggested: false,
        };

        // Validation
        if (!validateCategoryData(newCategory)) {
          throw new Error('Invalid category data');
        }

        // Create default settings for the new category
        const defaultSettings = createDefaultCategorySettings(categoryId);

        set((state) => ({
          categories: [...state.categories, newCategory],
          categorySettings: {
            ...state.categorySettings,
            [categoryId]: defaultSettings,
          },
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);

        return categoryId;
      },

      /**
       * Update an existing category with auto-save
       */
      updateCategory: async (payload: UpdateCategoryPayload): Promise<void> => {
        const { id, updates } = payload;
        
        // Set loading state
        set((state) => ({
          categoryOperationLoading: {
            ...state.categoryOperationLoading,
            [id]: true,
          },
        }));

        try {
          // Validate updates if they include validation fields
          if (updates.name || updates.description || updates.criteria) {
            const tempCategory = {
              name: updates.name || '',
              description: updates.description || '',
              criteria: updates.criteria || '',
            };
            
            if (updates.name && !validateCategoryData(tempCategory)) {
              throw new Error('Invalid category data');
            }
          }

          set((state) => ({
            categories: state.categories.map((category) =>
              category.id === id
                ? {
                    ...category,
                    ...updates,
                    updatedAt: new Date(),
                  }
                : category
            ),
            categoryOperationLoading: {
              ...state.categoryOperationLoading,
              [id]: false,
            },
          }));

          // Trigger auto-save
          triggerAutoSave(get().saveToStorage);
        } catch (error) {
          set((state) => ({
            categoryOperationLoading: {
              ...state.categoryOperationLoading,
              [id]: false,
            },
          }));
          throw error;
        }
      },

      /**
       * Delete a category with cleanup and auto-save
       */
      deleteCategory: async (categoryId: CategoryId): Promise<void> => {
        // Set loading state
        set((state) => ({
          categoryOperationLoading: {
            ...state.categoryOperationLoading,
            [categoryId]: true,
          },
        }));

        try {
          set((state) => ({
            // Remove category from categories array
            categories: state.categories.filter((category) => category.id !== categoryId),
            
            // Remove category settings
            categorySettings: Object.fromEntries(
              Object.entries(state.categorySettings).filter(([key]) => key !== categoryId)
            ),
            
            // Remove from selected categories
            selectedCategoryIds: state.selectedCategoryIds.filter((id) => id !== categoryId),
            
            // Clear active category if it was the deleted one
            activeCategoryId: state.activeCategoryId === categoryId ? null : state.activeCategoryId,
            
            // Remove from operation loading
            categoryOperationLoading: Object.fromEntries(
              Object.entries(state.categoryOperationLoading).filter(([key]) => key !== categoryId)
            ),
          }));

          // Trigger auto-save
          triggerAutoSave(get().saveToStorage);
        } catch (error) {
          set((state) => ({
            categoryOperationLoading: {
              ...state.categoryOperationLoading,
              [categoryId]: false,
            },
          }));
          throw error;
        }
      },

      /**
       * Bulk update multiple categories with auto-save
       */
      bulkUpdateCategories: async (updates: BulkUpdatePayload[]): Promise<void> => {
        set(() => ({
          categoriesLoading: true,
        }));

        try {
          set((state) => ({
            categories: state.categories.map((category) => {
              const update = updates.find((u) => u.id === category.id);
              return update
                ? { ...category, ...update.updates, updatedAt: new Date() }
                : category;
            }),
            categoriesLoading: false,
          }));

          // Trigger auto-save
          triggerAutoSave(get().saveToStorage);
        } catch (error) {
          set(() => ({ categoriesLoading: false }));
          throw error;
        }
      },

      /**
       * Bulk delete multiple categories with auto-save
       */
      bulkDeleteCategories: async (categoryIds: CategoryId[]): Promise<void> => {
        set(() => ({
          categoriesLoading: true,
        }));

        try {
          set((state) => ({
            categories: state.categories.filter((category) => !categoryIds.includes(category.id)),
            categorySettings: Object.fromEntries(
              Object.entries(state.categorySettings).filter(([key]) => !categoryIds.includes(key as CategoryId))
            ),
            selectedCategoryIds: state.selectedCategoryIds.filter((id) => !categoryIds.includes(id)),
            activeCategoryId: categoryIds.includes(state.activeCategoryId!) ? null : state.activeCategoryId,
            categoriesLoading: false,
          }));

          // Trigger auto-save
          triggerAutoSave(get().saveToStorage);
        } catch (error) {
          set(() => ({ categoriesLoading: false }));
          throw error;
        }
      },

      /**
       * Update category settings with auto-save
       */
      updateCategorySettings: (
        categoryId: CategoryId, 
        settings: Partial<CategorySettings>
      ): void => {
        set((state) => ({
          categorySettings: {
            ...state.categorySettings,
            [categoryId]: {
              ...state.categorySettings[categoryId],
              ...settings,
              categoryId, // Ensure categoryId is always set
              updatedAt: new Date(),
            },
          },
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Get category settings by ID
       */
      getCategorySettings: (categoryId: CategoryId): CategorySettings | null => {
        const state = get();
        return state.categorySettings[categoryId] || null;
      },

      /**
       * Get category by ID
       */
      getCategoryById: (categoryId: CategoryId): Category | null => {
        const state = get();
        return state.categories.find((category) => category.id === categoryId) || null;
      },

      /**
       * Validate category data
       */
      validateCategory: (category: Partial<Category>): boolean => {
        return validateCategoryData(category);
      },

      // =============================================================================
      // Category Selection and Filtering Actions (from TASK_002_003)
      // =============================================================================

      /**
       * Set active category with auto-save
       */
      setActiveCategory: (categoryId: CategoryId | null): void => {
        set(() => ({
          activeCategoryId: categoryId,
          selectedCategoryIds: categoryId ? [categoryId] : [],
        }));

        // Trigger auto-save for selections
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Toggle category selection with auto-save
       */
      toggleCategorySelection: (categoryId: CategoryId): void => {
        set((state) => ({
          selectedCategoryIds: state.selectedCategoryIds.includes(categoryId)
            ? state.selectedCategoryIds.filter((id) => id !== categoryId)
            : [...state.selectedCategoryIds, categoryId],
          activeCategoryId: null,
        }));

        // Trigger auto-save for selections
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Select multiple categories with auto-save
       */
      selectCategories: (categoryIds: CategoryId[]): void => {
        set(() => ({
          selectedCategoryIds: [...new Set(categoryIds)],
          activeCategoryId: categoryIds.length === 1 ? categoryIds[0] : null,
        }));

        // Trigger auto-save for selections
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Clear all category selections with auto-save
       */
      clearCategorySelection: (): void => {
        set(() => ({
          selectedCategoryIds: [],
          activeCategoryId: null,
        }));

        // Trigger auto-save for selections
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Get filtered videos based on selected categories and options
       */
      getFilteredVideos: (options: VideoFilterOptions = {}): Video[] => {
        const state = get();
        const {
          categories = state.selectedCategoryIds,
          relevanceThreshold = DEFAULT_RELEVANCE_THRESHOLD,
          filterMode = 'any',
          includeUnassigned = false,
        } = options;

        if (categories.length === 0 && !includeUnassigned) {
          return state.videos;
        }

        return state.videos.filter((video) => {
          if (!video.categories || video.categories.length === 0) {
            return includeUnassigned;
          }

          const videoCategoryIds = video.categories.map((cat) => cat as CategoryId);
          const hasCategories = filterMode === 'all'
            ? categories.every((catId) => videoCategoryIds.includes(catId))
            : categories.some((catId) => videoCategoryIds.includes(catId));

          if (!hasCategories) return false;

          if (video.ai_analysis?.relevanceScores) {
            const relevantCategories = categories.filter((catId) => 
              (video.ai_analysis!.relevanceScores[catId] || 0) >= relevanceThreshold
            );
            
            return filterMode === 'all' 
              ? relevantCategories.length === categories.length
              : relevantCategories.length > 0;
          }

          return true;
        });
      },

      /**
       * Get category statistics and insights
       */
      getCategoryStats: (): Record<CategoryId, CategoryStats> => {
        const state = get();
        const stats: Record<CategoryId, CategoryStats> = {};

        state.categories.forEach((category) => {
          const categoryVideos = state.videos.filter((video) =>
            video.categories?.includes(category.id)
          );

          const totalRelevanceScore = categoryVideos.reduce((sum, video) => {
            return sum + (video.ai_analysis?.relevanceScores?.[category.id] || 0);
          }, 0);

          stats[category.id] = {
            videoCount: categoryVideos.length,
            averageRelevanceScore: categoryVideos.length > 0 
              ? totalRelevanceScore / categoryVideos.length 
              : 0,
            lastVideoAdded: categoryVideos.length > 0
              ? Math.max(...categoryVideos.map((v) => new Date(v.published_at).getTime()))
              : null,
            totalViewCount: categoryVideos.reduce((sum, video) => sum + video.view_count, 0),
          };
        });

        return stats;
      },

      /**
       * Update category filters with auto-save
       */
      updateCategoryFilters: (filters: Partial<CategoryFilters>): void => {
        set((state) => ({
          categoryFilters: {
            ...state.categoryFilters,
            ...filters,
          },
        }));

        // Trigger auto-save for filters
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Get filtered and sorted categories based on current filters
       */
      getFilteredCategories: (): Category[] => {
        const state = get();
        const { searchQuery, sortBy, sortOrder, showInactive } = state.categoryFilters;
        
        let filteredCategories = state.categories;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          filteredCategories = filteredCategories.filter((category) =>
            category.name.toLowerCase().includes(query) ||
            category.description.toLowerCase().includes(query) ||
            category.tags?.some((tag) => tag.toLowerCase().includes(query))
          );
        }

        if (!showInactive) {
          filteredCategories = filteredCategories.filter((category) => category.isActive);
        }

        filteredCategories.sort((a, b) => {
          let comparison = 0;
          
          switch (sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'createdAt':
              comparison = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'videoCount':
              comparison = (a.videoCount || 0) - (b.videoCount || 0);
              break;
            default:
              comparison = (a.sortOrder || 0) - (b.sortOrder || 0);
          }

          return sortOrder === 'desc' ? -comparison : comparison;
        });

        return filteredCategories;
      },

      /**
       * Get smart category suggestions for a video based on AI analysis
       */
      getSuggestedCategories: (video: Video): Array<{ category: Category; score: number }> => {
        const state = get();
        
        if (!video.ai_analysis?.relevanceScores) {
          return [];
        }

        return state.categories
          .map((category) => ({
            category,
            score: video.ai_analysis!.relevanceScores![category.id] || 0,
          }))
          .filter((item) => item.score > 0.5)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      },

      /**
       * Save a category combination for reuse with auto-save
       */
      saveCategoryCombination: (combination: Omit<CategoryCombination, 'id' | 'createdAt'>): string => {
        const id = generateCombinationId();
        const newCombination: CategoryCombination = { 
          ...combination, 
          id, 
          createdAt: new Date() 
        };
        
        set((state) => ({
          categoryCombinations: [...state.categoryCombinations, newCombination],
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
        
        return id;
      },

      /**
       * Apply a saved category combination
       */
      applyCategoryCombination: (combinationId: string): void => {
        const state = get();
        const combination = state.categoryCombinations.find((c) => c.id === combinationId);
        
        if (combination) {
          set(() => ({
            selectedCategoryIds: combination.categoryIds,
            activeCategoryId: null,
          }));

          // Trigger auto-save for selections
          triggerAutoSave(get().saveToStorage);
        }
      },

      /**
       * Delete a saved category combination with auto-save
       */
      deleteCategoryCombination: (combinationId: string): void => {
        set((state) => ({
          categoryCombinations: state.categoryCombinations.filter((c) => c.id !== combinationId),
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Get currently selected categories
       */
      getSelectedCategories: (): Category[] => {
        const state = get();
        return state.categories.filter((cat) => 
          state.selectedCategoryIds.includes(cat.id)
        );
      },

      /**
       * Get the active category
       */
      getActiveCategory: (): Category | null => {
        const state = get();
        return state.activeCategoryId 
          ? state.categories.find((cat) => cat.id === state.activeCategoryId) || null
          : null;
      },

      /**
       * Check if any categories are selected
       */
      hasSelectedCategories: (): boolean => {
        return get().selectedCategoryIds.length > 0;
      },

      /**
       * Get the count of filtered videos
       */
      getFilteredVideoCount: (): number => {
        return get().getFilteredVideos().length;
      },

      // =============================================================================
      // TASK_002_005: Category Search and Sorting Actions
      // =============================================================================

      /**
       * Advanced category search with fuzzy matching and filters
       */
      searchCategories: (query: string, filters?: CategorySearchFilters): CategoryId[] => {
        const state = get();
        
        if (!query.trim() && !filters) {
          return state.categories.map(c => c.id);
        }

        const searchOptions = state.searchOptions;
        const normalizedQuery = searchOptions.caseSensitive 
          ? query.trim() 
          : query.trim().toLowerCase();

        let results = state.categories.filter((category) => {
          // Apply text search
          if (normalizedQuery) {
            const matchScore = calculateSearchScore(category, normalizedQuery, searchOptions, state);
            if (matchScore === 0) return false;
          }

          // Apply filters
          if (filters) {
            if (filters.colors && !filters.colors.includes(category.color || 'blue')) return false;
            if (filters.isActive !== undefined && category.isActive !== filters.isActive) return false;
            if (filters.hasVideos !== undefined) {
              const hasVideos = (category.videoCount || 0) > 0;
              if (hasVideos !== filters.hasVideos) return false;
            }
            if (filters.isAiSuggested !== undefined && category.isAiSuggested !== filters.isAiSuggested) return false;
            
            if (filters.dateRange) {
              const createdAt = category.createdAt.getTime();
              if (createdAt < filters.dateRange.start.getTime() || 
                  createdAt > filters.dateRange.end.getTime()) return false;
            }
            
            if (filters.videoCountRange) {
              const videoCount = category.videoCount || 0;
              if (videoCount < filters.videoCountRange.min || 
                  videoCount > filters.videoCountRange.max) return false;
            }
          }

          return true;
        });

        // Sort by relevance if searching
        if (normalizedQuery) {
          results.sort((a, b) => {
            const scoreA = calculateSearchScore(a, normalizedQuery, searchOptions, state);
            const scoreB = calculateSearchScore(b, normalizedQuery, searchOptions, state);
            return scoreB - scoreA;
          });
        }

        // Limit results
        results = results.slice(0, searchOptions.maxResults);

        // Update search state
        set((prevState) => ({
          searchResults: results.map(c => c.id),
          categorySearchHistory: normalizedQuery 
            ? [...new Set([normalizedQuery, ...prevState.categorySearchHistory])].slice(0, 10)
            : prevState.categorySearchHistory,
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);

        return results.map(c => c.id);
      },

      /**
       * Sort categories with advanced options
       */
      sortCategories: (sortOption: SortOption): Category[] => {
        const state = get();
        const categories = [...state.categories];

        categories.sort((a, b) => {
          let comparison = 0;

          switch (sortOption.field) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'createdAt':
              comparison = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'updatedAt':
              comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
              break;
            case 'videoCount':
              comparison = (a.videoCount || 0) - (b.videoCount || 0);
              break;
            case 'usage': {
              const usageA = state.recentlyUsed.indexOf(a.id);
              const usageB = state.recentlyUsed.indexOf(b.id);
              comparison = (usageA === -1 ? 999 : usageA) - (usageB === -1 ? 999 : usageB);
              break;
            }
            case 'relevance': {
              // Use current search query for relevance scoring
              if (state.categorySearchQuery) {
                const scoreA = calculateSearchScore(a, state.categorySearchQuery, state.searchOptions, state);
                const scoreB = calculateSearchScore(b, state.categorySearchQuery, state.searchOptions, state);
                comparison = scoreA - scoreB;
              } else {
                comparison = 0;
              }
              break;
            }
          }

          return sortOption.direction === 'desc' ? -comparison : comparison;
        });

        return categories;
      },

      /**
       * Create a category group
       */
      createCategoryGroup: (group: Omit<CategoryGroup, 'id'>): string => {
        const groupId = generateGroupId();
        const newGroup: CategoryGroup = {
          ...group,
          id: groupId,
        };

        set((state) => ({
          categoryGroups: [...state.categoryGroups, newGroup],
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);

        return groupId;
      },

      /**
       * Add category to group
       */
      addCategoryToGroup: (categoryId: CategoryId, groupId: string): void => {
        set((state) => ({
          categoryGroups: state.categoryGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  categoryIds: [...new Set([...group.categoryIds, categoryId])],
                }
              : group
          ),
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Remove category from group
       */
      removeCategoryFromGroup: (categoryId: CategoryId, groupId: string): void => {
        set((state) => ({
          categoryGroups: state.categoryGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  categoryIds: group.categoryIds.filter(id => id !== categoryId),
                }
              : group
          ),
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Delete a category group
       */
      deleteCategoryGroup: (groupId: string): void => {
        set((state) => ({
          categoryGroups: state.categoryGroups.filter((group) => group.id !== groupId),
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Toggle favorite category
       */
      toggleFavoriteCategory: (categoryId: CategoryId): void => {
        set((state) => ({
          favoriteCategories: state.favoriteCategories.includes(categoryId)
            ? state.favoriteCategories.filter((id) => id !== categoryId)
            : [...state.favoriteCategories, categoryId],
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Track category usage for recent categories
       */
      trackCategoryUsage: (categoryId: CategoryId): void => {
        set((state) => ({
          recentlyUsed: [
            categoryId,
            ...state.recentlyUsed.filter((id) => id !== categoryId),
          ].slice(0, 20), // Keep only last 20
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Save a search for reuse
       */
      saveSearch: (name: string, query: string, filters?: CategorySearchFilters): string => {
        const searchId = generateSearchId();
        const savedSearch: SavedSearch = {
          id: searchId,
          name,
          query,
          filters: filters || {},
          createdAt: new Date(),
        };

        set((state) => ({
          savedSearches: [...state.savedSearches, savedSearch],
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);

        return searchId;
      },

      /**
       * Execute a saved search
       */
      executeSavedSearch: (searchId: string): CategoryId[] => {
        const state = get();
        const savedSearch = state.savedSearches.find((s) => s.id === searchId);
        
        if (!savedSearch) return [];
        
        return state.searchCategories(savedSearch.query, savedSearch.filters);
      },

      /**
       * Delete a saved search
       */
      deleteSavedSearch: (searchId: string): void => {
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== searchId),
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Clear search state
       */
      clearSearch: (): void => {
        set(() => ({
          categorySearchQuery: '',
          searchResults: [],
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Update search options
       */
      updateSearchOptions: (options: Partial<CategorySearchState['searchOptions']>): void => {
        set((state) => ({
          searchOptions: {
            ...state.searchOptions,
            ...options,
          },
        }));

        // Trigger auto-save
        triggerAutoSave(get().saveToStorage);
      },

      /**
       * Get search suggestions based on partial query
       */
      getSearchSuggestions: (partialQuery: string): string[] => {
        const state = get();
        const suggestions = new Set<string>();

        // Add from search history
        state.categorySearchHistory
          .filter((query) => query.toLowerCase().includes(partialQuery.toLowerCase()))
          .forEach((query) => suggestions.add(query));

        // Add from category names
        state.categories
          .filter((cat) => cat.name.toLowerCase().includes(partialQuery.toLowerCase()))
          .forEach((cat) => suggestions.add(cat.name));

        // Add from tags
        state.categories
          .flatMap((cat) => cat.tags || [])
          .filter((tag) => tag.toLowerCase().includes(partialQuery.toLowerCase()))
          .forEach((tag) => suggestions.add(tag));

        return Array.from(suggestions).slice(0, 10);
      },

      /**
       * Get search analytics
       */
      getSearchAnalytics: (): SearchAnalytics => {
        const state = get();
        
        return {
          totalSearches: state.categorySearchHistory.length,
          uniqueQueries: new Set(state.categorySearchHistory).size,
          mostSearchedTerms: getMostFrequent(state.categorySearchHistory, 5),
          savedSearchCount: state.savedSearches.length,
          favoriteCount: state.favoriteCategories.length,
          groupCount: state.categoryGroups.length,
        };
      },

      // =============================================================================
      // TASK_002_004: Persistence Actions
      // =============================================================================

      /**
       * Load data from localStorage with error handling
       */
      loadFromStorage: async (): Promise<void> => {
        set(() => ({ isHydrating: true, persistenceError: null }));

        try {
          // Load categories
          const categoriesData = storage.get(STORAGE_KEYS.CATEGORIES, []);
          const categories = deserialize.categories(categoriesData);

          // Load category settings
          const settingsData = storage.get(STORAGE_KEYS.CATEGORY_SETTINGS, {});
          const categorySettings = deserialize.categorySettings(settingsData);

          // Load category selections
          const selections = storage.get(STORAGE_KEYS.CATEGORY_SELECTIONS, {
            selectedCategoryIds: [],
            activeCategoryId: null,
          });

          // Load category filters
          const filters = storage.get(STORAGE_KEYS.CATEGORY_FILTERS, DEFAULT_CATEGORY_FILTERS);

          set(() => ({
            categories,
            categorySettings,
            selectedCategoryIds: selections.selectedCategoryIds.map((id: string) => id as CategoryId),
            activeCategoryId: selections.activeCategoryId as CategoryId | null,
            categoryFilters: filters,
            isHydrating: false,
            lastSaved: new Date(),
          }));

          console.log('Successfully loaded data from localStorage');
        } catch (error) {
          console.error('Failed to load from localStorage:', error);
          set(() => ({
            isHydrating: false,
            persistenceError: 'Failed to load saved data',
          }));
        }
      },

      /**
       * Save current state to localStorage with error handling
       */
      saveToStorage: async (): Promise<void> => {
        const state = get();
        
        try {
          // Save categories
          const categoriesData = serialize.categories(state.categories);
          storage.set(STORAGE_KEYS.CATEGORIES, categoriesData);

          // Save category settings
          const settingsData = serialize.categorySettings(state.categorySettings);
          storage.set(STORAGE_KEYS.CATEGORY_SETTINGS, settingsData);

          // Save category selections
          storage.set(STORAGE_KEYS.CATEGORY_SELECTIONS, {
            selectedCategoryIds: state.selectedCategoryIds,
            activeCategoryId: state.activeCategoryId,
          });

          // Save category filters
          storage.set(STORAGE_KEYS.CATEGORY_FILTERS, state.categoryFilters);

          set(() => ({
            lastSaved: new Date(),
            persistenceError: null,
          }));

          console.log('Successfully saved data to localStorage');
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
          set(() => ({
            persistenceError: 'Failed to save data',
          }));
        }
      },

      /**
       * Clear all localStorage data and reset state
       */
      clearStorage: async (): Promise<void> => {
        try {
          storage.clear();
          
          // Reset to initial state
          set(() => ({
            categories: [],
            categorySettings: {},
            selectedCategoryIds: [],
            activeCategoryId: null,
            categoryFilters: DEFAULT_CATEGORY_FILTERS,
            categoryCombinations: [],
            lastSaved: null,
            persistenceError: null,
          }));

          console.log('Successfully cleared localStorage');
        } catch (error) {
          console.error('Failed to clear localStorage:', error);
          set(() => ({
            persistenceError: 'Failed to clear data',
          }));
        }
      },

      /**
       * Export data as JSON string for backup/transfer
       */
      exportData: (): string => {
        const state = get();
        
        const exportData = {
          version: CURRENT_STORAGE_VERSION,
          exportDate: new Date().toISOString(),
          categories: serialize.categories(state.categories),
          categorySettings: serialize.categorySettings(state.categorySettings),
        };

        return JSON.stringify(exportData, null, 2);
      },

      /**
       * Import data from JSON string with validation
       */
      importData: async (data: string): Promise<boolean> => {
        try {
          const importData = JSON.parse(data);
          
          if (!importData.version || !importData.categories) {
            throw new Error('Invalid import data format');
          }

          const categories = deserialize.categories(importData.categories);
          const categorySettings = importData.categorySettings 
            ? deserialize.categorySettings(importData.categorySettings)
            : {};

          set(() => ({
            categories,
            categorySettings,
            persistenceError: null,
          }));

          // Save imported data
          await get().saveToStorage();
          
          console.log('Successfully imported data');
          return true;
        } catch (error) {
          console.error('Failed to import data:', error);
          set(() => ({
            persistenceError: 'Failed to import data',
          }));
          return false;
        }
      },
    }),
    {
      name: 'youtube-filter-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist category-related data
        categories: state.categories,
        categorySettings: state.categorySettings,
        selectedCategoryIds: state.selectedCategoryIds,
        activeCategoryId: state.activeCategoryId,
        categoryFilters: state.categoryFilters,
        categoryCombinations: state.categoryCombinations,
        
        // TASK_002_005: Persist search and organization data
        categorySearchQuery: state.categorySearchQuery,
        categorySearchHistory: state.categorySearchHistory,
        savedSearches: state.savedSearches,
        searchOptions: state.searchOptions,
        favoriteCategories: state.favoriteCategories,
        categoryGroups: state.categoryGroups,
        recentlyUsed: state.recentlyUsed,
        
        // User preferences
        userPreferences: state.userPreferences,
      }),
      onRehydrateStorage: () => {
        console.log('Starting state hydration...');
        return (state, error) => {
          if (error) {
            console.error('Hydration failed:', error);
          } else {
            console.log('State hydration completed successfully');
          }
        };
      },
    }
  )
);
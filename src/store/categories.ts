import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types';
import { 
  getCategories as apiGetCategories,
  createCategory as apiCreateCategory,
  updateCategory as apiUpdateCategory,
  deleteCategory as apiDeleteCategory,
  toggleCategoryStatus,
  getCategoriesWithFilters 
} from '../api/categories';

interface CategoriesState {
  // State
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: Category | null;
  searchQuery: string;
  filterActive: boolean | null;
  
  // Synchronization state
  lastSyncAt: string | null;
  isDirty: boolean;
  
  // Actions
  fetchCategories: () => Promise<void>;
  createCategory: (categoryData: CreateCategoryRequest) => Promise<Category | null>;
  updateCategory: (id: string, updates: UpdateCategoryRequest) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  toggleCategory: (id: string) => Promise<boolean>;
  
  // Local state management
  setSelectedCategory: (category: Category | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterActive: (active: boolean | null) => void;
  clearError: () => void;
  
  // Filtered getters
  getFilteredCategories: () => Category[];
  getCategoryById: (id: string) => Category | undefined;
  getActiveCategoriesCount: () => number;
  
  // Sync and reset
  syncWithDatabase: () => Promise<void>;
  syncFromRealtime: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', record: any) => Promise<void>;
  resetStore: () => void;
}

const initialState = {
  categories: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  searchQuery: '',
  filterActive: null,
  lastSyncAt: null,
  isDirty: false,
};

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Fetch all categories from database
      fetchCategories: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiGetCategories();
          
          if (response.success && response.data) {
            set({ 
              categories: response.data,
              isLoading: false,
              lastSyncAt: new Date().toISOString(),
              isDirty: false,
            });
          } else {
            set({ 
              error: response.error || 'Failed to fetch categories',
              isLoading: false,
            });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            isLoading: false,
          });
        }
      },

      // Create new category
      createCategory: async (categoryData: CreateCategoryRequest): Promise<Category | null> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiCreateCategory(categoryData);
          
          if (response.success && response.data) {
            const newCategory = response.data;
            
            set(state => ({ 
              categories: [newCategory, ...state.categories],
              isLoading: false,
              isDirty: false,
            }));
            
            return newCategory;
          } else {
            set({ 
              error: response.error || 'Failed to create category',
              isLoading: false,
            });
            return null;
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            isLoading: false,
          });
          return null;
        }
      },

      // Update existing category
      updateCategory: async (id: string, updates: UpdateCategoryRequest): Promise<Category | null> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiUpdateCategory(id, updates);
          
          if (response.success && response.data) {
            const updatedCategory = response.data;
            
            set(state => ({
              categories: state.categories.map(cat => 
                cat.id === id ? updatedCategory : cat
              ),
              selectedCategory: state.selectedCategory?.id === id 
                ? updatedCategory 
                : state.selectedCategory,
              isLoading: false,
              isDirty: false,
            }));
            
            return updatedCategory;
          } else {
            set({ 
              error: response.error || 'Failed to update category',
              isLoading: false,
            });
            return null;
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            isLoading: false,
          });
          return null;
        }
      },

      // Delete category
      deleteCategory: async (id: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiDeleteCategory(id);
          
          if (response.success) {
            set(state => ({
              categories: state.categories.filter(cat => cat.id !== id),
              selectedCategory: state.selectedCategory?.id === id 
                ? null 
                : state.selectedCategory,
              isLoading: false,
              isDirty: false,
            }));
            
            return true;
          } else {
            set({ 
              error: response.error || 'Failed to delete category',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            isLoading: false,
          });
          return false;
        }
      },

      // Toggle category active status
      toggleCategory: async (id: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await toggleCategoryStatus(id);
          
          if (response.success && response.data) {
            const updatedCategory = response.data;
            
            set(state => ({
              categories: state.categories.map(cat => 
                cat.id === id ? updatedCategory : cat
              ),
              selectedCategory: state.selectedCategory?.id === id 
                ? updatedCategory 
                : state.selectedCategory,
              isLoading: false,
              isDirty: false,
            }));
            
            return true;
          } else {
            set({ 
              error: response.error || 'Failed to toggle category',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            isLoading: false,
          });
          return false;
        }
      },

      // Local state setters
      setSelectedCategory: (category: Category | null) => {
        set({ selectedCategory: category });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      setFilterActive: (active: boolean | null) => {
        set({ filterActive: active });
      },

      clearError: () => {
        set({ error: null });
      },

      // Filtered getters
      getFilteredCategories: (): Category[] => {
        const { categories, searchQuery, filterActive } = get();
        
        let filtered = [...categories];
        
        // Filter by active status
        if (filterActive !== null) {
          filtered = filtered.filter(cat => cat.isActive === filterActive);
        }
        
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(cat =>
            cat.name.toLowerCase().includes(query) ||
            cat.description.toLowerCase().includes(query) ||
            cat.keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
            cat.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
        
        return filtered;
      },

      getCategoryById: (id: string): Category | undefined => {
        return get().categories.find(cat => cat.id === id);
      },

      getActiveCategoriesCount: (): number => {
        return get().categories.filter(cat => cat.isActive).length;
      },

      // Sync with database (force refresh)
      syncWithDatabase: async () => {
        await get().fetchCategories();
      },

      // Handle real-time sync events
      syncFromRealtime: async (eventType: 'INSERT' | 'UPDATE' | 'DELETE', record: any) => {
        const state = get();
        
        switch (eventType) {
          case 'INSERT':
            // Add new category to the beginning of the list
            set({
              categories: [record, ...state.categories],
              lastSyncAt: new Date().toISOString(),
            });
            break;
            
          case 'UPDATE':
            // Update existing category
            set({
              categories: state.categories.map(cat => 
                cat.id === record.id ? { ...cat, ...record } : cat
              ),
              selectedCategory: state.selectedCategory?.id === record.id 
                ? { ...state.selectedCategory, ...record }
                : state.selectedCategory,
              lastSyncAt: new Date().toISOString(),
            });
            break;
            
          case 'DELETE':
            // Remove category from list
            set({
              categories: state.categories.filter(cat => cat.id !== record.id),
              selectedCategory: state.selectedCategory?.id === record.id 
                ? null 
                : state.selectedCategory,
              lastSyncAt: new Date().toISOString(),
            });
            break;
            
          default:
            console.warn('Unknown realtime event type:', eventType);
        }
      },

      // Reset store to initial state
      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'categories-store',
      partialize: (state) => ({
        // Only persist non-sensitive data
        categories: state.categories,
        selectedCategory: state.selectedCategory,
        searchQuery: state.searchQuery,
        filterActive: state.filterActive,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

// Utility hooks for common operations
export const useCategoryOperations = () => {
  const store = useCategoriesStore();
  
  return {
    // Quick actions
    createQuickCategory: async (name: string, description?: string) => {
      return store.createCategory({
        name,
        description: description || '',
        keywords: [],
        tags: [],
        color: '#3b82f6',
        isActive: true,
      });
    },
    
    // Search and filter
    searchCategories: (query: string) => {
      store.setSearchQuery(query);
      return store.getFilteredCategories();
    },
    
    // Bulk operations helper
    getSelectedCategories: () => {
      return store.categories.filter(cat => cat.isActive);
    },
    
    // Status helpers
    hasCategories: () => store.categories.length > 0,
    isFirstLoad: () => !store.lastSyncAt,
    needsSync: () => store.isDirty,
  };
};

// Export store selectors for performance optimization
export const categorySelectors = {
  categories: (state: CategoriesState) => state.categories,
  isLoading: (state: CategoriesState) => state.isLoading,
  error: (state: CategoriesState) => state.error,
  selectedCategory: (state: CategoriesState) => state.selectedCategory,
  filteredCategories: (state: CategoriesState) => state.getFilteredCategories(),
  activeCategoriesCount: (state: CategoriesState) => state.getActiveCategoriesCount(),
}; 
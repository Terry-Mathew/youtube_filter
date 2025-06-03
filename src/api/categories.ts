import { supabase, supabaseService } from '../lib/supabase';
import type { 
  Category, 
  CategoryId, 
  CategorySettings, 
  UserId,
  ApiResponse,
  PaginatedResponse,
  CategoryColor 
} from '../types';

// =============================================================================
// Request/Response Types
// =============================================================================

export interface CreateCategoryRequest {
  name: string;
  description: string;
  criteria: string;
  color?: CategoryColor;
  icon?: string;
  tags?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  id: CategoryId;
  name?: string;
  description?: string;
  criteria?: string;
  color?: CategoryColor;
  icon?: string;
  tags?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface GetCategoriesRequest {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'videoCount';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
  searchQuery?: string;
  tags?: string[];
}

export interface CategoryFilters {
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

// =============================================================================
// Category API Service
// =============================================================================

export class CategoriesApi {
  private static instance: CategoriesApi;
  
  private constructor() {}
  
  public static getInstance(): CategoriesApi {
    if (!CategoriesApi.instance) {
      CategoriesApi.instance = new CategoriesApi();
    }
    return CategoriesApi.instance;
  }
  
  /**
   * Get all categories for the current user
   */
  async getCategories(request: GetCategoriesRequest = {}): Promise<PaginatedResponse<Category>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_012
      // const { data, error, count } = await supabase
      //   .from('categories')
      //   .select('*', { count: 'exact' })
      //   .eq('user_id', user.id)
      //   .order(request.sortBy || 'createdAt', { ascending: request.sortOrder !== 'desc' })
      //   .range((request.page || 0) * (request.limit || 10), ((request.page || 0) + 1) * (request.limit || 10) - 1);
      
      // Placeholder response - will be replaced with actual database query
      const mockCategories: Category[] = [];
      const total = 0;
      const page = request.page || 0;
      const limit = request.limit || 10;
      
      return {
        success: true,
        data: mockCategories,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: (page + 1) * limit < total,
          hasPrevious: page > 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
        timestamp: new Date(),
        pagination: {
          page: 0,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }
  
  /**
   * Get a single category by ID
   */
  async getCategory(categoryId: CategoryId): Promise<ApiResponse<Category>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_012
      // const { data, error } = await supabase
      //   .from('categories')
      //   .select('*')
      //   .eq('id', categoryId)
      //   .eq('user_id', user.id)
      //   .single();
      
      // Placeholder - will be replaced with actual database query
      throw new Error('Category not found');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Create a new category
   */
  async createCategory(request: CreateCategoryRequest): Promise<ApiResponse<Category>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // Validate input
      if (!request.name.trim()) {
        throw new Error('Category name is required');
      }
      
      if (!request.description.trim()) {
        throw new Error('Category description is required');
      }
      
      if (!request.criteria.trim()) {
        throw new Error('Category criteria is required');
      }
      
      // TODO: Replace with actual Supabase insertion in TASK_012
      // const categoryData = {
      //   name: request.name.trim(),
      //   description: request.description.trim(),
      //   criteria: request.criteria.trim(),
      //   color: request.color || 'blue',
      //   icon: request.icon,
      //   tags: request.tags || [],
      //   is_active: request.isActive ?? true,
      //   sort_order: request.sortOrder || 0,
      //   user_id: user.id,
      //   created_at: new Date().toISOString(),
      //   updated_at: new Date().toISOString(),
      //   video_count: 0,
      // };
      
      // const { data, error } = await supabase
      //   .from('categories')
      //   .insert(categoryData)
      //   .select()
      //   .single();
      
      // Placeholder response - will be replaced with actual database insertion
      const newCategory: Category = {
        id: crypto.randomUUID() as CategoryId,
        name: request.name.trim(),
        description: request.description.trim(),
        criteria: request.criteria.trim(),
        color: request.color || 'blue',
        icon: request.icon,
        isActive: request.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id as UserId,
        videoCount: 0,
        tags: request.tags || [],
        sortOrder: request.sortOrder || 0,
        isAiSuggested: false,
      };
      
      return {
        success: true,
        data: newCategory,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Update an existing category
   */
  async updateCategory(request: UpdateCategoryRequest): Promise<ApiResponse<Category>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase update in TASK_012
      // const updateData = {
      //   ...(request.name && { name: request.name.trim() }),
      //   ...(request.description && { description: request.description.trim() }),
      //   ...(request.criteria && { criteria: request.criteria.trim() }),
      //   ...(request.color && { color: request.color }),
      //   ...(request.icon !== undefined && { icon: request.icon }),
      //   ...(request.tags && { tags: request.tags }),
      //   ...(request.isActive !== undefined && { is_active: request.isActive }),
      //   ...(request.sortOrder !== undefined && { sort_order: request.sortOrder }),
      //   updated_at: new Date().toISOString(),
      // };
      
      // const { data, error } = await supabase
      //   .from('categories')
      //   .update(updateData)
      //   .eq('id', request.id)
      //   .eq('user_id', user.id)
      //   .select()
      //   .single();
      
      // Placeholder - will be replaced with actual database update
      throw new Error('Category not found or update failed');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Delete a category
   */
  async deleteCategory(categoryId: CategoryId): Promise<ApiResponse<void>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase deletion in TASK_012
      // const { error } = await supabase
      //   .from('categories')
      //   .delete()
      //   .eq('id', categoryId)
      //   .eq('user_id', user.id);
      
      // Placeholder - will be replaced with actual database deletion
      return {
        success: true,
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Get category settings for a specific category
   */
  async getCategorySettings(categoryId: CategoryId): Promise<ApiResponse<CategorySettings>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase query in TASK_012
      // const { data, error } = await supabase
      //   .from('category_settings')
      //   .select('*')
      //   .eq('category_id', categoryId)
      //   .eq('user_id', user.id)
      //   .single();
      
      // Placeholder - will be replaced with actual database query
      throw new Error('Category settings not found');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category settings',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Update category settings
   */
  async updateCategorySettings(
    categoryId: CategoryId, 
    settings: Partial<CategorySettings>
  ): Promise<ApiResponse<CategorySettings>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase upsert in TASK_012
      // const settingsData = {
      //   category_id: categoryId,
      //   user_id: user.id,
      //   ...settings,
      //   updated_at: new Date().toISOString(),
      // };
      
      // const { data, error } = await supabase
      //   .from('category_settings')
      //   .upsert(settingsData)
      //   .select()
      //   .single();
      
      // Placeholder - will be replaced with actual database upsert
      throw new Error('Failed to update category settings');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category settings',
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Search categories with advanced filters
   */
  async searchCategories(
    query: string, 
    filters: CategoryFilters = {}
  ): Promise<ApiResponse<Category[]>> {
    try {
      // Ensure user is authenticated
      const { user, error: authError } = await supabaseService.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      
      // TODO: Replace with actual Supabase search query in TASK_012
      // Implement full-text search with filters
      
      // Placeholder - will be replaced with actual search implementation
      return {
        success: true,
        data: [],
        timestamp: new Date(),
        requestId: crypto.randomUUID(),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search categories',
        timestamp: new Date(),
      };
    }
  }
}

// Export singleton instance
export const categoriesApi = CategoriesApi.getInstance();

// Export convenience functions
export const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategorySettings,
  updateCategorySettings,
  searchCategories,
} = categoriesApi; 
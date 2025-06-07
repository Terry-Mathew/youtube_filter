import { supabase } from '../lib/supabase';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types';

export interface CategoryApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CategoryDbRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  keywords: string[];
  tags: string[];
  color: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Transform database category to application category format
 */
function transformDbCategoryToCategory(dbCategory: CategoryDbRow): Category {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    description: dbCategory.description || '',
    keywords: dbCategory.keywords || [],
    tags: dbCategory.tags || [],
    color: dbCategory.color,
    icon: dbCategory.icon || '',
    isActive: dbCategory.is_active,
    createdAt: dbCategory.created_at,
    updatedAt: dbCategory.updated_at,
    // Legacy fields for backward compatibility
    videoCount: 0,
    lastUsed: dbCategory.updated_at,
  };
}

/**
 * Transform application category to database format
 */
function transformCategoryToDbCategory(category: CreateCategoryRequest | UpdateCategoryRequest): Partial<CategoryDbRow> {
  return {
    name: category.name,
    description: category.description || null,
    keywords: category.keywords || [],
    tags: category.tags || [],
    color: category.color || '#3b82f6',
    icon: category.icon || null,
    is_active: 'isActive' in category ? category.isActive : true,
  };
}

/**
 * Get all categories for the current user
 */
export async function getCategories(): Promise<CategoryApiResponse<Category[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const categories = data.map(transformDbCategoryToCategory);

    return {
      success: true,
      data: categories,
      message: `Successfully fetched ${categories.length} categories`,
    };
  } catch (error) {
    console.error('Unexpected error fetching categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Get a single category by ID
 */
export async function getCategory(id: string): Promise<CategoryApiResponse<Category>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Category not found',
        };
      }
      console.error('Error fetching category:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const category = transformDbCategoryToCategory(data);

    return {
      success: true,
      data: category,
      message: 'Category fetched successfully',
    };
  } catch (error) {
    console.error('Unexpected error fetching category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Create a new category
 */
export async function createCategory(category: CreateCategoryRequest): Promise<CategoryApiResponse<Category>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Check if category name already exists for this user
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', category.name)
      .single();

    if (existingCategory) {
      return {
        success: false,
        error: 'A category with this name already exists',
      };
    }

    const dbCategory = transformCategoryToDbCategory(category);
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...dbCategory,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      
      // Handle specific constraint violations
      if (error.code === '23505' && error.message.includes('unique_user_category_name')) {
        return {
          success: false,
          error: 'A category with this name already exists',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    const newCategory = transformDbCategoryToCategory(data);

    return {
      success: true,
      data: newCategory,
      message: 'Category created successfully',
    };
  } catch (error) {
    console.error('Unexpected error creating category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(id: string, updates: UpdateCategoryRequest): Promise<CategoryApiResponse<Category>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // If updating name, check for duplicates
    if (updates.name) {
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', updates.name)
        .neq('id', id)
        .single();

      if (existingCategory) {
        return {
          success: false,
          error: 'A category with this name already exists',
        };
      }
    }

    const dbUpdates = transformCategoryToDbCategory(updates);
    
    const { data, error } = await supabase
      .from('categories')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Category not found or you do not have permission to update it',
        };
      }
      
      console.error('Error updating category:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const updatedCategory = transformDbCategoryToCategory(data);

    return {
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully',
    };
  } catch (error) {
    console.error('Unexpected error updating category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<CategoryApiResponse<void>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Check if category exists and belongs to user
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingCategory) {
      return {
        success: false,
        error: 'Category not found or you do not have permission to delete it',
      };
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting category:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: `Category "${existingCategory.name}" deleted successfully`,
    };
  } catch (error) {
    console.error('Unexpected error deleting category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Toggle category active status
 */
export async function toggleCategoryStatus(id: string): Promise<CategoryApiResponse<Category>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // First get current status
    const { data: currentCategory, error: fetchError } = await supabase
      .from('categories')
      .select('is_active')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    // Toggle the status
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: !currentCategory.is_active })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling category status:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const updatedCategory = transformDbCategoryToCategory(data);

    return {
      success: true,
      data: updatedCategory,
      message: `Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  } catch (error) {
    console.error('Unexpected error toggling category status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Get categories with optional filtering
 */
export async function getCategoriesWithFilters(options?: {
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<CategoryApiResponse<{ categories: Category[]; total: number }>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    let query = supabase
      .from('categories')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply filters
    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options?.limit || 50)) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching filtered categories:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const categories = data.map(transformDbCategoryToCategory);

    return {
      success: true,
      data: {
        categories,
        total: count || 0,
      },
      message: `Successfully fetched ${categories.length} categories`,
    };
  } catch (error) {
    console.error('Unexpected error fetching filtered categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
} 
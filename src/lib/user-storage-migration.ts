import { supabase } from './supabase';
import { useAuth } from '../hooks/useAuth';
import type { Category, UserPreferences } from '../types';

export interface MigrationResult {
  success: boolean;
  categoriesMigrated: number;
  preferencesMigrated: boolean;
  errors: string[];
  skipped: string[];
}

export interface LocalStorageData {
  categories: Category[];
  preferences: UserPreferences;
  searchHistory: any[];
  categorySettings: Record<string, any>;
}

/**
 * Comprehensive migration service to move user data from localStorage to Supabase
 */
export class UserStorageMigration {
  private static instance: UserStorageMigration;
  
  public static getInstance(): UserStorageMigration {
    if (!UserStorageMigration.instance) {
      UserStorageMigration.instance = new UserStorageMigration();
    }
    return UserStorageMigration.instance;
  }

  /**
   * Extract all relevant data from localStorage
   */
  private extractLocalStorageData(): LocalStorageData {
    const data: LocalStorageData = {
      categories: [],
      preferences: {
        theme: 'light',
        resultCount: 10,
        autoplay: false,
      },
      searchHistory: [],
      categorySettings: {},
    };

    try {
      // Extract categories
      const categoriesData = localStorage.getItem('youtube-filter-categories');
      if (categoriesData) {
        const parsed = JSON.parse(categoriesData);
        if (parsed.data && Array.isArray(parsed.data)) {
          data.categories = parsed.data.map((cat: any) => ({
            ...cat,
            createdAt: new Date(cat.createdAt),
            updatedAt: new Date(cat.updatedAt),
          }));
        }
      }

      // Extract preferences  
      const preferencesData = localStorage.getItem('youtube-filter-preferences');
      if (preferencesData) {
        const parsed = JSON.parse(preferencesData);
        if (parsed.data) {
          data.preferences = { ...data.preferences, ...parsed.data };
        }
      }

      // Extract search history
      const historyData = localStorage.getItem('youtube-filter-search-history');
      if (historyData) {
        const parsed = JSON.parse(historyData);
        if (parsed.data && Array.isArray(parsed.data)) {
          data.searchHistory = parsed.data;
        }
      }

      // Extract category settings
      const settingsData = localStorage.getItem('youtube-filter-category-settings');
      if (settingsData) {
        const parsed = JSON.parse(settingsData);
        if (parsed.data) {
          data.categorySettings = parsed.data;
        }
      }

    } catch (error) {
      console.error('Error extracting localStorage data:', error);
    }

    return data;
  }

  /**
   * Migrate categories to Supabase database
   */
  private async migrateCategories(categories: Category[], userId: string): Promise<{ success: number; errors: string[] }> {
    const result = { success: 0, errors: [] as string[] };

    for (const category of categories) {
      try {
        // Transform category data for database
        const categoryData = {
          name: category.name,
          description: category.description,
          criteria: category.criteria,
          color: category.color,
          icon: category.icon,
          is_active: category.isActive,
          user_id: userId,
          tags: category.tags || [],
          video_count: category.videoCount || 0,
          sort_order: category.sortOrder || 0,
          is_ai_suggested: category.isAiSuggested || false,
        };

        const { error } = await supabase
          .from('categories')
          .insert(categoryData);

        if (error) {
          result.errors.push(`Failed to migrate category "${category.name}": ${error.message}`);
        } else {
          result.success++;
        }
      } catch (error) {
        result.errors.push(`Error migrating category "${category.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Migrate user preferences to Supabase user profile
   */
  private async migratePreferences(preferences: UserPreferences, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const profileData = {
        user_id: userId,
        preferences: {
          theme: preferences.theme,
          result_count: preferences.resultCount,
          autoplay: preferences.autoplay,
        },
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', userId);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        // Create new profile
        const { error } = await supabase
          .from('user_profiles')
          .insert(profileData);

        if (error) {
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Migrate search history to Supabase
   */
  private async migrateSearchHistory(searchHistory: any[], userId: string): Promise<{ success: number; errors: string[] }> {
    const result = { success: 0, errors: [] as string[] };

    for (const item of searchHistory.slice(0, 50)) { // Limit to last 50 searches
      try {
        const historyData = {
          user_id: userId,
          search_query: item.query || '',
          result_count: item.resultCount || 0,
          created_at: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
        };

        const { error } = await supabase
          .from('user_search_history')
          .insert(historyData);

        if (error) {
          result.errors.push(`Failed to migrate search: ${error.message}`);
        } else {
          result.success++;
        }
      } catch (error) {
        result.errors.push(`Error migrating search history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Check if user has already migrated data
   */
  private async hasUserMigrated(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('migration_completed')
        .eq('user_id', userId)
        .single();

      return profile?.migration_completed === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark migration as completed for user
   */
  private async markMigrationCompleted(userId: string): Promise<void> {
    await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        migration_completed: true,
        migration_date: new Date().toISOString(),
      });
  }

  /**
   * Main migration method
   */
  public async migrateUserData(user?: { id: string }): Promise<MigrationResult> {
    if (!user) {
      return {
        success: false,
        categoriesMigrated: 0,
        preferencesMigrated: false,
        errors: ['User not authenticated'],
        skipped: [],
      };
    }

    const result: MigrationResult = {
      success: false,
      categoriesMigrated: 0,
      preferencesMigrated: false,
      errors: [],
      skipped: [],
    };

    try {
      // Check if already migrated
      const alreadyMigrated = await this.hasUserMigrated(user.id);
      if (alreadyMigrated) {
        result.skipped.push('Migration already completed for this user');
        result.success = true;
        return result;
      }

      // Extract localStorage data
      const localData = this.extractLocalStorageData();
      
      if (localData.categories.length === 0 && 
          Object.keys(localData.categorySettings).length === 0 &&
          localData.searchHistory.length === 0) {
        result.skipped.push('No localStorage data found to migrate');
        result.success = true;
        await this.markMigrationCompleted(user.id);
        return result;
      }

      // Migrate categories
      if (localData.categories.length > 0) {
        const categoryResult = await this.migrateCategories(localData.categories, user.id);
        result.categoriesMigrated = categoryResult.success;
        result.errors.push(...categoryResult.errors);
      }

      // Migrate preferences
      const preferencesResult = await this.migratePreferences(localData.preferences, user.id);
      result.preferencesMigrated = preferencesResult.success;
      if (!preferencesResult.success && preferencesResult.error) {
        result.errors.push(`Preferences migration failed: ${preferencesResult.error}`);
      }

      // Migrate search history
      if (localData.searchHistory.length > 0) {
        const historyResult = await this.migrateSearchHistory(localData.searchHistory, user.id);
        if (historyResult.errors.length > 0) {
          result.errors.push(...historyResult.errors);
        }
      }

      // Mark migration as completed
      await this.markMigrationCompleted(user.id);

      result.success = result.errors.length === 0 || (result.categoriesMigrated > 0 || result.preferencesMigrated);

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Clean up localStorage after successful migration
   */
  public cleanupLocalStorage(): void {
    const keysToRemove = [
      'youtube-filter-categories',
      'youtube-filter-category-settings', 
      'youtube-filter-preferences',
      'youtube-filter-search-history',
      'youtube-filter-storage-version',
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key ${key}:`, error);
      }
    });
  }

  /**
   * Create backup of localStorage data before migration
   */
  public createLocalStorageBackup(): string {
    const localData = this.extractLocalStorageData();
    const backup = {
      timestamp: new Date().toISOString(),
      data: localData,
    };

    return JSON.stringify(backup, null, 2);
  }
}

// Export singleton instance
export const userStorageMigration = UserStorageMigration.getInstance(); 
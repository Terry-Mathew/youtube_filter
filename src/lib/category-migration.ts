import type { Category, CreateCategoryRequest } from '../types';
import { createCategory, getCategories } from '../api/categories';
import { supabase } from './supabase';

export interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: string[];
  totalFound: number;
}

export interface MigrationProgress {
  currentItem: number;
  totalItems: number;
  status: 'scanning' | 'migrating' | 'completed' | 'error';
  message: string;
}

/**
 * Legacy localStorage category structure for migration
 */
interface LegacyCategory {
  id: string;
  name: string;
  description?: string;
  keywords?: string[];
  tags?: string[];
  color?: string;
  icon?: string;
  isActive?: boolean;
  videoCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  lastUsed?: string | Date;
}

/**
 * Scan localStorage for existing categories
 */
export function scanLocalStorageCategories(): LegacyCategory[] {
  try {
    const categories: LegacyCategory[] = [];
    
    // Check multiple possible localStorage keys that might contain categories
    const possibleKeys = [
      'categories',
      'youtube-filter-categories', 
      'learningtube-categories',
      'user-categories',
      'app-categories'
    ];
    
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          
          // Handle different storage formats
          if (Array.isArray(parsed)) {
            categories.push(...parsed.map(normalizeLegacyCategory));
          } else if (parsed && typeof parsed === 'object') {
            // Handle object format like { categories: [...] }
            if (parsed.categories && Array.isArray(parsed.categories)) {
              categories.push(...parsed.categories.map(normalizeLegacyCategory));
            } else if (parsed.data && Array.isArray(parsed.data)) {
              categories.push(...parsed.data.map(normalizeLegacyCategory));
            }
          }
        } catch (parseError) {
          console.warn(`Failed to parse localStorage key ${key}:`, parseError);
        }
      }
    }
    
    // Deduplicate by name (keep the most recent)
    const deduplicated = categories.reduce((acc, category) => {
      const existing = acc.find(c => c.name.toLowerCase() === category.name.toLowerCase());
      if (!existing) {
        acc.push(category);
      } else {
        // Keep the one with more recent timestamp
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
        const currentDate = new Date(category.updatedAt || category.createdAt || 0);
        if (currentDate > existingDate) {
          const index = acc.indexOf(existing);
          acc[index] = category;
        }
      }
      return acc;
    }, [] as LegacyCategory[]);
    
    return deduplicated;
  } catch (error) {
    console.error('Error scanning localStorage for categories:', error);
    return [];
  }
}

/**
 * Normalize legacy category to consistent format
 */
function normalizeLegacyCategory(category: any): LegacyCategory {
  return {
    id: category.id || crypto.randomUUID(),
    name: category.name || 'Untitled Category',
    description: category.description || '',
    keywords: Array.isArray(category.keywords) ? category.keywords : [],
    tags: Array.isArray(category.tags) ? category.tags : [],
    color: category.color || '#3b82f6',
    icon: category.icon || '',
    isActive: category.isActive !== false, // Default to true
    videoCount: Number(category.videoCount) || 0,
    createdAt: category.createdAt || new Date().toISOString(),
    updatedAt: category.updatedAt || category.createdAt || new Date().toISOString(),
    lastUsed: category.lastUsed || category.updatedAt || category.createdAt || new Date().toISOString(),
  };
}

/**
 * Check if user is authenticated and ready for migration
 */
export async function checkMigrationReadiness(): Promise<{
  ready: boolean;
  reason?: string;
  user?: any;
}> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return {
        ready: false,
        reason: 'Authentication error: ' + error.message,
      };
    }
    
    if (!user) {
      return {
        ready: false,
        reason: 'User not authenticated. Please sign in first.',
      };
    }
    
    return {
      ready: true,
      user,
    };
  } catch (error) {
    return {
      ready: false,
      reason: 'Failed to check authentication status.',
    };
  }
}

/**
 * Get existing categories from database to avoid duplicates
 */
async function getExistingCategories(): Promise<Set<string>> {
  try {
    const response = await getCategories();
    if (response.success && response.data) {
      return new Set(response.data.map(cat => cat.name.toLowerCase()));
    }
    return new Set();
  } catch (error) {
    console.warn('Failed to fetch existing categories:', error);
    return new Set();
  }
}

/**
 * Convert legacy category to create request
 */
function legacyToCreateRequest(legacy: LegacyCategory): CreateCategoryRequest {
  return {
    name: legacy.name,
    description: legacy.description || '',
    keywords: legacy.keywords || [],
    tags: legacy.tags || [],
    color: legacy.color || '#3b82f6',
    icon: legacy.icon || '',
    isActive: legacy.isActive !== false,
  };
}

/**
 * Migrate categories with progress callback
 */
export async function migrateCategories(
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: 0,
    skipped: 0,
    errors: [],
    totalFound: 0,
  };
  
  try {
    // Check readiness
    onProgress?.({
      currentItem: 0,
      totalItems: 0,
      status: 'scanning',
      message: 'Checking authentication...',
    });
    
    const readiness = await checkMigrationReadiness();
    if (!readiness.ready) {
      result.errors.push(readiness.reason || 'Migration not ready');
      return result;
    }
    
    // Scan localStorage
    onProgress?.({
      currentItem: 0,
      totalItems: 0,
      status: 'scanning',
      message: 'Scanning localStorage for categories...',
    });
    
    const localCategories = scanLocalStorageCategories();
    result.totalFound = localCategories.length;
    
    if (localCategories.length === 0) {
      onProgress?.({
        currentItem: 0,
        totalItems: 0,
        status: 'completed',
        message: 'No categories found in localStorage.',
      });
      result.success = true;
      return result;
    }
    
    // Get existing categories to avoid duplicates
    onProgress?.({
      currentItem: 0,
      totalItems: localCategories.length,
      status: 'scanning',
      message: 'Checking existing categories in database...',
    });
    
    const existingNames = await getExistingCategories();
    
    // Migrate each category
    for (let i = 0; i < localCategories.length; i++) {
      const category = localCategories[i];
      
      onProgress?.({
        currentItem: i + 1,
        totalItems: localCategories.length,
        status: 'migrating',
        message: `Migrating "${category.name}"...`,
      });
      
      // Skip if already exists
      if (existingNames.has(category.name.toLowerCase())) {
        result.skipped++;
        onProgress?.({
          currentItem: i + 1,
          totalItems: localCategories.length,
          status: 'migrating',
          message: `Skipped "${category.name}" (already exists)`,
        });
        continue;
      }
      
      try {
        const createRequest = legacyToCreateRequest(category);
        const response = await createCategory(createRequest);
        
        if (response.success) {
          result.migrated++;
          existingNames.add(category.name.toLowerCase()); // Track for duplicates
        } else {
          result.errors.push(`Failed to migrate "${category.name}": ${response.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error migrating "${category.name}": ${errorMessage}`);
      }
      
      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    onProgress?.({
      currentItem: localCategories.length,
      totalItems: localCategories.length,
      status: 'completed',
      message: `Migration completed: ${result.migrated} migrated, ${result.skipped} skipped`,
    });
    
    result.success = result.errors.length === 0 || result.migrated > 0;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(`Migration failed: ${errorMessage}`);
    
    onProgress?.({
      currentItem: 0,
      totalItems: 0,
      status: 'error',
      message: errorMessage,
    });
  }
  
  return result;
}

/**
 * Create backup of localStorage categories before migration
 */
export function createLocalStorageBackup(): string | null {
  try {
    const categories = scanLocalStorageCategories();
    const backup = {
      timestamp: new Date().toISOString(),
      categories,
      version: '1.0',
      source: 'localStorage',
    };
    
    const backupString = JSON.stringify(backup, null, 2);
    
    // Store backup in localStorage with timestamp
    const backupKey = `categories-backup-${Date.now()}`;
    localStorage.setItem(backupKey, backupString);
    
    return backupString;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return null;
  }
}

/**
 * Clean up localStorage categories after successful migration
 */
export function cleanupLocalStorageCategories(createBackup: boolean = true): boolean {
  try {
    if (createBackup) {
      createLocalStorageBackup();
    }
    
    // Remove all possible category keys
    const possibleKeys = [
      'categories',
      'youtube-filter-categories', 
      'learningtube-categories',
      'user-categories',
      'app-categories'
    ];
    
    for (const key of possibleKeys) {
      localStorage.removeItem(key);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to cleanup localStorage:', error);
    return false;
  }
}

/**
 * Get migration summary for display
 */
export function getMigrationSummary(): {
  hasLocalCategories: boolean;
  categoryCount: number;
  categories: LegacyCategory[];
} {
  const categories = scanLocalStorageCategories();
  
  return {
    hasLocalCategories: categories.length > 0,
    categoryCount: categories.length,
    categories,
  };
} 
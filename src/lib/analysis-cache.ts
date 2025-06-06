import type { AnalysisResult, CacheStrategy } from '../types/analysis';

interface CacheEntry {
  data: AnalysisResult;
  timestamp: number;
  expiry: number;
  hits: number;
}

export class AnalysisCache {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private indexedDBName = 'youtube-filter-analysis-cache';
  private indexedDBVersion = 1;
  private db: IDBDatabase | null = null;

  private readonly strategy: CacheStrategy = {
    relevanceScores: {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      storage: 'memory+indexeddb'
    },
    contentInsights: {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days  
      storage: 'memory+indexeddb+supabase'
    },
    categoryMatches: {
      ttl: 24 * 60 * 60 * 1000, // 1 day
      storage: 'memory'
    }
  };

  constructor() {
    this.initializeIndexedDB();
  }

  /**
   * Get cached analysis result
   */
  async get(cacheKey: string): Promise<AnalysisResult | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      memoryEntry.hits++;
      return memoryEntry.data;
    }

    // Check IndexedDB if memory cache miss
    const indexedDBEntry = await this.getFromIndexedDB(cacheKey);
    if (indexedDBEntry && !this.isExpired(indexedDBEntry)) {
      // Store back in memory for faster access
      this.memoryCache.set(cacheKey, indexedDBEntry);
      indexedDBEntry.hits++;
      return indexedDBEntry.data;
    }

    return null;
  }

  /**
   * Set analysis result in cache
   */
  async set(cacheKey: string, data: AnalysisResult): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiry: now + this.strategy.contentInsights.ttl,
      hits: 0
    };

    // Always store in memory
    this.memoryCache.set(cacheKey, entry);

    // Store in IndexedDB for persistence
    await this.setInIndexedDB(cacheKey, entry);

    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance
      this.cleanup();
    }
  }

  /**
   * Check if analysis exists in cache
   */
  async has(cacheKey: string): Promise<boolean> {
    const result = await this.get(cacheKey);
    return result !== null;
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(cacheKey: string): Promise<void> {
    this.memoryCache.delete(cacheKey);
    await this.deleteFromIndexedDB(cacheKey);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    await this.clearIndexedDB();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    memorySize: number;
    hitRate: number;
    oldestEntry: number | null;
  } {
    const entries = Array.from(this.memoryCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalAccess = entries.length;
    
    const oldestEntry = entries.length > 0 
      ? Math.min(...entries.map(e => e.timestamp))
      : null;

    return {
      memoryEntries: this.memoryCache.size,
      memorySize: this.estimateMemorySize(),
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      oldestEntry
    };
  }

  /**
   * Generate cache key for analysis request
   */
  generateCacheKey(videoId: string, categories: string[], depth: string): string {
    const categoryKey = categories.sort().join(',');
    const hash = this.simpleHash(`${videoId}-${categoryKey}-${depth}`);
    return `analysis:${videoId}:${hash}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiry;
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Estimate memory cache size
   */
  private estimateMemorySize(): number {
    return Array.from(this.memoryCache.values())
      .reduce((size, entry) => {
        return size + JSON.stringify(entry.data).length * 2; // Rough estimate
      }, 0);
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.indexedDBName, this.indexedDBVersion);

      request.onerror = () => {
        console.warn('Failed to initialize IndexedDB for analysis cache');
        resolve(); // Continue without IndexedDB
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('analysis')) {
          const store = db.createObjectStore('analysis', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }

  /**
   * Get entry from IndexedDB
   */
  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['analysis'], 'readonly');
      const store = transaction.objectStore('analysis');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            data: result.data,
            timestamp: result.timestamp,
            expiry: result.expiry,
            hits: result.hits || 0
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn('Failed to read from IndexedDB cache');
        resolve(null);
      };
    });
  }

  /**
   * Set entry in IndexedDB
   */
  private async setInIndexedDB(key: string, entry: CacheEntry): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['analysis'], 'readwrite');
      const store = transaction.objectStore('analysis');
      
      const request = store.put({
        key,
        data: entry.data,
        timestamp: entry.timestamp,
        expiry: entry.expiry,
        hits: entry.hits
      });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('Failed to write to IndexedDB cache');
        resolve();
      };
    });
  }

  /**
   * Delete entry from IndexedDB
   */
  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['analysis'], 'readwrite');
      const store = transaction.objectStore('analysis');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('Failed to delete from IndexedDB cache');
        resolve();
      };
    });
  }

  /**
   * Clear all IndexedDB entries
   */
  private async clearIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['analysis'], 'readwrite');
      const store = transaction.objectStore('analysis');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('Failed to clear IndexedDB cache');
        resolve();
      };
    });
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const analysisCache = new AnalysisCache(); 
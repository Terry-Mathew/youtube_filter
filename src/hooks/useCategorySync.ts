import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useCategoriesStore } from '@/store/categories';
import { useAuth } from '@/hooks/useAuth';

interface CategorySyncOptions {
  /**
   * Enable automatic sync on connection
   */
  autoSync?: boolean;
  
  /**
   * Callback for sync events
   */
  onSyncEvent?: (event: CategorySyncEvent) => void;
  
  /**
   * Error callback
   */
  onError?: (error: Error) => void;
}

interface CategorySyncEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'categories';
  old?: any;
  new?: any;
  eventTs: string;
}

/**
 * Hook for real-time category synchronization
 * Subscribes to database changes and updates local store
 */
export function useCategorySync(options: CategorySyncOptions = {}) {
  const { autoSync = true, onSyncEvent, onError } = options;
  
  const { user } = useAuth();
  const { 
    fetchCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    syncFromRealtime 
  } = useCategoriesStore();
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  /**
   * Handle real-time category changes
   */
  const handleRealtimeEvent = async (payload: any) => {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      // Create sync event
      const syncEvent: CategorySyncEvent = {
        type: eventType,
        table: 'categories',
        old: oldRecord,
        new: newRecord,
        eventTs: new Date().toISOString(),
      };

      // Notify callback
      onSyncEvent?.(syncEvent);

      // Update local store based on event type
      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            await syncFromRealtime('INSERT', newRecord);
          }
          break;
          
        case 'UPDATE':
          if (newRecord) {
            await syncFromRealtime('UPDATE', newRecord);
          }
          break;
          
        case 'DELETE':
          if (oldRecord) {
            await syncFromRealtime('DELETE', oldRecord);
          }
          break;
          
        default:
          console.warn('Unknown realtime event type:', eventType);
      }
    } catch (error) {
      console.error('Error handling realtime event:', error);
      onError?.(error as Error);
    }
  };

  /**
   * Subscribe to real-time changes
   */
  const subscribe = async () => {
    if (!user || isConnectedRef.current) return;

    try {
      // Create channel for user's categories
      const channel = supabase
        .channel(`categories_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'categories',
            filter: `user_id=eq.${user.id}`
          },
          handleRealtimeEvent
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isConnectedRef.current = true;
            console.log('✅ Real-time category sync connected');
          } else if (status === 'CHANNEL_ERROR') {
            isConnectedRef.current = false;
            console.error('❌ Real-time category sync error');
            onError?.(new Error('Real-time sync connection failed'));
          }
        });

      channelRef.current = channel;

      // Initial sync if auto-sync is enabled
      if (autoSync) {
        await fetchCategories();
      }

    } catch (error) {
      console.error('Error setting up real-time sync:', error);
      onError?.(error as Error);
    }
  };

  /**
   * Unsubscribe from real-time changes
   */
  const unsubscribe = async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
      console.log('🔌 Real-time category sync disconnected');
    }
  };

  /**
   * Force sync categories from database
   */
  const forceSync = async () => {
    try {
      await fetchCategories();
      console.log('🔄 Categories force synced');
    } catch (error) {
      console.error('Error during force sync:', error);
      onError?.(error as Error);
    }
  };

  /**
   * Get connection status
   */
  const getConnectionStatus = () => ({
    isConnected: isConnectedRef.current,
    hasChannel: !!channelRef.current,
    userId: user?.id,
  });

  // Setup subscription when user changes
  useEffect(() => {
    if (user) {
      subscribe();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    subscribe,
    unsubscribe,
    forceSync,
    getConnectionStatus,
    isConnected: isConnectedRef.current,
  };
} 
/**
 * Background Sync Utility for Lunara
 * Handles offline data storage and synchronization with service worker
 *
 * Note: Background Sync API is not yet in standard TypeScript types,
 * so we use type assertions where needed.
 */

interface OfflineData {
  id: string;
  data: any;
  timestamp: number;
  token?: string;
  endpoint?: string;
  method?: string;
}

class BackgroundSyncManager {
  private dbName = 'LunaraOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
    this.setupServiceWorkerListeners();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for different types of offline data
        const storeNames = [
          'offline-appointments',
          'offline-reviews', 
          'offline-analytics',
          'offline-forms',
          'offline-notifications'
        ];

        storeNames.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
  }

  /**
   * Setup service worker message listeners
   */
  private setupServiceWorkerListeners(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'appointment-sync-complete':
            this.handleSyncComplete('appointments', data);
            break;
          case 'review-sync-complete':
            this.handleSyncComplete('reviews', data);
            break;
          case 'analytics-sync-complete':
            this.handleSyncComplete('analytics', data);
            break;
          case 'form-sync-complete':
            this.handleSyncComplete('forms', data);
            break;
          case 'notification-sync-complete':
            this.handleSyncComplete('notifications', data);
            break;
        }
      });
    }
  }

  /**
   * Handle sync completion events
   */
  private handleSyncComplete(type: string, data: any): void {
    console.log(`Background sync completed for ${type}:`, data);
    
    // Dispatch custom events for the application to listen to
    window.dispatchEvent(new CustomEvent(`lunara-sync-${type}`, {
      detail: data
    }));
  }

  /**
   * Store appointment data for offline sync
   */
  async storeOfflineAppointment(appointmentData: any, token: string): Promise<void> {
    const offlineData: OfflineData = {
      id: `appointment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: appointmentData,
      timestamp: Date.now(),
      token
    };

    await this.storeData('offline-appointments', offlineData);
    await this.requestBackgroundSync('offline-appointments');
  }

  /**
   * Store review data for offline sync
   */
  async storeOfflineReview(reviewData: any, token: string): Promise<void> {
    const offlineData: OfflineData = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: reviewData,
      timestamp: Date.now(),
      token
    };

    await this.storeData('offline-reviews', offlineData);
    await this.requestBackgroundSync('offline-reviews');
  }

  /**
   * Store analytics data for offline sync
   */
  async storeOfflineAnalytics(analyticsData: any): Promise<void> {
    const offlineData: OfflineData = {
      id: `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: analyticsData,
      timestamp: Date.now()
    };

    await this.storeData('offline-analytics', offlineData);
    await this.requestBackgroundSync('offline-analytics');
  }

  /**
   * Store form data for offline sync
   */
  async storeOfflineForm(formData: any, endpoint: string, method: string = 'POST', token?: string): Promise<void> {
    const offlineData: OfflineData = {
      id: `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: formData,
      timestamp: Date.now(),
      endpoint,
      method,
      token
    };

    await this.storeData('offline-forms', offlineData);
    await this.requestBackgroundSync('offline-forms');
  }

  /**
   * Store notification action for offline sync
   */
  async storeOfflineNotification(notificationId: string, token: string): Promise<void> {
    const offlineData: OfflineData = {
      id: notificationId,
      data: { action: 'mark-read' },
      timestamp: Date.now(),
      token
    };

    await this.storeData('offline-notifications', offlineData);
    await this.requestBackgroundSync('offline-notifications');
  }

  /**
   * Store data in IndexedDB
   */
  private async storeData(storeName: string, data: OfflineData): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Request background sync from service worker
   */
  private async requestBackgroundSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Type assertion for background sync API since it's not in standard types
        const registrationWithSync = registration as any;
        if (registrationWithSync.sync) {
          await registrationWithSync.sync.register(tag);
          console.log(`Background sync requested for: ${tag}`);
        } else {
          throw new Error('Sync manager not available');
        }
      } catch (error) {
        console.error('Failed to register background sync:', error);
        // Fallback: try to sync immediately if background sync is not available
        this.fallbackSync(tag);
      }
    } else {
      console.warn('Background sync not supported, using fallback');
      this.fallbackSync(tag);
    }
  }

  /**
   * Fallback sync for browsers that don't support background sync
   */
  private async fallbackSync(tag: string): Promise<void> {
    // Try to sync immediately when online
    if (navigator.onLine) {
      try {
        // Send message to service worker to trigger sync
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration.active) {
            registration.active.postMessage({
              type: 'manual-sync',
              tag: tag
            });
          }
        }
      } catch (error) {
        console.error('Fallback sync failed:', error);
      }
    }
  }

  /**
   * Get pending offline data count
   */
  async getPendingDataCount(): Promise<{ [key: string]: number }> {
    if (!this.db) {
      await this.initDB();
    }

    const stores = ['offline-appointments', 'offline-reviews', 'offline-analytics', 'offline-forms', 'offline-notifications'];
    const counts: { [key: string]: number } = {};

    for (const storeName of stores) {
      counts[storeName] = await this.getStoreCount(storeName);
    }

    return counts;
  }

  /**
   * Get count of items in a store
   */
  private async getStoreCount(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(0);
        return;
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        resolve(0);
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all offline data (for testing/debugging)
   */
  async clearAllOfflineData(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    const stores = ['offline-appointments', 'offline-reviews', 'offline-analytics', 'offline-forms', 'offline-notifications'];
    
    for (const storeName of stores) {
      await this.clearStore(storeName);
    }
  }

  /**
   * Clear a specific store
   */
  private async clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(storeName)) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Create singleton instance
export const backgroundSyncManager = new BackgroundSyncManager();

// Export utility functions
export const storeOfflineAppointment = (data: any, token: string) => 
  backgroundSyncManager.storeOfflineAppointment(data, token);

export const storeOfflineReview = (data: any, token: string) => 
  backgroundSyncManager.storeOfflineReview(data, token);

export const storeOfflineAnalytics = (data: any) => 
  backgroundSyncManager.storeOfflineAnalytics(data);

export const storeOfflineForm = (data: any, endpoint: string, method?: string, token?: string) => 
  backgroundSyncManager.storeOfflineForm(data, endpoint, method, token);

export const storeOfflineNotification = (notificationId: string, token: string) => 
  backgroundSyncManager.storeOfflineNotification(notificationId, token);

export const getPendingDataCount = () => 
  backgroundSyncManager.getPendingDataCount();

export const clearAllOfflineData = () => 
  backgroundSyncManager.clearAllOfflineData();

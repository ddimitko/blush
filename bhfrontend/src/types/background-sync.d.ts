/**
 * TypeScript declarations for Background Sync API
 * This extends the standard ServiceWorkerRegistration interface
 */

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync?: SyncManager;
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

interface ServiceWorkerGlobalScope {
  addEventListener(type: 'sync', listener: (event: SyncEvent) => void): void;
}

// Extend the global Window interface to include background sync support check
declare global {
  interface Window {
    ServiceWorkerRegistration: {
      prototype: ServiceWorkerRegistration;
    };
  }
}

export {};

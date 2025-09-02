// Lunara Service Worker for Performance Optimization
const CACHE_NAME = 'lunara-v1.0.0';
const STATIC_CACHE = 'lunara-static-v1.0.0';
const DYNAMIC_CACHE = 'lunara-dynamic-v1.0.0';
const IMAGE_CACHE = 'lunara-images-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/shops$/,
  /\/api\/services$/,
  /\/api\/content\/faq$/
];

// Image patterns to cache
const IMAGE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)$/i
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImage(request)) {
    event.respondWith(handleImage(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleOtherRequests(request));
  }
});

// Check if request is for static assets
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') || 
         url.pathname === '/' ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.html');
}

// Check if request is for images
function isImage(request) {
  return IMAGE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Static asset fetch failed', error);
    
    // Return offline fallback for HTML requests
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Handle images with cache-first strategy and longer TTL
async function handleImage(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Image fetch failed', error);
    
    // Return placeholder image for failed image requests
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Image unavailable</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Handle API requests with network-first strategy and short-term caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Don't cache authentication or mutation requests
  if (url.pathname.includes('/auth/') || 
      request.method !== 'GET') {
    return fetch(request);
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Only cache GET requests for specific endpoints
      const shouldCache = API_CACHE_PATTERNS.some(pattern => 
        pattern.test(url.pathname)
      );
      
      if (shouldCache) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: API fetch failed', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle other requests with network-first strategy
async function handleOtherRequests(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('Service Worker: Request failed', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sync event triggered with tag:', event.tag);

  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(doBackgroundSync());
      break;
    case 'offline-appointments':
      event.waitUntil(syncOfflineAppointments());
      break;
    case 'offline-reviews':
      event.waitUntil(syncOfflineReviews());
      break;
    case 'offline-analytics':
      event.waitUntil(syncOfflineAnalytics());
      break;
    case 'offline-forms':
      event.waitUntil(syncOfflineForms());
      break;
    default:
      console.log('Service Worker: Unknown sync tag:', event.tag);
  }
});

// Main background sync function
async function doBackgroundSync() {
  console.log('Service Worker: Starting comprehensive background sync');

  try {
    // Run all sync operations
    await Promise.allSettled([
      syncOfflineAppointments(),
      syncOfflineReviews(),
      syncOfflineAnalytics(),
      syncOfflineForms(),
      syncOfflineNotifications()
    ]);

    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
    throw error;
  }
}

// Sync offline appointment bookings
async function syncOfflineAppointments() {
  console.log('Service Worker: Syncing offline appointments');

  try {
    const offlineAppointments = await getStoredData('offline-appointments');

    if (!offlineAppointments || offlineAppointments.length === 0) {
      console.log('Service Worker: No offline appointments to sync');
      return;
    }

    const syncResults = [];

    for (const appointment of offlineAppointments) {
      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appointment.token}`
          },
          body: JSON.stringify(appointment.data)
        });

        if (response.ok) {
          console.log('Service Worker: Appointment synced successfully:', appointment.id);
          syncResults.push({ id: appointment.id, status: 'success' });
        } else {
          console.error('Service Worker: Failed to sync appointment:', appointment.id, response.status);
          syncResults.push({ id: appointment.id, status: 'failed', error: response.status });
        }
      } catch (error) {
        console.error('Service Worker: Error syncing appointment:', appointment.id, error);
        syncResults.push({ id: appointment.id, status: 'error', error: error.message });
      }
    }

    // Remove successfully synced appointments
    const successfulSyncs = syncResults.filter(r => r.status === 'success').map(r => r.id);
    if (successfulSyncs.length > 0) {
      await removeStoredData('offline-appointments', successfulSyncs);
    }

    // Notify main thread about sync results
    await notifyClients('appointment-sync-complete', { results: syncResults });

  } catch (error) {
    console.error('Service Worker: Failed to sync offline appointments:', error);
    throw error;
  }
}

// Sync offline reviews and ratings
async function syncOfflineReviews() {
  console.log('Service Worker: Syncing offline reviews');

  try {
    const offlineReviews = await getStoredData('offline-reviews');

    if (!offlineReviews || offlineReviews.length === 0) {
      console.log('Service Worker: No offline reviews to sync');
      return;
    }

    const syncResults = [];

    for (const review of offlineReviews) {
      try {
        const response = await fetch('/api/ratings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${review.token}`
          },
          body: JSON.stringify(review.data)
        });

        if (response.ok) {
          console.log('Service Worker: Review synced successfully:', review.id);
          syncResults.push({ id: review.id, status: 'success' });
        } else {
          console.error('Service Worker: Failed to sync review:', review.id, response.status);
          syncResults.push({ id: review.id, status: 'failed', error: response.status });
        }
      } catch (error) {
        console.error('Service Worker: Error syncing review:', review.id, error);
        syncResults.push({ id: review.id, status: 'error', error: error.message });
      }
    }

    // Remove successfully synced reviews
    const successfulSyncs = syncResults.filter(r => r.status === 'success').map(r => r.id);
    if (successfulSyncs.length > 0) {
      await removeStoredData('offline-reviews', successfulSyncs);
    }

    // Notify main thread about sync results
    await notifyClients('review-sync-complete', { results: syncResults });

  } catch (error) {
    console.error('Service Worker: Failed to sync offline reviews:', error);
    throw error;
  }
}

// Sync offline analytics data
async function syncOfflineAnalytics() {
  console.log('Service Worker: Syncing offline analytics');

  try {
    const offlineAnalytics = await getStoredData('offline-analytics');

    if (!offlineAnalytics || offlineAnalytics.length === 0) {
      console.log('Service Worker: No offline analytics to sync');
      return;
    }

    // Batch analytics data for efficiency
    const batchedData = {
      events: offlineAnalytics.map(item => item.data),
      timestamp: Date.now()
    };

    const response = await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batchedData)
    });

    if (response.ok) {
      console.log('Service Worker: Analytics synced successfully');
      await clearStoredData('offline-analytics');
      await notifyClients('analytics-sync-complete', { status: 'success' });
    } else {
      console.error('Service Worker: Failed to sync analytics:', response.status);
      throw new Error(`Analytics sync failed: ${response.status}`);
    }

  } catch (error) {
    console.error('Service Worker: Failed to sync offline analytics:', error);
    throw error;
  }
}

// Sync offline form submissions
async function syncOfflineForms() {
  console.log('Service Worker: Syncing offline forms');

  try {
    const offlineForms = await getStoredData('offline-forms');

    if (!offlineForms || offlineForms.length === 0) {
      console.log('Service Worker: No offline forms to sync');
      return;
    }

    const syncResults = [];

    for (const form of offlineForms) {
      try {
        const response = await fetch(form.endpoint, {
          method: form.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(form.token && { 'Authorization': `Bearer ${form.token}` })
          },
          body: JSON.stringify(form.data)
        });

        if (response.ok) {
          console.log('Service Worker: Form synced successfully:', form.id);
          syncResults.push({ id: form.id, status: 'success' });
        } else {
          console.error('Service Worker: Failed to sync form:', form.id, response.status);
          syncResults.push({ id: form.id, status: 'failed', error: response.status });
        }
      } catch (error) {
        console.error('Service Worker: Error syncing form:', form.id, error);
        syncResults.push({ id: form.id, status: 'error', error: error.message });
      }
    }

    // Remove successfully synced forms
    const successfulSyncs = syncResults.filter(r => r.status === 'success').map(r => r.id);
    if (successfulSyncs.length > 0) {
      await removeStoredData('offline-forms', successfulSyncs);
    }

    // Notify main thread about sync results
    await notifyClients('form-sync-complete', { results: syncResults });

  } catch (error) {
    console.error('Service Worker: Failed to sync offline forms:', error);
    throw error;
  }
}

// Sync offline notifications
async function syncOfflineNotifications() {
  console.log('Service Worker: Syncing offline notifications');

  try {
    const offlineNotifications = await getStoredData('offline-notifications');

    if (!offlineNotifications || offlineNotifications.length === 0) {
      console.log('Service Worker: No offline notifications to sync');
      return;
    }

    // Mark notifications as read/seen
    for (const notification of offlineNotifications) {
      try {
        const response = await fetch(`/api/notifications/${notification.id}/mark-read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notification.token}`
          }
        });

        if (response.ok) {
          console.log('Service Worker: Notification marked as read:', notification.id);
        }
      } catch (error) {
        console.error('Service Worker: Error marking notification as read:', notification.id, error);
      }
    }

    await clearStoredData('offline-notifications');
    await notifyClients('notification-sync-complete', { status: 'success' });

  } catch (error) {
    console.error('Service Worker: Failed to sync offline notifications:', error);
    throw error;
  }
}

// Helper functions for IndexedDB operations
async function getStoredData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LunaraOfflineDB', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }

      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      const storeNames = ['offline-appointments', 'offline-reviews', 'offline-analytics', 'offline-forms', 'offline-notifications'];

      storeNames.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      });
    };
  });
}

async function removeStoredData(storeName, ids) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LunaraOfflineDB', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const deletePromises = ids.map(id => {
        return new Promise((resolveDelete, rejectDelete) => {
          const deleteRequest = store.delete(id);
          deleteRequest.onsuccess = () => resolveDelete();
          deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
        });
      });

      Promise.all(deletePromises)
        .then(() => resolve())
        .catch(reject);
    };
  });
}

async function clearStoredData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LunaraOfflineDB', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

// Notify all clients about sync results
async function notifyClients(type, data) {
  const clients = await self.clients.matchAll();

  clients.forEach(client => {
    client.postMessage({
      type: type,
      data: data,
      timestamp: Date.now()
    });
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: '/icons/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/xmark.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/notifications')
    );
  }
});

// Message handling for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    event.waitUntil(updateCache());
  }
});

async function updateCache() {
  console.log('Service Worker: Updating cache...');
  
  try {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
    console.log('Service Worker: Cache updated');
  } catch (error) {
    console.error('Service Worker: Cache update failed', error);
  }
}

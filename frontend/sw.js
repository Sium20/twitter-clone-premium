// Service Worker for TwitterClone PWA
const CACHE_NAME = 'twitterclone-v1.1.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/manifest.json'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    '/api/posts',
    '/api/profile'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static files');
            return cache.addAll(STATIC_FILES);
        }).then(() => {
            return self.skipWaiting(); // Activate immediately
        }).catch((error) => {
            console.error('[SW] Cache installation failed:', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // Take control immediately
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticFile(request.url)) {
        // Cache First strategy for static files
        event.respondWith(cacheFirst(request));
    } else if (isAPIRequest(request.url)) {
        // Network First strategy for API calls
        event.respondWith(networkFirst(request));
    } else {
        // Stale While Revalidate for other resources
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Check if request is for a static file
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file)) || 
           url.includes('.css') || 
           url.includes('.js') || 
           url.includes('.png') || 
           url.includes('.jpg') || 
           url.includes('.ico');
}

// Check if request is for API
function isAPIRequest(url) {
    return url.includes('/api/') || API_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

// Cache First strategy - good for static files
async function cacheFirst(request) {
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
        console.error('[SW] Cache first failed:', error);
        return new Response('Offline - content not available', { status: 503 });
    }
}

// Network First strategy - good for API calls
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback for API requests
        if (request.url.includes('/api/posts')) {
            return new Response(JSON.stringify({
                posts: [],
                message: 'Offline - showing cached posts'
            }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        }
        
        return new Response('Offline - no cached content available', { status: 503 });
    }
}

// Stale While Revalidate strategy - good for images and other resources
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => {
        return cachedResponse || new Response('Offline', { status: 503 });
    });
    
    return cachedResponse || fetchPromise;
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'post-sync') {
        event.waitUntil(syncPosts());
    }
});

// Sync posts when back online
async function syncPosts() {
    try {
        // Get pending posts from IndexedDB or localStorage
        const pendingPosts = await getPendingPosts();
        
        for (const post of pendingPosts) {
            try {
                await fetch('/api/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${post.token}`
                    },
                    body: JSON.stringify({ content: post.content })
                });
                
                // Remove from pending posts
                await removePendingPost(post.id);
            } catch (error) {
                console.error('[SW] Failed to sync post:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Post sync failed:', error);
    }
}

// Helper functions for offline post storage
async function getPendingPosts() {
    // Implementation would use IndexedDB or localStorage
    return [];
}

async function removePendingPost(id) {
    // Implementation would remove from IndexedDB or localStorage
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'New activity on TwitterClone!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'twitterclone-notification',
        requireInteraction: true,
        actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('TwitterClone', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling for communication with main app
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_POSTS') {
        // Cache posts data for offline access
        event.waitUntil(cachePosts(event.data.posts));
    }
});

async function cachePosts(posts) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const response = new Response(JSON.stringify({ posts }), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put('/api/posts', response);
    } catch (error) {
        console.error('[SW] Failed to cache posts:', error);
    }
}

// Link to gab ai chat for this update is:
// https://gab.ai/c/696090ba7c05103d5bf8cdc5?public=true
// Titled: Discussion on Code


// Service Worker - sw.js

// Listen for version updates from main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_VERSION') {
        APP_VERSION = event.data.version;
        console.log('Service Worker: Version updated to', APP_VERSION);
    }else if (event.data && event.data.type === 'NETWORK_STATUS'){
        console.log('Service Worker: Network status updated');
    }
});

const STATIC_CACHE_URLS = [
    './',
    './index.html',
    './main.js',
    './inputManager.js',
    './updateManager.js',
    './scanner.js',
    './sheets-client.js',
    './local-storage.js',
    './quagga.js',
    './styles.css',
    './favicon.ico',
    './manifest.json',
    './android-chrome-192x192.png',
    './android-chrome-512x512.png'
];


//let APP_VERSION = '1.1';
let APP_VERSION = 'sw-default';

// Get version from URL or use default
const urlParams = new URL(self.location.href).searchParams;
APP_VERSION = urlParams.get('v') || APP_VERSION;

const CACHE_NAME = 'barcode-reader-cache-v' + APP_VERSION;


// Install - Cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing version', APP_VERSION);
    //self.skipWaiting();  // ← Force immediate activation

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened, adding static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('All assets cached successfully');
                return self.skipWaiting(); // Activate immediately
            })
            .catch(error => {
                console.error('Cache installation error:', error);
                // Don't fail installation - continue with available cache
            })
    );
});

// Fetch - Cache-first strategy with network fallback
self.addEventListener('fetch', async event => {
    console.log('***Fetch event for:', event.request.url);
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Bypass the service worker for Google Scripts
    if (event.request.url.includes('script.google.com')) {
        return; // Let the browser handle the request normally
    }

    // version.json - NEVER cache, always fetch fresh over the network
    const url = new URL(event.request.url);
    console.log('Fetch event for:', url.pathname);

    const IS_PRODUCTION = self.location.hostname !== 'localhost';
    if (!IS_PRODUCTION) {
        // Development: Bypass cache for all requests to ensure latest code is always used
        console.log('Development mode - bypassing cache for fetching files');
        event.respondWith(
            fetch(event.request)  // Bypass cache entirely
        );
        return;
    } 
    
    if (url.pathname.endsWith('version.json')) {
        event.respondWith(
            fetch(event.request)  // Bypass cache entirely
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if found
                if (response) {
                    console.log('Serving from cache:', event.request.url);
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                            console.log('Fetched from network and cached:', event.request.url);
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.warn('Network failed for:', event.request.url, error);
                        
                        // Special handling for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        // Return offline page for HTML requests
                        if (event.request.headers.get('Accept').includes('text/html')) {
                            return caches.match('./index.html');
                        }
                        
                        return new Response('Network error', {
                            status: 503,
                            headers: {'Content-Type': 'text/plain'}
                        });
                    });
            })
    );
});

// Activate - Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating version', APP_VERSION);
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete caches from previous versions
                    if (cacheName.startsWith('barcode-reader-cache-') && 
                        cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        //}).then(() => {
        //    console.log('Activation completed, claiming clients');
        //    return self.clients.claim(); // Take control immediately
        }).then(() => {
            console.log('Activation completed, claiming clients');
            self.clients.claim();
            // Send confirmation to clients for feedback
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'ACTIVATION_COMPLETE',
                        version: APP_VERSION
                    })
                });
            });
            // Also notify cleanup
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage( {
                        type: 'CACHE_CLEANUP_COMPLETE' 
                    })
                });
            });
        })
    );
});






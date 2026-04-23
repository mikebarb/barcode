// ============================================================================
// UPDATE MANAGER & SERVICE WORKER INTEGRATION
// ============================================================================
// Export for manual access if needed 

import { hideUploadDownload, showUploadDownload } from "./main.js";

//window.UpdateManager = UpdateManager;
export class UpdateManager {
    constructor(version = APP_VERSION, online = false) {
        this.currentVersion = version;   // Use passed or global
        //this.isOnline = navigator.onLine;
        this.isOnline = online;         // Use passed or global
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.readyTimeout = 10000; // 10 seconds
        this.updateInProgress = false; // Prevent concurrent updates
        this.toastQueue = []; // Queue for pending toasts
        this.init();
    }
    
    async init() {
        console.log('UpdateManager: Initializing version', this.currentVersion);
        
        // Set up UI first
        // This is the indicators at top of display for online/offline status and update notifications
        // Do not want this for this application
        //this.setupOfflineUI();

        //this.updateConnectivityUI(this.isOnline); // initialise connectivity status in UI
        this.updateConnectivityVersion(this.currentVersion); // initialise version in UI        
        await this.setupEventListeners();
        await this.verifyConnectivityStatus(); // Check initial connectivity and update UI

        // Only try to register if online
        console.log('UpdateManager: Initial connectivity status:', this.isOnline);
        if(this.isOnline) {
            console.log('UpdateManager: Online - attempting Service Worker registration');
            // Register with retry logic for stability
            let retryCount = 0;
            while (retryCount < this.maxRetries) {
                try {
                    await this.registerServiceWorker();
                    break;  // Success - exit retry
                } catch (error) {
                    retryCount++;
                    console.warn(`UpdateManager: Registration attempt ${retryCount} failed:`, error);
                    if (retryCount < this.maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay * retryCount));  // Exponential backoff
                    } else {
                        this.showToast('PWA setup incomplete - app still works but offline features limited.', 'error', 5000);
                    }
                }
            }
        } else {
            console.log('UpdateManager: Offline - SW registration skipped. Cached version active.');
            console.log('ABOUT TO ENTER TRY BLOCK');
            
            // Check if Service Worker API exists
            if (!('serviceWorker' in navigator)) {
                console.log('Update Manager: Service Workers not supported - skipping version retrieval');
                //return null;
            }else{
                try {
                    // Get info about cached SW
                    const cachedVersion = await this.getCachedSWVersion();
                    console.log('Cached SW Version:', cachedVersion);
                    this.version = cachedVersion || this.currentVersion; // Use cached version if available
                    this.updateConnectivityVersion(this.version); // Update version in UI
                } catch (error) {
                    console.log('UpdateManager: Failed to get cached SW version:', error);
                }
            }
        }
        console.log('UpdateManager: Initialization complete');
    }

    async getCachedSWVersion() {
        console.log('UpdateManager: Checking for cached Service Worker version...');
        const registration = await navigator.serviceWorker.getRegistration();
        console.log('Service Worker registration:', registration);
        if (registration && registration.active) {
            const scriptURL = registration.active.scriptURL;
            console.log('Cached SW URL:', scriptURL);
            
            // Extract version from URL if you use ?v=X.X pattern
            const url = new URL(scriptURL);
            const version = url.searchParams.get('v');
            
            return version || 'unknown';
        }
        
        return null;
    }


    async verifyConnectivityStatus() {
        console.log('UpdateManager: Verifying connectivity status...');
        console.log('navigator.onLine:', navigator.onLine);
        try {
            // Lightweight fetch to test connectivity
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            console.log('UpdateManager: Starting fetch...');
            const response = await fetch('/version.json', {
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('UpdateManager: Fetch succeeded, status:', response.status);
            console.log('UpdateManager: Response URL:', response.url);  // Check if from cache
            if (response.ok) {
                console.log('UpdateManager-verifyConnectivityStatus: Connectivity verified - online');
                this.handleOnline();
            } else {
                console.log('UpdateManager-verifyConnectivityStatus: Connectivity verified - offline');
                this.handleOffline();
            }
        } catch (error) {
            // Network failed - definitely offline
            console.log('UpdateManager: Fetch failed:', error.name, error.message);
            this.handleOffline();
        }
    }
    
    async registerServiceWorker() {
        // Check browser support
        if (!('serviceWorker' in navigator)) {
            console.warn('UpdateManager: Service Workers not supported');
            this.showUnsupportedWarning();
            return false;
        }

        this.updateInProgress = true;
        this.showToast('Setting up PWA features ...', 'info', 2000);
        
        try {
            console.log('UpdateManager: Registering Service Worker...');
            //const registration = await navigator.serviceWorker.register('/sw.js');
            const registration = await navigator.serviceWorker.register('/sw.js?v=' + this.currentVersion);
            console.log('UpdateManager: Service Worker registered successfully');
            
            // Monitor registration lifecycle
            //this.monitorRegistration(registration);   // Enhanced with progress
            
            // Set up communication
            this.setupServiceWorkerCommunication();
            
            // Send version information (with timeout protection)
            await this.sendVersionToSW();

            this.showToast('PWA ready for offline use and updates.', 'success', 3000);
            this.updateInProgress = false;
            return true;
            
        } catch (error) {
            console.error('UpdateManager: Service Worker registration failed:', error);
            this.showRegistrationError(error);
            this.updateInProgress = false;
            return false;
        }
    }
/*    
    monitorRegistration(registration) {
        // Listen for updates found
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('UpdateManager: New Service Worker version found');
            this.showToast('New app version detected - installing...', 'info');

            newWorker.addEventListener('statechange', () => {
                switch (newWorker.state) {
                    case 'installing':
                        console.log('UpdateManager: Installing...');
                        this.showToast('Installing update (caching new files)...', 'info', 3000);
                        break;
                    case 'installed':
                        console.log('UpdateManager: Installed - ready to activate');
                        this.showToast('Update ready - click the top bar to apply!', 'success', 4000);
                        break;
                    case 'activating':
                        console.log('UpdateManager: Activating...');
                        this.showToast('Activating update...', 'info', 2000);
                        break;
                    case 'redundant':
                        console.log('UpdateManager: New worker redundant');
                        break;
                }
            });
        });

        // Listen for update detection during periodic checks
        registration.addEventListener('update', () => {
            console.log('UpdateManager: Update available after check');
            this.showUpdateNotification('New version available! Click to install.');
        });
    }
*/    
    setupServiceWorkerCommunication() {
        // Listen for messages FROM Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event.data);
        });
        
        // Listen for when new Service Worker takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('UpdateManager: Active Service Worker changed');
            this.showToast('Update applied successfully! You are now on v' + this.currentVersion, 'success', 4000);
            // Optional: Send ack to SW or refresh UI
            this.checkCurrentVersion();  // Verify post-refresh
            window.location.reload();
        });
    }
    
    handleServiceWorkerMessage(data) {
        console.log('UpdateManager: Message from Service Worker:', data);
        
        switch (data.type) {
            case 'UPDATE_AVAILABLE':
                this.showUpdateNotification(data.message || 'New app version detected - refresh to update.');
                break;
            case 'UPDATE_INSTALLED':
                this.showToast('Update installed successfully - refresh the page to apply.', 'success');
                break;
            case 'ACTIVATION_COMPLETE':
                this.showToast('PWA update activated. Welcome to the latest version!', 'success', 4000);
                break;
            case 'OFFLINE_STATUS':
                this.updateOnlineStatus(!data.isOffline);
                break;
            case 'CACHE_CLEANUP_COMPLETE':
                console.log('Old caches cleaned - storage optimized');
                break;
            default:
                console.log('UpdateManager: Unknown message type:', data.type);
        }
    }
    
    // Enhanced sendVersionToSW with stability checks
    async sendVersionToSW() {
        if (navigator.serviceWorker.controller) {
            this.sendVersionMessage();
            return true;
        }
        
        try {
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), this.readyTimeout))
            ]);
            
            if (registration.active) {
                this.sendVersionMessage();
                return true;
            }
            
            console.warn('UpdateManager: Service Worker registered but not active');
            return false;
            
        } catch (error) {
            console.warn('UpdateManager: SW ready check failed:', error.message);
            // Fallback to any available controller
            setTimeout(() => {
                if (navigator.serviceWorker.controller) {
                    this.sendVersionMessage();
                }
            }, 1000);
            return false;
        }
    }
    
    sendVersionMessage() {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SET_VERSION',
                version: this.currentVersion
            });
            console.log('UpdateManager: Version sent to Service Worker');
        }
    }
    
    setupEventListeners() {
        // Network status monitoring
        window.addEventListener('online', () => {
            //this.handleOnline();
            this.verifyConnectivityStatus(); // Re-verify connectivity to the server
        });
        
        window.addEventListener('offline', () => {
            this.handleOffline();
        });
        
        // Periodic update checks (every 30 minutes when online)
        // Don't need this for this application - updates not time critical.
        //this.setupPeriodicUpdateChecks();
        
        // Visibility change - check for updates when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline && !this.updateInProgress) {
                this.checkForUpdates();
            }
        });
        // Post-refresh version verification
        window.addEventListener('load', () => {
            this.checkCurrentVersion();
        });
    }
    
    handleOnline() {
        this.isOnline = true;
        this.updateOnlineStatus(true);
        console.log('UpdateManager: Online - update checks enabled');
    }
    
    handleOffline() {
        this.isOnline = false;
        this.updateOnlineStatus(false);
        console.log('UpdateManager: Offline - updates paused');
        
        // Notify Service Worker about offline status
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'NETWORK_STATUS',
                isOnline: false
            });
        }

    }

/*    
    setupPeriodicUpdateChecks() {
        // Check every 30 minutes when online
        setInterval(() => {
            if (this.isOnline && !this.updateInProgress) {
                this.checkForUpdates();
            }
        }, 30 * 60 * 1000);
    }
*/    

/*
    setupOfflineUI() {
        // Create offline indicator if it doesn't exist
        if (!document.getElementById('offline-indicator')) {
            const offlineIndicator = document.createElement('div');
            offlineIndicator.id = 'offline-indicator';
            offlineIndicator.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff9800;
                color: white;
                padding: 12px;
                text-align: center;
                z-index: 10000;
                display: none;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            offlineIndicator.innerHTML = '🔒 Offline - Using local data. Sync when online.';
            document.body.appendChild(offlineIndicator);
        }
        
        // Create update available indicator
        if (!document.getElementById('update-indicator')) {
            const updateIndicator = document.createElement('div');
            updateIndicator.id = 'update-indicator';
            updateIndicator.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #4CAF50;
                color: white;
                padding: 12px;
                text-align: center;
                z-index: 10001;
                display: none;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                cursor: pointer;
            `;
            updateIndicator.innerHTML = '🔄 Update Available - Click to Refresh';
            updateIndicator.addEventListener('click', () => {
                this.showToast('Applying update...', 'info');
                window.location.reload();
            });
            document.body.appendChild(updateIndicator);
        }
        
        // Set initial online status
        this.updateOnlineStatus(this.isOnline);
    }
*/    
    updateOnlineStatus(online) {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.style.display = online ? 'none' : 'block';
            //this.updateConnectivityUI(online);
        }
        
        // Update any existing connectivity UI elements
        this.updateConnectivityUI(online);
    }
    
    updateConnectivityUI(online) {
        // Update elements with data-connectivity-status attribute
        const connectivityElements = document.querySelectorAll('[data-connectivity-status]');
        connectivityElements.forEach(element => {
            element.textContent = online ? 'Online' : 'Offline';
            element.className = online ? 'status-online' : 'status-offline';
        });

        // Show or hide upload and download buttons based on online status
        online ? showUploadDownload() : hideUploadDownload();
        
        // Update title or other UI elements as needed
        const title = document.querySelector('title');
        const origTitle = title.getAttribute('data-original-title') || title.textContent;
            title.setAttribute('data-original-title', origTitle);
            title.textContent = online ? origTitle : '🔴 Offline - ' + origTitle.slice(0, -1);  // Trim if needed
    }

    updateConnectivityVersion(version) {
        const versionElements = document.querySelectorAll('[data-connectivity-version]');
        versionElements.forEach(element => {
            element.textContent = version ? `v${version}` : 'v-unknown';
        });
    }

    async checkForUpdates() {
        if (!this.isOnline || this.updateInProgress) {
            console.log('UpdateManager: Skipping update check - offline or in progress');
            return;
        }
        
        console.log('UpdateManager: Checking for updates...');
        this.showToast('Checking for app updates...', 'info', 2000);

        // Fetch the latest version from server
        const response = await fetch('./version.json', { cache: 'no-cache' });
        const data = await response.json();
        console.log('UpdateManager: Current version:', this.currentVersion  , ', Server version:', data.version);

        // If the server version is newer than what we have...
        if (data.version !== this.currentVersion) {
            console.log('UpdateManager: New version detected. Force-registering...');
            // Update the local tracking variable
            this.currentVersion = data.version;
            // Force a re-registration (this creates the new SW URL)
            await this.registerServiceWorker(); 
            console.log('UpdateManager: Service Worker re-registered with new version');
        } else {
            // Otherwise, do the standard SW update check
            const registration = await navigator.serviceWorker.ready;
            await registration.update();
        }
        console.log('UpdateManager: Update check completed');
    }
    
    showUpdateNotification(message) {
        // Show the update indicator
        const updateIndicator = document.getElementById('update-indicator');
        if (updateIndicator) {
            updateIndicator.style.display = 'block';
            updateIndicator.innerHTML = `🔄 ${message} (v${this.currentVersion}) - Click to update`;
            updateIndicator.setAttribute('title', message);
        }
        
        // Also show a toast notification
        //this.showToast(message, 'info', 5000);
    }
    
    showToast(message, type = 'info', duration = 10000) {
        // Sequence toast notifications
        this.toastQueue.push({ message, type, duration });   // Add to queue
        if (this.toastQueue.length === 1) { // If this is the only toast, show it immediately
            this.showToast1();
        }
    }

    //showToast1(message, type = 'info', duration = 3000) {
    showToast1() {
        // Simple toast notification
        if(this.toastQueue.length === 0) return; // No toasts to show
        const { message, type, duration } = this.toastQueue.shift();
        //this.toastInstanceCount = this.toastInstanceCount + 1;
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10002;
            animation: slideIn 0.3s ease;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // simple fade animation
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                toast.style.opacity = '0';
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.showToast1(); // Show next toast in queue
            }, 300);
        }, duration);
    }
    
    showUnsupportedWarning() {
        this.showToast('Service Workers not supported in this browser', 'error', 5000);
    }
    
    showRegistrationError(error) {
        this.showToast('Failed to setup offline functionality: ' + error.message, 'error', 5000);
    }
    
    checkCurrentVersion() {
        // Compare against potential stored version or SW controller
        if (navigator.serviceWorker.controller) {
            this.showToast(`Running PWA version ${this.currentVersion} - up to date.`, 'success', 2000);
        }
    }
    
    // Public: Manual update check (expose for button)
    async manualUpdateCheck() {
        if (this.updateInProgress) {
            this.showToast('Update already in progress.', 'info');
            return;
        }
        await this.checkForUpdates();
    }

    // Public method to get current status
    getStatus() {
        return {
            version: this.currentVersion,
            isOnline: this.isOnline,
            hasServiceWorker: 'serviceWorker' in navigator,
            serviceWorkerReady: !!navigator.serviceWorker.controller,
            updateInProgress: this.updateInProgress
        };
    }
}


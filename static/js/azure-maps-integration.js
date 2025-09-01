/**
 * Azure Maps Complete Integration Module
 * Handles secure API key loading, validation, and map initialization
 * Supports both GitHub Secrets (production) and local .env (development)
 */

class AzureMapsIntegration {
    constructor() {
        this.map = null;
        this.subscriptionKey = null;
        this.initialized = false;
        this.mapContainer = 'map';
        this.defaultCenter = [121.45072731559546, 31.022687981537082];
        this.defaultZoom = 8;
    }

    /**
     * Initialize the complete Azure Maps setup
     */
    async initialize() {
        try {
            console.log('🗺️ Initializing Azure Maps Integration...');
            
            // Load API key from appropriate source
            await this.loadApiKey();
            
            // Initialize the map if container exists
            if (document.getElementById(this.mapContainer)) {
                await this.initializeMap();
            } else {
                console.log('ℹ️ Map container not found, skipping map initialization');
            }
            
            this.initialized = true;
            console.log('✅ Azure Maps Integration initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Azure Maps Integration:', error);
            this.showMapError();
            throw error;
        }
    }

    /**
     * Load API key from various sources with fallback chain
     */
    async loadApiKey() {
        // Try different sources in priority order
        this.subscriptionKey = 
            this.getFromEnvConfig() ||
            this.getFromLocalStorage() ||
            this.getFromDataAttribute() ||
            await this.getFromLocalEnv();

        if (!this.subscriptionKey) {
            const errorMsg = this.isLocalDevelopment() 
                ? 'Azure Maps key not found. For local development, add AZURE_MAPS_SUBSCRIPTION_KEY to your .env file or set localStorage'
                : 'Azure Maps key not found. Ensure GitHub Secret AZURE_MAPS_SUBSCRIPTION_KEY is configured';
            
            throw new Error(errorMsg);
        }

        console.log(`🔑 Azure Maps key loaded (${this.subscriptionKey.substring(0, 8)}...)`);
    }

    /**
     * Get key from global ENV_CONFIG (set by GitHub Actions or env-config.js)
     */
    getFromEnvConfig() {
        if (window.ENV_CONFIG && window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY) {
            const key = window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY;
            if (key && !key.startsWith('${') && key !== 'undefined' && key.trim() !== '') {
                console.log('📝 Using Azure Maps key from ENV_CONFIG');
                return key;
            }
        }
        return null;
    }

    /**
     * Get key from localStorage (local development)
     */
    getFromLocalStorage() {
        if (this.isLocalDevelopment()) {
            const key = localStorage.getItem('AZURE_MAPS_DEV_KEY');
            if (key && key.trim() !== '') {
                console.log('💾 Using Azure Maps key from localStorage');
                return key;
            }
        }
        return null;
    }

    /**
     * Get key from data attribute
     */
    getFromDataAttribute() {
        const configElement = document.querySelector('[data-azure-maps-key]');
        if (configElement) {
            const key = configElement.getAttribute('data-azure-maps-key');
            if (key && key.trim() !== '') {
                console.log('🏷️ Using Azure Maps key from data attribute');
                return key;
            }
        }
        return null;
    }

    /**
     * Try to get key from local .env via a simple fetch (for development server that supports it)
     */
    async getFromLocalEnv() {
        if (!this.isLocalDevelopment()) {
            return null;
        }

        try {
            // Try to fetch from a local endpoint that might serve env vars
            const response = await fetch('/api/env/AZURE_MAPS_SUBSCRIPTION_KEY', {
                method: 'GET',
                headers: { 'Accept': 'text/plain' }
            });
            
            if (response.ok) {
                const key = await response.text();
                if (key && key.trim() !== '') {
                    console.log('🌐 Using Azure Maps key from local env endpoint');
                    return key.trim();
                }
            }
        } catch (error) {
            // Local env endpoint not available, that's fine
            console.log('🔍 Local env endpoint not available, using fallback methods');
        }
        
        return null;
    }

    /**
     * Check if running in local development
     */
    isLocalDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }

    /**
     * Initialize the Azure Maps instance
     */
    async initializeMap() {
        if (!this.subscriptionKey) {
            throw new Error('Cannot initialize map without subscription key');
        }

        try {
            console.log('🗺️ Creating Azure Maps instance...');
            
            // Create the map instance
            this.map = new atlas.Map(this.mapContainer, {
                center: this.defaultCenter,
                zoom: this.defaultZoom,
                view: "Auto",
                language: 'en-US',
                authOptions: {
                    authType: 'subscriptionKey',
                    subscriptionKey: this.subscriptionKey
                }
            });

            // Wait until the map resources are ready
            return new Promise((resolve, reject) => {
                this.map.events.add('ready', () => {
                    try {
                        this.onMapReady();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                // Add error handling
                this.map.events.add('error', (error) => {
                    console.error('Map error:', error);
                    reject(new Error('Map failed to load'));
                });
            });
            
        } catch (error) {
            console.error('Failed to create Azure Maps instance:', error);
            throw error;
        }
    }

    /**
     * Handle map ready event and set up controls
     */
    onMapReady() {
        try {
            // Create a HTML marker and add it to the map
            this.map.markers.add(new atlas.HtmlMarker({
                htmlContent: "<div><div class='pin bounce'></div><div class='pulse'></div></div>",
                position: this.defaultCenter,
                pixelOffset: [5, -18]
            }));

            // Add map controls
            this.map.controls.add([
                new atlas.control.ZoomControl(),
                new atlas.control.CompassControl(),
                new atlas.control.PitchControl(),
                new atlas.control.StyleControl()
            ], {
                position: "top-right"
            });

            console.log('✅ Azure Maps ready and configured');
            
        } catch (error) {
            console.error('Error setting up map controls:', error);
            throw error;
        }
    }

    /**
     * Show error message when map fails to load
     */
    showMapError() {
        const mapContainer = document.getElementById(this.mapContainer);
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 200px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
                    <div style="text-align: center; color: #6c757d;">
                        <i class="fa fa-map-marker" style="font-size: 2em; margin-bottom: 10px;"></i>
                        <p>Map temporarily unavailable</p>
                        <small>Please check your connection and try again</small>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Validate current setup and provide diagnostics
     */
    validateSetup() {
        console.log('🔍 Azure Maps Configuration Validator');
        console.log('=====================================');
        
        const isLocal = this.isLocalDevelopment();
        console.log(`Environment: ${isLocal ? 'Local Development' : 'Production'}`);
        
        // Check ENV_CONFIG
        if (window.ENV_CONFIG) {
            console.log('✅ ENV_CONFIG exists');
            const key = window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY;
            if (key) {
                if (key.startsWith('${')) {
                    console.log('❌ Key is still a placeholder - GitHub Actions may not have replaced it');
                    console.log('   Make sure GitHub Secret AZURE_MAPS_SUBSCRIPTION_KEY is set');
                } else if (key === 'undefined' || key.trim() === '') {
                    console.log('❌ Key is undefined or empty');
                } else {
                    console.log('✅ Key found in ENV_CONFIG');
                    console.log(`   Key preview: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
                }
            } else {
                console.log('❌ No AZURE_MAPS_SUBSCRIPTION_KEY in ENV_CONFIG');
            }
        } else {
            console.log('❌ ENV_CONFIG not found - env-config.js may not be loaded');
        }
        
        // Check localStorage for local development
        if (isLocal) {
            const localKey = localStorage.getItem('AZURE_MAPS_DEV_KEY');
            if (localKey) {
                console.log('✅ Local development key found in localStorage');
            } else {
                console.log('❌ No local development key in localStorage');
                console.log('   Run: localStorage.setItem("AZURE_MAPS_DEV_KEY", "your-key-here")');
            }
        }
        
        // Test current instance
        if (this.initialized) {
            console.log('✅ Azure Maps Integration initialized successfully');
            if (this.subscriptionKey) {
                console.log(`   Using key: ${this.subscriptionKey.substring(0, 8)}...${this.subscriptionKey.substring(this.subscriptionKey.length - 4)}`);
            }
            if (this.map) {
                console.log('✅ Map instance created successfully');
            }
        } else {
            console.log('❌ Azure Maps Integration not initialized');
            
            // Provide specific guidance
            if (isLocal) {
                console.log('💡 For local development:');
                console.log('   1. Add AZURE_MAPS_SUBSCRIPTION_KEY to your .env file, OR');
                console.log('   2. Set localStorage: localStorage.setItem("AZURE_MAPS_DEV_KEY", "your-key")');
                console.log('   3. Refresh the page');
            } else {
                console.log('💡 For production:');
                console.log('   1. Set GitHub Secret: AZURE_MAPS_SUBSCRIPTION_KEY');
                console.log('   2. Redeploy the site');
            }
        }
        
        console.log('=====================================');
        return this.initialized;
    }

    /**
     * Update map center location
     */
    setCenter(longitude, latitude) {
        if (this.map) {
            this.map.setCamera({
                center: [longitude, latitude]
            });
        }
    }

    /**
     * Update map zoom level
     */
    setZoom(zoom) {
        if (this.map) {
            this.map.setCamera({
                zoom: zoom
            });
        }
    }

    /**
     * Get the current subscription key
     */
    getSubscriptionKey() {
        return this.subscriptionKey;
    }

    /**
     * Check if the integration is properly initialized
     */
    isInitialized() {
        return this.initialized;
    }
}

// Global instance
let azureMapsIntegration = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        azureMapsIntegration = new AzureMapsIntegration();
        await azureMapsIntegration.initialize();
        
        // Make it globally available
        window.azureMapsIntegration = azureMapsIntegration;
        
        // Legacy compatibility
        window.azureMaps = azureMapsIntegration;
        window.validateAzureMapsSetup = () => azureMapsIntegration.validateSetup();
        
    } catch (error) {
        console.error('Failed to initialize Azure Maps:', error);
        
        // Still make the instance available for debugging
        if (azureMapsIntegration) {
            window.azureMapsIntegration = azureMapsIntegration;
            window.validateAzureMapsSetup = () => azureMapsIntegration.validateSetup();
        }
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AzureMapsIntegration;
}

// Export for global usage
window.AzureMapsIntegration = AzureMapsIntegration;

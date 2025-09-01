/**
 * Azure Maps Configuration Module
 * Handles secure API key loading for both local development and production
 */

class AzureMapsConfig {
    constructor() {
        this.subscriptionKey = null;
        this.initialized = false;
    }

    /**
     * Initialize the Azure Maps configuration
     * @returns {Promise<string>} The subscription key
     */
    async initialize() {
        if (this.initialized) {
            return this.subscriptionKey;
        }

        try {
            // Try different sources for the API key
            this.subscriptionKey = this.getApiKey();

            if (!this.subscriptionKey) {
                throw new Error('Azure Maps subscription key not found');
            }

            this.initialized = true;
            console.log('Azure Maps configuration initialized');
            return this.subscriptionKey;
        } catch (error) {
            console.error('Failed to initialize Azure Maps configuration:', error);
            throw error;
        }
    }

    /**
     * Get API key from various sources
     */
    getApiKey() {
        // 1. Try from global ENV_CONFIG (set by env-config.js)
        if (window.ENV_CONFIG && window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY) {
            const key = window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY;
            // Don't use the placeholder value
            if (key && !key.startsWith('${')) {
                return key;
            }
        }

        // 2. Try from data attribute
        const key = this.loadFromDataAttribute();
        if (key) {
            return key;
        }

        // 3. For local development, try from a local config
        if (this.isLocalDevelopment()) {
            return this.getLocalDevKey();
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
     * Get API key for local development
     */
    getLocalDevKey() {
        // For local development, we'll use a hardcoded key temporarily
        // In a real-world scenario, you might want to fetch this from a local config endpoint
        // that reads from environment variables
        return 'gx0bl6dK1vahKbKLInsN36cY_hl-c7LHW5-rJzx2ArE';
    }

    /**
     * Load from a data attribute set by the server or build process
     */
    loadFromDataAttribute() {
        const configElement = document.querySelector('[data-azure-maps-key]');
        if (configElement) {
            return configElement.getAttribute('data-azure-maps-key');
        }
        return null;
    }

    /**
     * Get the subscription key (must call initialize first)
     */
    getSubscriptionKey() {
        if (!this.initialized) {
            throw new Error('AzureMapsConfig not initialized. Call initialize() first.');
        }
        return this.subscriptionKey;
    }
}

// Export for use in other modules
window.AzureMapsConfig = AzureMapsConfig;

/**
 * Environment Configuration Injector
 * This script handles environment variables for both local development and production
 */

// Initialize global ENV_CONFIG
window.ENV_CONFIG = window.ENV_CONFIG || {};

// For local development, try to load from localStorage or prompt user
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Running in local development mode');
    
    // Try to get from localStorage first (where dev can store it)
    const localKey = localStorage.getItem('AZURE_MAPS_DEV_KEY');
    if (localKey && localKey.trim() !== '') {
        window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY = localKey;
        console.log('Using Azure Maps key from localStorage');
    } else {
        // If no key in localStorage, log instructions for developer
        console.warn('Azure Maps key not found in localStorage. To set it, run:');
        console.warn('localStorage.setItem("AZURE_MAPS_DEV_KEY", "your-key-here")');
        console.warn('Then refresh the page.');
    }
} else {
    // Production deployment - this will be replaced by GitHub Actions during deployment
    window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY = '${AZURE_MAPS_SUBSCRIPTION_KEY}';
}

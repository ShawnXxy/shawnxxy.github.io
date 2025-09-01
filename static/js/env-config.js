/**
 * Environment Configuration Injector for Local Development
 * This script injects environment variables into the page for local development
 */

// This will be populated by the development server or build process
window.ENV_CONFIG = window.ENV_CONFIG || {};

// For local development, we'll try to load from a local config endpoint
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // In local development, we'll use a different approach
    // Since we can't directly access process.env in the browser,
    // we'll create a config endpoint or use a build-time replacement
    console.log('Running in local development mode');
}

// Fallback configuration for GitHub Pages
if (!window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY) {
    // This will be replaced by GitHub Actions during deployment
    window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY = '${AZURE_MAPS_SUBSCRIPTION_KEY}';
}

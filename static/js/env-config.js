/**
 * Environment Configuration Injector
 * This script handles environment variables for both local development and production
 * 
 * Local Development (supports both methods):
 * 1. Via dev.ps1 script (recommended) - injects values from .env file
 * 2. Direct Python server - fetches .env file via browser
 * 
 * Production (GitHub Pages):
 * - Uses GitHub Secrets injected by GitHub Actions during deployment
 */

// Initialize global ENV_CONFIG
window.ENV_CONFIG = window.ENV_CONFIG || {};

// Check if running in local development
const isLocalDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';

if (isLocalDevelopment) {
    console.log('🔧 Running in local development mode');
    
    // Method 1: Check if dev.ps1 already injected the key
    const injectedKey = '${AZURE_MAPS_SUBSCRIPTION_KEY}';
    if (!injectedKey.startsWith('${')) {
        // Key was successfully injected by dev.ps1
        window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY = injectedKey;
        console.log('✅ Using Azure Maps key from dev.ps1 injection');
    } else {
        // Method 2: dev.ps1 not used, try to load .env file directly
        console.log('🔍 dev.ps1 not used, attempting to load .env file...');
        loadEnvFile();
    }
} else {
    // Production deployment on GitHub Pages
    // This placeholder will be replaced by GitHub Actions during deployment
    console.log('🌐 Running in production mode');
    window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY = '${AZURE_MAPS_SUBSCRIPTION_KEY}';
    
    // Validate that the key was properly injected
    if (window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY.startsWith('${')) {
        console.error('❌ Azure Maps key not properly injected. Check GitHub Actions configuration.');
        window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY = null;
    }
}

/**
 * Load environment variables from .env file for direct Python server usage
 */
async function loadEnvFile() {
    try {
        const response = await fetch('.env');
        if (response.ok) {
            const envContent = await response.text();
            const envVars = parseEnvFile(envContent);
            
            if (envVars.AZURE_MAPS_SUBSCRIPTION_KEY) {
                window.ENV_CONFIG.AZURE_MAPS_SUBSCRIPTION_KEY = envVars.AZURE_MAPS_SUBSCRIPTION_KEY;
                console.log('✅ Loaded Azure Maps key from .env file');
            } else {
                console.warn('⚠️ AZURE_MAPS_SUBSCRIPTION_KEY not found in .env file');
            }
        } else {
            console.warn('⚠️ .env file not accessible. Using fallback methods...');
            showEnvInstructions();
        }
    } catch (error) {
        console.warn('⚠️ Failed to load .env file:', error.message);
        showEnvInstructions();
    }
}

/**
 * Parse .env file content into key-value pairs
 */
function parseEnvFile(content) {
    const envVars = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }
        
        // Parse KEY=VALUE format
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            envVars[key] = value;
        }
    }
    
    return envVars;
}

/**
 * Show instructions for setting up environment variables
 */
function showEnvInstructions() {
    console.warn('📋 Environment Setup Instructions:');
    console.warn('Option 1 (Recommended): Use dev.ps1 script');
    console.warn('  1. Add AZURE_MAPS_SUBSCRIPTION_KEY=your-key to .env file');
    console.warn('  2. Run: .\\dev.ps1 static');
    console.warn('');
    console.warn('Option 2: Direct Python server');
    console.warn('  1. Add AZURE_MAPS_SUBSCRIPTION_KEY=your-key to .env file');
    console.warn('  2. Run: python -m http.server 8000');
    console.warn('  3. Make sure .env file is accessible via HTTP');
}


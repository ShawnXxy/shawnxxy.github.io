/**
 * Azure Maps Setup Validator
 * Run this in browser console to test your Azure Maps configuration
 */

function validateAzureMapsSetup() {
    console.log('🔍 Azure Maps Configuration Validator');
    console.log('=====================================');
    
    // Check if we're in local or production environment
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
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
    
    // Test AzureMapsConfig if available
    if (window.AzureMapsConfig) {
        console.log('✅ AzureMapsConfig class available');
        
        try {
            const config = new window.AzureMapsConfig();
            config.initialize().then(key => {
                console.log('✅ Azure Maps initialization successful');
                console.log(`   Using key: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
            }).catch(error => {
                console.log('❌ Azure Maps initialization failed:', error.message);
                
                // Provide specific guidance
                if (isLocal) {
                    console.log('💡 For local development:');
                    console.log('   localStorage.setItem("AZURE_MAPS_DEV_KEY", "your-azure-maps-key")');
                } else {
                    console.log('💡 For production:');
                    console.log('   1. Set GitHub Secret: AZURE_MAPS_SUBSCRIPTION_KEY');
                    console.log('   2. Redeploy the site');
                }
            });
        } catch (error) {
            console.log('❌ Error testing AzureMapsConfig:', error.message);
        }
    } else {
        console.log('❌ AzureMapsConfig not available - azure-maps-config.js may not be loaded');
    }
    
    console.log('=====================================');
}

// Auto-run validator when this script is loaded in browser console
// validateAzureMapsSetup();

// Make it available globally for manual testing
window.validateAzureMapsSetup = validateAzureMapsSetup;

console.log('Azure Maps validator loaded. Run validateAzureMapsSetup() to test your setup.');

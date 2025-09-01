/**
 * Azure Maps Integration Module
 * Handles map initialization with secure API key management
 */

class AzureMapsManager {
    constructor() {
        this.map = null;
        this.config = new AzureMapsConfig();
        this.mapContainer = 'map';
        this.defaultCenter = [121.45072731559546, 31.022687981537082];
        this.defaultZoom = 8;
    }

    /**
     * Initialize the Azure Maps instance
     */
    async initializeMap() {
        try {
            // Initialize configuration and get the API key
            const subscriptionKey = await this.config.initialize();
            
            console.log('Initializing Azure Maps...');
            
            // Create the map instance
            this.map = new atlas.Map(this.mapContainer, {
                center: this.defaultCenter,
                zoom: this.defaultZoom,
                view: "Auto",
                language: 'en-US',
                authOptions: {
                    authType: 'subscriptionKey',
                    subscriptionKey: subscriptionKey
                }
            });

            // Wait until the map resources are ready
            this.map.events.add('ready', () => {
                this.onMapReady();
            });

            console.log('Azure Maps initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Azure Maps:', error);
            this.showMapError();
        }
    }

    /**
     * Handle map ready event
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

            console.log('Azure Maps ready and configured');
            
        } catch (error) {
            console.error('Error setting up map controls:', error);
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
}

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if the map container exists
    if (document.getElementById('map')) {
        const azureMaps = new AzureMapsManager();
        azureMaps.initializeMap();
        
        // Make it globally available for debugging
        window.azureMaps = azureMaps;
    }
});

// Export for use in other modules
window.AzureMapsManager = AzureMapsManager;

// map.js
class MapVisualization {
    constructor() {
        this.map = null;
        this.dataLayer = null;
        this.zipBoundaries = null;
        this.init();
    }

    async init() {
        // Initialize the map
        this.map = L.map('map', {
            center: CONFIG.map.center,
            zoom: CONFIG.map.zoom,
            maxZoom: CONFIG.map.maxZoom,
            minZoom: CONFIG.map.minZoom
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Initialize empty GeoJSON layer with interaction options
        this.dataLayer = L.geoJSON(null, {
            style: this.styleFeature.bind(this),
            onEachFeature: this.onEachFeature.bind(this)
        }).addTo(this.map);

        // Load ZIP code boundaries
        await this.loadZipBoundaries();
    }

    async loadZipBoundaries() {
        try {
            const response = await fetch('data/processed/zip_permits.geojson');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.zipBoundaries = await response.json();
            console.log('Loaded ZIP boundaries:', this.zipBoundaries); // Debug log
        } catch (error) {
            console.error('Error loading ZIP boundaries:', error);
            console.error('Response:', error.response); // More debug info
        }
    }

    styleFeature(feature) {
        const density = feature.properties.permit_count || 0;
        return {
            fillColor: this.getColor(density),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }

    getColor(density) {
        const colors = CONFIG.colors.heatmap;
        if (density === 0) return colors[0];
        if (density <= 2) return colors[1];
        if (density <= 5) return colors[2];
        if (density <= 10) return colors[3];
        return colors[4];
    }

    onEachFeature(feature, layer) {
        // Add popup with information
        layer.bindPopup(`
            <strong>ZIP Code:</strong> ${feature.properties.zipCode}<br>
            <strong>Permits:</strong> ${feature.properties.permit_count}
        `);

        // Add hover effects
        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 2,
                    fillOpacity: 0.9
                });
            },
            mouseout: (e) => {
                this.dataLayer.resetStyle(e.target);
            }
        });
    }

    updateMap(data) {
        // Clear existing data
        this.dataLayer.clearLayers();
        
        // Add new data if available
        if (data && data.length > 0) {
            const geoJsonData = this.convertToGeoJSON(data);
            this.dataLayer.addData(geoJsonData);
            
            // Fit map to data bounds
            const bounds = this.dataLayer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds);
            }
        }
    }

    convertToGeoJSON(data) {
        // Group data by ZIP code
        const zipGroups = {};
        data.forEach(d => {
            if (!zipGroups[d['ZipCode(s)']]) {
                zipGroups[d['ZipCode(s)']] = 0;
            }
            zipGroups[d['ZipCode(s)']] += d.permit_count;
        });

        // Create GeoJSON features using ZIP boundaries
        const features = [];
        if (this.zipBoundaries && this.zipBoundaries.features) {
            this.zipBoundaries.features.forEach(boundary => {
                const zipCode = boundary.properties.zipcode;
                if (zipGroups[zipCode]) {
                    features.push({
                        type: "Feature",
                        properties: {
                            zipCode: zipCode,
                            permit_count: zipGroups[zipCode]
                        },
                        geometry: boundary.geometry
                    });
                }
            });
        }

        return {
            type: "FeatureCollection",
            features: features
        };
    }
}


// Initialize the map when the page loads
let mapViz;
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // First initialize data manager
        window.dataManager = new DataManager();
        await dataManager.loadData();
        
        // Then initialize map
        window.mapViz = new MapVisualization();
        await mapViz.loadZipBoundaries();
        
        // Finally initialize controls
        initializeControls();
        
        // Initial map update
        mapViz.updateMap(dataManager.getFilteredData());
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
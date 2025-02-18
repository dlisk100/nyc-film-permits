// map.js
class MapVisualization {
    constructor(dataManager) {
        this.map = null;
        this.dataLayer = null;
        this.zipBoundaries = null;
        this.legend = null;
        this.maxTotalPermits = 0;
        this.dataManager = dataManager;
    }

    async init() {
        this.map = L.map('map', {
            center: CONFIG.map.center,
            zoom: CONFIG.map.zoom,
            maxZoom: CONFIG.map.maxZoom,
            minZoom: CONFIG.map.minZoom
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ' Leaflet | OpenStreetMap contributors',
            position: 'bottomright',
            className: 'map-attribution',
            opacity: 1
        }).addTo(this.map);

        // Ensure attribution control is in the correct position
        this.map.attributionControl.setPosition('bottomright');

        await this.loadZipBoundaries();  // Make sure boundaries are loaded first

        this.dataLayer = L.geoJSON(this.zipBoundaries, {
            style: this.styleFeature.bind(this),
            onEachFeature: this.onEachFeature.bind(this)
        }).addTo(this.map);

        this.updateLegend();
    }

    async loadZipBoundaries() {
        try {
            const response = await fetch('../../data_processing/data/processed/zip_permits.geojson');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            this.zipBoundaries = await response.json();
            const allTotals = this.zipBoundaries.features
                .map(f => f.properties.total_permits || 0)
                .sort((a, b) => a - b);

            this.maxTotalPermits = Math.max(...allTotals);
            
        } catch (error) {
            console.error('Error loading ZIP boundaries:', error);
        }
    }

    styleFeature(feature) {
        const isAllTime = this.dataManager.currentWeek === 0;
        const totalPermits = feature.properties.total_permits || 0;
        const weeklyPermits = feature.properties.permit_count || 0;

        return {
            fillColor: this.getColor(isAllTime ? totalPermits : weeklyPermits, isAllTime),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }

    getColor(value, isAllTime = false) {
        const colors = CONFIG.colors.heatmap;
        
        if (isAllTime) {
            // Use the new breaks for all-time view
            const breaks = CONFIG.colors.breaks;
            for (let i = 0; i < breaks.length - 1; i++) {
                if (value <= breaks[i + 1]) {
                    return colors[i];
                }
            }
            return colors[colors.length - 1];
        }

        // Weekly view - preserve original behavior
        if (value <= 0) return colors[0];
        if (value <= 1) return colors[1];
        if (value <= 3) return colors[2];
        if (value <= 6) return colors[3];
        if (value <= 10) return colors[4];
        if (value <= 15) return colors[5];
        return colors[6];  // > 15
    }

    onEachFeature(feature, layer) {
        const zipCode = feature.properties.postalCode;
        layer.bindPopup(this.getPopupContent(zipCode, feature.properties.total_permits || 0));

        layer.on({
            mouseover: e => e.target.setStyle({
                weight: 2,
                fillOpacity: 0.9
            }),
            mouseout: e => this.dataLayer.resetStyle(e.target)
        });
    }

    updateMap(weeklyData) {
        // Check if map and data layer are initialized
        if (!this.dataLayer || !this.zipBoundaries) {
            console.log('Map not fully initialized yet, skipping update');
            return;
        }

        console.log('Received data sample:', weeklyData.slice(0, 3));

        // Create a map of zip codes to permit counts from the filtered data
        const permitCounts = weeklyData.reduce((acc, item) => {
            const zip = String(item["ZipCode(s)"]).trim();
            const count = item.permit_count || 0;
            acc[zip] = (acc[zip] || 0) + count;
            return acc;
        }, {});

        console.log('Permit counts sample:', Object.entries(permitCounts).slice(0, 3));

        this.dataLayer.eachLayer(layer => {
            const zipCode = String(layer.feature.properties.postalCode).trim();
            const permits = permitCounts[zipCode] || 0;
            console.log(`Zip ${zipCode}: ${permits} permits`);

            layer.feature.properties.permit_count = permits;
            layer.setStyle({
                fillColor: this.getColor(permits, this.dataManager.currentWeek === 0)
            }).setPopupContent(this.getPopupContent(zipCode, permits));
        });

        this.updateLegend();
    }

    getPopupContent(zipCode, permits) {
        return this.dataManager.currentWeek === 0
            ? `<strong>ZIP Code:</strong> ${zipCode}<br>
               <strong>Total Permits:</strong> ${permits}`
            : `<strong>ZIP Code:</strong> ${zipCode}<br>
               <strong>Weekly Permits:</strong> ${permits}`;
    }

    updateLegend() {
        if (this.legend) this.map.removeControl(this.legend);
        
        this.legend = L.control({ position: 'bottomright' });
        this.legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');
            const colors = CONFIG.colors.heatmap;
            
            if (this.dataManager.currentWeek === 0) {
                // All-time view legend
                const breaks = CONFIG.colors.breaks;
                div.innerHTML = `
                    <h4>Total Permits</h4>
                    <div><i style="background:${colors[0]}"></i> 0</div>
                    <div><i style="background:${colors[1]}"></i> 1-${breaks[2]}</div>
                    <div><i style="background:${colors[2]}"></i> ${breaks[2]}-${breaks[3]}</div>
                    <div><i style="background:${colors[3]}"></i> ${breaks[3]}-${breaks[4]}</div>
                    <div><i style="background:${colors[4]}"></i> ${breaks[4]}-${breaks[5]}</div>
                    <div><i style="background:${colors[5]}"></i> ${breaks[5]}-${breaks[6]}</div>
                    <div><i style="background:${colors[6]}"></i> >${breaks[6]}</div>
                `;
            } else {
                // Weekly view legend
                div.innerHTML = `
                    <h4>Weekly Permits</h4>
                    <div><i style="background:${colors[0]}"></i> 0</div>
                    <div><i style="background:${colors[1]}"></i> 1</div>
                    <div><i style="background:${colors[2]}"></i> 2-3</div>
                    <div><i style="background:${colors[3]}"></i> 4-6</div>
                    <div><i style="background:${colors[4]}"></i> 7-10</div>
                    <div><i style="background:${colors[5]}"></i> 11-15</div>
                    <div><i style="background:${colors[6]}"></i> >15</div>
                `;
            }
            
            return div;
        };

        this.legend.addTo(this.map);
    }
}
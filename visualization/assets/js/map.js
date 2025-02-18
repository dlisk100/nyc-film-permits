// map.js
class MapVisualization {
    constructor(dataManager) {
        this.map = null;
        this.dataLayer = null;
        this.zipBoundaries = null;
        this.legend = null;
        this.maxTotalPermits = 0;
        this.quantileBreaks = [];
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
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

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

            // Calculate quantile breaks for better distribution (6 breaks for 7 categories)
            this.quantileBreaks = [];
            for (let i = 1; i <= 6; i++) {
                const index = Math.floor(allTotals.length * i / 7);
                this.quantileBreaks.push(allTotals[index] || 0);
            }

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
            // Quantile-based coloring for all-time data
            let breakIndex = 0;
            while (breakIndex < this.quantileBreaks.length && 
                   value > this.quantileBreaks[breakIndex]) {
                breakIndex++;
            }
            return colors[Math.min(breakIndex, colors.length - 1)];
        }

        // Weekly view - use absolute permit counts with new categories
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
        layer.bindPopup(`
            <strong>ZIP Code:</strong> ${zipCode}<br>
            <strong>Total Permits:</strong> ${feature.properties.total_permits || 0}
        `);

        layer.on({
            mouseover: e => e.target.setStyle({
                weight: 2,
                fillOpacity: 0.9
            }),
            mouseout: e => this.dataLayer.resetStyle(e.target)
        });
    }

    updateMap(weeklyData) {
        if (!this.zipBoundaries) return;

        const weeklyCounts = weeklyData.reduce((acc, item) => {
            const zip = String(item["ZipCode(s)"]).trim();
            acc[zip] = (acc[zip] || 0) + item.permit_count;
            return acc;
        }, {});

        this.dataLayer.eachLayer(layer => {
            const zipCode = String(layer.feature.properties.postalCode).trim();
            const permits = this.dataManager.currentWeek === 0 
                ? layer.feature.properties.total_permits || 0
                : weeklyCounts[zipCode] || 0;

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
            const isAllTime = this.dataManager.currentWeek === 0;
            
            div.innerHTML = isAllTime 
                ? this.getAllTimeLegend() 
                : this.getWeeklyLegend();
            
            return div;
        };

        this.legend.addTo(this.map);
    }

    getAllTimeLegend() {
        return `
            <h4>Total Permits</h4>
            ${this.quantileBreaks.map((brk, i) => `
                <div><i style="background:${CONFIG.colors.heatmap[i]}"></i>
                ${i === 0 ? '≤' : this.quantileBreaks[i-1] + '-'}${brk}</div>
            `).join('')}
            <div><i style="background:${CONFIG.colors.heatmap[6]}"></i>
            >${this.quantileBreaks[5]}</div>
        `;
    }

    getWeeklyLegend() {
        return `
            <h4>Weekly Permits</h4>
            <div><i style="background:${CONFIG.colors.heatmap[0]}"></i> 0</div>
            <div><i style="background:${CONFIG.colors.heatmap[1]}"></i> 1</div>
            <div><i style="background:${CONFIG.colors.heatmap[2]}"></i> 2-3</div>
            <div><i style="background:${CONFIG.colors.heatmap[3]}"></i> 4-6</div>
            <div><i style="background:${CONFIG.colors.heatmap[4]}"></i> 7-10</div>
            <div><i style="background:${CONFIG.colors.heatmap[5]}"></i> 11-15</div>
            <div><i style="background:${CONFIG.colors.heatmap[6]}"></i> >15</div>
        `;
    }
}
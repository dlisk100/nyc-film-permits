// map.js
class MapVisualization {
    // Pass dataManager in the constructor
      constructor(dataManager) {
          this.map = null;
          this.dataLayer = null;
          this.zipBoundaries = null;
          this.legend = null;
          this.maxTotalPermits = 0;
          this.dataManager = dataManager; // Store a reference to dataManager
      }
  
      async init() { // Moved map initialization here
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
  
          // Initialize GeoJSON layer (important: after loading boundaries)
          this.dataLayer = L.geoJSON(this.zipBoundaries, {
              style: this.styleFeature.bind(this),
              onEachFeature: this.onEachFeature.bind(this)
          }).addTo(this.map);
  
          this.addLegend(); // Add the legend to the map
      }
  
      async loadZipBoundaries() {
          try {
              const response = await fetch('../../data_processing/data/processed/zip_permits.geojson'); // Corrected path
              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              this.zipBoundaries = await response.json();
  
              // Find the maximum total_permits value.  We do this *here*,
              // once the GeoJSON is loaded.
              this.zipBoundaries.features.forEach(feature => {
                  this.maxTotalPermits = Math.max(this.maxTotalPermits, feature.properties.total_permits || 0);
              });
              console.log("Max total permits:", this.maxTotalPermits); // Debugging
  
          } catch (error) {
              console.error('Error loading ZIP boundaries:', error);
          }
      }
  
  
    styleFeature(feature) {
      let permitCount = 0;
  
      if (this.dataManager.currentWeek === 0) {
          // "All Time" mode: Use normalized total_permits.
          const totalPermits = feature.properties.total_permits || 0;
          permitCount = totalPermits / this.maxTotalPermits; // Normalize!
            //console.log("All time permit count", permitCount)
      } else {
          // Specific week mode: use the permit count, which is already handled
          // correctly in updateMap.  We'll get this value later.
          permitCount = feature.properties.permit_count || 0; // Get from properties
          //console.log("weekly permit count", permitCount)
      }
  
  
      return {
          fillColor: this.getColor(permitCount),
          weight: 1,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.7
      };
  }
  
    getColor(density) {
          //colors are set for density values between 0 and 1
          const colors = CONFIG.colors.heatmap;
          if (density <= 0) return colors[0];   // No permits or less (shouldn't happen)
          if (density <= 0.2) return colors[1];
          if (density <= 0.4) return colors[2];
          if (density <= 0.6) return colors[3];
          return colors[4];
      }
  
      onEachFeature(feature, layer) {
          // Add popup with information
          layer.bindPopup(`
              <strong>ZIP Code:</strong> ${feature.properties.postalCode}<br>
              <strong>Total Permits:</strong> ${feature.properties.total_permits || 0}
          `);
  
          // Add hover effects (optional, but good for UX)
          layer.on({
              mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle({
                      weight: 2,      // Thicker border on hover
                      fillOpacity: 0.9 // More opaque on hover
                  });
              },
              mouseout: (e) => {
                  this.dataLayer.resetStyle(e.target);
              }
          });
      }
  
  
   updateMap(weeklyData) {
      if (!this.zipBoundaries) {
          console.warn("ZIP boundaries not loaded yet.");
          return;
      }
  
      // console.log("weeklyData in updateMap:", weeklyData); //Uncomment for debugging
  
      // Create a map of ZIP code to permit count for the current week *and* selected types.
      const weeklyCounts = {};
      weeklyData.forEach(item => {
          // Use postalCode for consistency with GeoJSON.
          weeklyCounts[item["ZipCode(s)"]] = (weeklyCounts[item["ZipCode(s)"]] || 0) + item.permit_count;
      });
  
      // console.log("weeklyCounts", weeklyCounts) //Uncomment for debugging
  
      // Update the existing GeoJSON layer
      this.dataLayer.eachLayer(layer => {
          const zipCode = layer.feature.properties.postalCode;
          let permitCount;
          let popupContent;
  
          if (this.dataManager.currentWeek === 0) {
              // "All Time" mode: Use total_permits from GeoJSON
              permitCount = layer.feature.properties.total_permits || 0;
              popupContent = `
                  <strong>ZIP Code:</strong> ${zipCode}<br>
                  <strong>Total Permits:</strong> ${permitCount}
              `;
          } else {
              // Specific Week: Use weeklyCounts
              permitCount = weeklyCounts[zipCode] || 0;
              popupContent = `
                  <strong>ZIP Code:</strong> ${zipCode}<br>
                  <strong>Permits (This Week):</strong> ${permitCount}
              `;
          }
              // Set permit_count property for use by styleFeature in weekly view
              layer.feature.properties.permit_count = permitCount;
  
              // Update style and popup
              layer.setStyle({
                  fillColor: this.getColor(permitCount) // Recalculate color based on filtered count
              });
              layer.setPopupContent(popupContent);
  
      });
  }
  
  
      addLegend() {
          this.legend = L.control({ position: 'bottomright' });
  
          this.legend.onAdd = (map) => {
              const div = L.DomUtil.create('div', 'info legend');
              const grades = [0, 0.2, 0.4, 0.6]; // Match getColor thresholds
              const colors = CONFIG.colors.heatmap;
              let labels = [];
  
              // Loop through our density intervals and generate a label with a colored square for each interval.
              for (let i = 0; i < grades.length; i++) {
                  div.innerHTML +=
                      '<i style="background:' + this.getColor(grades[i] + 0.1) + '"></i> ' + // Add a tiny amount to get the right color
                      grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
              }
              return div;
          };
  
          this.legend.addTo(this.map);
      }
  }
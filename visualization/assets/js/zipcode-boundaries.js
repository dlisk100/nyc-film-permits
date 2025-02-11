// zipcode-boundaries.js
class ZipCodeBoundaries {
    constructor() {
        this.boundaries = null;
    }

    async loadBoundaries() {
        try {
            const response = await fetch('data/processed/zip_permits.geojson');
            this.boundaries = await response.json();
            return true;
        } catch (error) {
            console.error('Error loading ZIP code boundaries:', error);
            return false;
        }
    }

    getBoundary(zipCode) {
        return this.boundaries.features.find(
            feature => feature.properties.zipcode === zipCode
        );
    }
}

const zipBoundaries = new ZipCodeBoundaries();
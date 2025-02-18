// data.js
class DataManager {
    constructor() {
        this.weeklyData = null;
        this.totalByType = null;
        this.currentWeek = 0; // Initialize to 0 for "All Time"
        this.selectedTypes = new Set();
        this.permitTypes = []; // Store permit types here
        this.minWeek = null; // For slider
        this.maxWeek = null; // For slider
    }

    async loadData() {
        try {
            const [weeklyResponse, totalResponse] = await Promise.all([
                fetch('../../data_processing/data/processed/weekly_permits.json'), // Corrected path
                fetch('../../data_processing/data/processed/total_by_type.json')  // Corrected path
                // NO MORE monthly_stats.json!
            ]);

            this.weeklyData = await weeklyResponse.json();
            this.totalByType = await totalResponse.json();
            //this.dateRange = await dateRangeResponse.json(); // Store the loaded data NO LONGER NEEDED
            console.log("weeklyData (first 5):", this.weeklyData.slice(0, 5));
            console.log("totalByType (first 5):", this.totalByType.slice(0, 5));
            // Extract unique permit types from totalByType
            this.permitTypes = [...new Set(this.totalByType.map(item => item.EventType))];
            this.selectedTypes = new Set(this.permitTypes); // Initially select all

            // Calculate minWeek and maxWeek *after* loading data
            this.calculateMinMaxWeeks();

            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }
     // New function to calculate min and max week numbers
    calculateMinMaxWeeks() {
        if (!this.weeklyData || this.weeklyData.length === 0) {
            return; // No data loaded yet.
        }

        let minWeek = Infinity;
        let maxWeek = -Infinity;

        for (const permit of this.weeklyData) {
            const weekVal = this.weekToValue(permit.year, permit.week);
            if (weekVal < minWeek) {
                minWeek = weekVal;
            }
            if (weekVal > maxWeek) {
                maxWeek = weekVal;
            }
        }
        this.minWeek = minWeek;
        this.maxWeek = maxWeek;
    }

    // Helper function: Convert year and week to a single comparable number
    weekToValue(year, week) {
      return (year * 53) + week;
    }

    // Helper function: Convert a single value back to year and week
    valueToWeek(value) {
      const year = Math.floor(value / 53);
      const week = value % 53;
      return { year: year, week: week };
    }


    getFilteredData() {
        if (this.currentWeek === 0) {
            return [];
        } else {
            let {year, week} = this.valueToWeek(this.currentWeek);
            console.log("Filtering for year:", year, "week:", week, "selectedTypes:", this.selectedTypes);
            const filtered = this.weeklyData.filter(d =>
                d.week === week &&
                d.year === year &&
                this.selectedTypes.has(d.EventType)
            );
            console.log("Filtered data (first 5):", filtered.slice(0, 5));
            return filtered;
        }
    }

    updateFilters(week, types) {
        this.currentWeek = week;
        this.selectedTypes = new Set(types); // Use a Set for efficient lookups
    }
}

const dataManager = new DataManager();
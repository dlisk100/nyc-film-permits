// data.js
class DataManager {
    constructor() {
        this.weeklyData = null;
        this.totalByType = null;
        this.currentWeek = 1;
        this.selectedTypes = new Set();
    }

    async loadData() {
        try {
            const [weeklyResponse, totalResponse] = await Promise.all([
                fetch('data/processed/weekly_permits.json'),
                fetch('data/processed/total_by_type.json')
            ]);

            this.weeklyData = await weeklyResponse.json();
            this.totalByType = await totalResponse.json();
            
            // Get unique permit types
            this.permitTypes = [...new Set(this.totalByType.map(d => d.EventType))];
            
            // Initially select all permit types
            this.selectedTypes = new Set(this.permitTypes);
            
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    getFilteredData(week = this.currentWeek) {
        return this.weeklyData.filter(d => 
            d.week === week && 
            this.selectedTypes.has(d.EventType)
        );
    }

    updateFilters(week, types) {
        this.currentWeek = week;
        this.selectedTypes = new Set(types);
    }
}

const dataManager = new DataManager();
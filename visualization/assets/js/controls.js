class Controls {
    constructor() {
        this.weekSlider = document.getElementById('weekSlider');
        this.weekDisplay = document.getElementById('weekDisplay');
        this.permitTypesContainer = document.getElementById('permitTypes');
        this.initialize();
    }

    initialize() {
        // Initialize week slider
        this.weekSlider.addEventListener('input', (e) => {
            const week = parseInt(e.target.value);
            this.weekDisplay.textContent = week;
            dataManager.updateFilters(week, Array.from(dataManager.selectedTypes));
            mapViz.updateMap(dataManager.getFilteredData());
        });

        // Initialize permit type checkboxes
        this.createPermitTypeFilters();
    }

    createPermitTypeFilters() {
        // Clear existing content
        this.permitTypesContainer.innerHTML = '';
        
        // Create checkbox for each permit type
        dataManager.permitTypes.forEach(type => {
            const div = document.createElement('div');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `type-${type.replace(/\s+/g, '-')}`;
            checkbox.checked = true;
            checkbox.addEventListener('change', () => this.handleFilterChange());

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = type;

            div.appendChild(checkbox);
            div.appendChild(label);
            this.permitTypesContainer.appendChild(div);
        });
    }

    handleFilterChange() {
        // Get all selected permit types
        const selectedTypes = Array.from(this.permitTypesContainer.querySelectorAll('input:checked'))
            .map(checkbox => checkbox.id.replace('type-', '').replace(/-/g, ' '));
        
        // Update filters and map
        dataManager.updateFilters(parseInt(this.weekSlider.value), selectedTypes);
        mapViz.updateMap(dataManager.getFilteredData());
    }
}

// Initialize controls when the page loads
let controls;
function initializeControls() {
    try {
        const checkboxes = document.querySelectorAll('#permitTypes input');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedTypes = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.id.replace('type-', '').replace(/-/g, ' '));
                dataManager.updateFilters(
                    parseInt(document.getElementById('weekSlider').value),
                    selectedTypes
                );
                mapViz.updateMap(dataManager.getFilteredData());
            });
        });
    } catch (error) {
        console.error('Error initializing controls:', error);
    }
}
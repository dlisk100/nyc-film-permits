// controls.js
class Controls {
    constructor(dataManager, mapViz) { // Add parameters here
      this.weekSlider = document.getElementById('weekSlider');
      this.weekDisplay = document.getElementById('weekDisplay');
      this.permitTypesContainer = document.getElementById('permitTypes');
      this.dataManager = dataManager; // Store the dataManager instance
      this.mapViz = mapViz; // Store the mapViz instance
      this.initialize();
    }
  
    initialize() {
        // Initialize week slider.  Event listener is added *after* setting min/max.
        this.weekSlider.addEventListener('input', () => {
            this.updateFilters(); // Call updateFilters (week is handled there)
        });
  
        // Set initial slider value to 0 (representing "all time")
        this.weekSlider.min = 0;  // Will be overwritten by setSliderRange
        this.weekSlider.max = 52; // Will be overwritten by setSliderRange
        this.weekSlider.value = 0;
        this.setSliderRange(); // Set the correct range from the data.
        this.updateDateDisplay(); // Update the date display.
  
        // Initialize permit type checkboxes (created dynamically)
        this.createPermitTypeFilters();
    }
  
      // New function to set the slider range based on loaded data
    setSliderRange() {
      if (this.dataManager.minWeek !== null && this.dataManager.maxWeek !== null) {
        this.weekSlider.min = this.dataManager.minWeek;
        this.weekSlider.max = this.dataManager.maxWeek;
      }
    }
  
      // New function to update the date display
      updateDateDisplay() {
          const weekValue = parseInt(this.weekSlider.value);
  
          if (weekValue === 0) {
              this.weekDisplay.textContent = "All Time";
              return;
          }
  
          const {year, week} = this.dataManager.valueToWeek(weekValue);
  
          // Find the first day of the selected week
          // Use the year from our calculation
          let startDate = new Date(year, 0, 1 + (week - 1) * 7);
  
          // Adjust for the fact that weeks might not start on the 1st
          while (startDate.getDay() !== 1) { // 1 represents Monday
              startDate.setDate(startDate.getDate() - 1);
              if (startDate.getFullYear() < year) {
                startDate.setDate(startDate.getDate()+7)
                break;
              }
          }
  
  
          // Calculate end date (6 days later)
          let endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
  
          const options = { year: 'numeric', month: 'long', day: 'numeric' };
          this.weekDisplay.textContent = `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
      }
  
  
      createPermitTypeFilters() {
          // Clear existing content
          this.permitTypesContainer.innerHTML = '';
  
          // Create checkbox for each permit type
          this.dataManager.permitTypes.forEach(type => { // Use this.dataManager
              const div = document.createElement('div');
  
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.id = `type-${type.replace(/\s+/g, '-')}`; // Create unique IDs
              checkbox.value = type; // Store the actual type as the value
              checkbox.checked = true; // Initially checked
              checkbox.addEventListener('change', () => this.updateFilters()); // Call updateFilters
  
              const label = document.createElement('label');
              label.htmlFor = checkbox.id;
              label.textContent = type;
  
              div.appendChild(checkbox);
              div.appendChild(label);
              this.permitTypesContainer.appendChild(div);
          });
      }
  
  
      updateFilters() {
        const weekValue = parseInt(this.weekSlider.value);
        const selectedTypes = Array.from(this.permitTypesContainer.querySelectorAll('input:checked')).map(cb => cb.value);
  
        this.dataManager.updateFilters(weekValue, selectedTypes); // Use this.dataManager
        this.mapViz.updateMap(this.dataManager.getFilteredData()); // Use this.mapViz and this.dataManager
        this.updateDateDisplay(); // Update the date display, using this.dataManager
      }
  }
  
  // Initialize controls (simplified)
  let controls; //keep this
  function initializeControls() {
      try {
        controls = new Controls(dataManager, mapViz); // Pass dataManager and mapViz
      } catch (error) {
          console.error('Error initializing controls:', error);
      }
  }
// controls.js
class Controls {
  constructor(dataManager, mapViz) {
      this.weekSlider = document.getElementById('weekSlider');
      this.weekDisplay = document.getElementById('weekDisplay');
      this.permitTypesContainer = document.getElementById('permitTypes');
      this.dataManager = dataManager;
      this.mapViz = mapViz;
      this.initialize();
  }

  initialize() {
      this.weekSlider.addEventListener('input', () => {
          this.updateFilters();
      });

      // Allow selection of week 0 (full span)
      //this.weekSlider.min = 0;
      //this.weekSlider.max = 52;
      //this.weekSlider.value = 0;

      // Add "All Time" button
      const allTimeBtn = document.createElement('button');
      allTimeBtn.textContent = 'Show All Time';
      allTimeBtn.className = 'all-time-btn';
      allTimeBtn.onclick = () => {
          this.weekSlider.value = 0;
          this.updateFilters();
      };
      this.weekSlider.parentNode.appendChild(allTimeBtn);

      this.setSliderRange();
      this.updateDateDisplay();
      this.createPermitTypeFilters();
  }

    setSliderRange() {
      if (this.dataManager.minWeek !== null && this.dataManager.maxWeek !== null) {
        this.weekSlider.min = this.dataManager.minWeek;
        this.weekSlider.max = this.dataManager.maxWeek;
      }
    }

    updateDateDisplay() {
        const weekValue = parseInt(this.weekSlider.value);

        if (weekValue === 0) {
            this.weekDisplay.textContent = "All Time";
            return;
        }

        const {year, week} = this.dataManager.valueToWeek(weekValue);

        let startDate = new Date(year, 0, 1 + (week - 1) * 7);

        while (startDate.getDay() !== 1) { // 1 represents Monday
            startDate.setDate(startDate.getDate() - 1);
            if (startDate.getFullYear() < year) {
              startDate.setDate(startDate.getDate()+7)
              break;
            }
        }

        let endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        this.weekDisplay.textContent = `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    }


    createPermitTypeFilters() {
        this.permitTypesContainer.innerHTML = '';

        this.dataManager.permitTypes.forEach(type => {
            const div = document.createElement('div');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `type-${type.replace(/\s+/g, '-')}`;
            checkbox.value = type;
            checkbox.checked = true;
            checkbox.addEventListener('change', () => this.updateFilters());

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

      this.dataManager.updateFilters(weekValue, selectedTypes);
      this.mapViz.updateMap(this.dataManager.getFilteredData());
      this.updateDateDisplay();
    }
}

let controls;
function initializeControls() {
    try {
      controls = new Controls(dataManager, mapViz);
    } catch (error) {
        console.error('Error initializing controls:', error);
    }
}
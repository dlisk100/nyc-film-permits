import pandas as pd
import geopandas as gpd
from pathlib import Path
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

class DataLoader:
    def __init__(self, project_root: Path):
        self.raw_data_path = project_root / 'data_processing' / 'data' / 'raw'
        self.permits_path = self.raw_data_path / 'film_permits.csv'
        self.boundaries_path = self.raw_data_path / 'zip_boundaries.geojson'

    def validate_paths(self) -> bool:
        """Validate all required paths exist."""
        paths_exist = True
        for path in [self.raw_data_path, self.permits_path, self.boundaries_path]:
            if not path.exists():
                logger.error(f"Path not found: {path}")
                paths_exist = False
        return paths_exist

    def load_permits(self) -> pd.DataFrame:
        """Load and clean film permits data with ZIP code handling."""
        logger.info("Loading permits data...")
        df = pd.read_csv(self.permits_path)
        
        # Handle ZIP codes
        if 'ZipCode(s)' in df.columns:
            df = (df.assign(ZipCode=df['ZipCode(s)'].str.split(','))
                  .explode('ZipCode')
                  .assign(ZipCode=lambda x: x['ZipCode'].str.strip())
                  .dropna(subset=['ZipCode']))
        return df

    def load_boundaries(self) -> gpd.GeoDataFrame:
        """Load and validate geographic boundaries."""
        logger.info("Loading boundaries data...")
        gdf = gpd.read_file(self.boundaries_path)
        gdf['postalCode'] = gdf['postalCode'].astype(str).str.strip()
        return gdf

def get_project_root() -> Path:
    """Calculate project root relative to this file's location."""
    current_file = Path(__file__).resolve()
    return current_file.parents[2]  # Adjust this number based on your file structure

def main():
    try:
        # Path configuration
        project_root = get_project_root()
        logger.info(f"Project root: {project_root}")
        
        loader = DataLoader(project_root)
        if not loader.validate_paths():
            logger.error("Missing required data files. Check paths above.")
            sys.exit(1)
            
        # Load data
        permits_df = loader.load_permits()
        boundaries_gdf = loader.load_boundaries()
        
        # Display summary
        print("\n=== Data Summary ===")
        print(f"Permits loaded: {len(permits_df):,}")
        print(f"Unique ZIP codes: {permits_df['ZipCode'].nunique():,}")
        print(f"Boundary shapes: {len(boundaries_gdf):,}")
        print("Boroughs:", ', '.join(boundaries_gdf['borough'].unique()))
        
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
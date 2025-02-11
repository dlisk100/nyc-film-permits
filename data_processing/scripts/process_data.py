import pandas as pd
import geopandas as gpd
import json
from pathlib import Path
from datetime import datetime

# FIXED PATHS
RAW_DATA_DIR = Path("./data_processing/data/raw")
PROCESSED_DATA_DIR = Path("./data_processing/data/processed")

def validate_input_files():
    """Validate that required input files exist."""
    required_files = ["film_permits.csv", "zip_boundaries.geojson"]
    for file in required_files:
        if not (RAW_DATA_DIR / file).exists():
            raise FileNotFoundError(f"{file} not found in {RAW_DATA_DIR}")

def clean_zip_codes(zip_str):
    """Clean and split ZIP codes, handling multiple ZIPs per entry."""
    if pd.isna(zip_str):
        return []
    return [z.strip() for z in str(zip_str).split(',')]

def process_permits_data():
    """Process film permits data with proper date and ZIP handling."""
    # Load permits data
    permits = pd.read_csv(RAW_DATA_DIR / "film_permits.csv")
    
    # Process dates
    permits["StartDateTime"] = pd.to_datetime(permits["StartDateTime"], 
                                            format="%m/%d/%Y %I:%M:%S %p",
                                            errors="coerce")
    permits["week"] = permits["StartDateTime"].dt.isocalendar().week
    permits["year"] = permits["StartDateTime"].dt.year
    
    # Drop records with invalid dates
    permits.dropna(subset=["StartDateTime"], inplace=True)
    
    # Process ZIP codes
    permits["ZipCode(s)"] = permits["ZipCode(s)"].apply(clean_zip_codes)
    expanded_permits = permits.explode("ZipCode(s)")
    expanded_permits = expanded_permits[expanded_permits["ZipCode(s)"].str.len() == 5]  # Validate ZIP format
    
    return expanded_permits

def create_aggregations(permits_df):
    """Create weekly and type-based aggregations."""
    # Weekly counts by ZIP
    weekly_zip_counts = permits_df.groupby([
        "year", "week", "ZipCode(s)", "EventType"
    ]).size().reset_index(name="permit_count")
    
    # Total counts by ZIP
    total_zip_counts = permits_df.groupby("ZipCode(s)").size().reset_index(name="total_permits")
    
    return weekly_zip_counts, total_zip_counts

def merge_with_geography(total_zip_counts):
    """Merge permit counts with geographic boundaries."""
    # Load geographic data
    gdf = gpd.read_file(RAW_DATA_DIR / "zip_boundaries.geojson")
    
    # Merge based on postal code
    gdf_merged = gdf.merge(
        total_zip_counts,
        left_on="postalCode",  # Using the correct column name from your GeoJSON
        right_on="ZipCode(s)",
        how="left"
    )
    
    # Fill NaN values with 0 for ZIP codes with no permits
    gdf_merged["total_permits"].fillna(0, inplace=True)
    
    return gdf_merged

def save_processed_data(gdf_merged, weekly_counts):
    """Save processed data files."""
    # Create output directory if it doesn't exist
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save geographic data with permit counts
    gdf_merged.to_file(
        PROCESSED_DATA_DIR / "zip_permits.geojson",
        driver="GeoJSON"
    )
    
    # Save weekly statistics
    weekly_counts.to_json(
        PROCESSED_DATA_DIR / "weekly_permits.json",
        orient="records",
        indent=2
    )
def create_aggregations(permits_df):
    """Create weekly and total aggregations."""
    # Existing weekly aggregation
    weekly_zip_counts = permits_df.groupby([
        "year", "week", "ZipCode(s)", "EventType"
    ]).size().reset_index(name="permit_count")
    
    # Total counts by ZIP (all time)
    total_zip_counts = permits_df.groupby("ZipCode(s)").size().reset_index(name="total_permits")
    
    # Total counts by ZIP and event type
    total_by_type = permits_df.groupby(["ZipCode(s)", "EventType"]).size().reset_index(name="type_count")
    
    return weekly_zip_counts, total_zip_counts, total_by_type

def save_processed_data(gdf_merged, weekly_counts, total_by_type):
    """Save processed data files."""
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save geographic data with total permit counts
    gdf_merged.to_file(
        PROCESSED_DATA_DIR / "zip_permits.geojson",
        driver="GeoJSON"
    )
    
    # Save weekly statistics
    weekly_counts.to_json(
        PROCESSED_DATA_DIR / "weekly_permits.json",
        orient="records",
        indent=2
    )
    
    # Save total counts by type
    total_by_type.to_json(
        PROCESSED_DATA_DIR / "total_by_type.json",
        orient="records",
        indent=2
    )    

def main():
    """Main execution function."""
    try:
        print(f"Starting data processing... Looking in {RAW_DATA_DIR.resolve()}")
        
        # Validate input files
        validate_input_files()
        
        # Process permits data
        expanded_permits = process_permits_data()
        
        # Create aggregations with the new total_by_type
        weekly_zip_counts, total_zip_counts, total_by_type = create_aggregations(expanded_permits)
        
        # Merge with geographic data
        gdf_merged = merge_with_geography(total_zip_counts)
        
        # Save processed data with the new total_by_type parameter
        save_processed_data(gdf_merged, weekly_zip_counts, total_by_type)
        
        print(f"Processing complete. Outputs saved to: {PROCESSED_DATA_DIR.resolve()}")
        
    except Exception as e:
        print(f"Error processing data: {str(e)}")
        raise

if __name__ == "__main__":
    main()
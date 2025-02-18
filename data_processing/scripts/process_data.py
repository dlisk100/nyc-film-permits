import pandas as pd
import geopandas as gpd
from pathlib import Path
import json

def process_data():
    # =====================
    # 1. Path Configuration (Consistent)
    # =====================
    project_root = Path(__file__).parent.parent.parent  # Correctly goes up to project root
    raw_data_dir = project_root / "data_processing" / "data" / "raw"
    processed_data_dir = project_root / "data_processing" / "data" / "processed"
    processed_data_dir.mkdir(parents=True, exist_ok=True)  # Ensure output dir exists

    # ===================
    # 2. Data Loading
    # ===================
    print("⏳ Loading film permits data...")
    permits_path = raw_data_dir / "film_permits.csv"
    zip_path = raw_data_dir / "zip_boundaries.geojson"

    # Load data with CORRECT datetime conversion (using the format from your original prompt)
    permits_df = pd.read_csv(permits_path)
    permits_df["StartDateTime"] = pd.to_datetime(
        permits_df["StartDateTime"],
        format="%m/%d/%Y %I:%M:%S %p",  # Correct format for your data
        errors="coerce"
    )
    permits_df["EndDateTime"] = pd.to_datetime(
        permits_df["EndDateTime"],
        format="%m/%d/%Y %I:%M:%S %p",
        errors="coerce"
    )

    # Remove invalid dates
    initial_count = len(permits_df)
    permits_df = permits_df.dropna(subset=["StartDateTime", "EndDateTime"])
    print(f"Removed {initial_count - len(permits_df)} records with invalid dates")

    # ======================
    # 3. Data Preprocessing
    # ======================
    print("🔧 Processing ZIP codes...")
    # Clean and handle multiple ZIP codes
    permits_df["ZipCode(s)"] = (
        permits_df["ZipCode(s)"]
        .astype(str)  # Convert to string first to handle mixed types
        .str.split(",")  # Split by comma
        .apply(lambda x: [z.strip() for z in x])  # Strip whitespace
    )

    print("🌀 Expanding multi-ZIP permits...")
    permits_expanded = permits_df.explode("ZipCode(s)", ignore_index=True)
    permits_expanded = permits_expanded[permits_expanded["ZipCode(s)"].str.len() == 5] #Ensure 5 digit zips
    permits_expanded["ZipCode(s)"] = permits_expanded["ZipCode(s)"].astype(str)

    # ====================
    # 4. Data Processing (Aggregation)
    # ====================
    print("📅 Processing temporal data (weekly)...")
    permits_expanded["week"] = permits_expanded["StartDateTime"].dt.isocalendar().week
    permits_expanded["year"] = permits_expanded["StartDateTime"].dt.year

    # Aggregate by week, ZIP, and EventType
    weekly_counts = permits_expanded.groupby(["year", "week", "ZipCode(s)", "EventType"]).size().reset_index(name="permit_count")

    # Aggregate total counts by ZIP
    total_counts = permits_expanded.groupby("ZipCode(s)").size().reset_index(name="total_permits")

    # Aggregate by type
    total_by_type = permits_expanded.groupby(["ZipCode(s)", "EventType"]).size().reset_index(name="type_count")

    # ======================
    # 5. GeoJSON Integration
    # ======================
    print("🗺️ Merging with ZIP boundaries...")
    zip_gdf = gpd.read_file(zip_path)
    zip_gdf["postalCode"] = zip_gdf["postalCode"].astype(str)  # Ensure correct type for merging

    # Merge total counts with GeoDataFrame
    merged_gdf = zip_gdf.merge(
        total_counts, left_on="postalCode", right_on="ZipCode(s)", how="left"
    )
    merged_gdf["total_permits"] = merged_gdf["total_permits"].fillna(0)  # Fill missing with 0

    # =================
    # 6. Output Files
    # =================
    print("💾 Saving processed data...")

    # --- Save Processed GeoJSON ---
    merged_gdf.to_file(processed_data_dir / "zip_permits.geojson", driver="GeoJSON")

    # --- Save Weekly Counts ---
    weekly_counts.to_json(processed_data_dir / "weekly_permits.json", orient="records", indent=2)

    # --- Save total counts by type ---
    total_by_type.to_json(
        processed_data_dir / "total_by_type.json",
        orient="records",
        indent=2
    )

    print("✅ Processing complete!")

if __name__ == "__main__":
    process_data()
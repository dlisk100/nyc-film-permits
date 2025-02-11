import pandas as pd
import geopandas as gpd
from pathlib import Path
import json

def process_data():
    # =====================
    # 1. Path Configuration
    # =====================
    project_root = Path(__file__).parent.parent.parent
    print(f"Project root: {project_root}")
    raw_data_dir = project_root / "data" / "raw"
    print(f"Raw data dir: {raw_data_dir}")
    processed_data_dir = project_root / "data" / "processed"
    print(f"Processed data dir: {processed_data_dir}")
    processed_data_dir.mkdir(parents=True, exist_ok=True)

    # ===================
    # 2. Data Loading
    # ===================
    print("⏳ Loading film permits data...")
    permits_path = raw_data_dir / "film_permits.csv"
    zip_path = raw_data_dir / "zip_boundaries.geojson"
    print(f"Permits path: {permits_path}")
    print(f"Zip path: {zip_path}")

    # Load data with explicit datetime conversion
    permits_df = pd.read_csv(permits_path).rename(columns={"ZipCode(s)": "ZIPs"})
    permits_df["StartDateTime"] = pd.to_datetime(
        permits_df["StartDateTime"], 
        format='%Y-%m-%d %H:%M:%S',  # Matches your 2023-01-01 00:01:00 format
        errors='coerce'
    )
    permits_df["EndDateTime"] = pd.to_datetime(
        permits_df["EndDateTime"],
        format='%Y-%m-%d %H:%M:%S',
        errors='coerce'
    )

    # Remove invalid dates
    initial_count = len(permits_df)
    permits_df = permits_df.dropna(subset=["StartDateTime", "EndDateTime"])
    print(f"Removed {initial_count - len(permits_df)} records with invalid dates")

    # ======================
    # 3. Data Preprocessing
    # ======================
    print("🔧 Processing ZIP codes...")
    permits_df["ZIPs"] = (
        permits_df["ZIPs"]
        .fillna("")
        .apply(lambda s: [z.strip() for z in str(s).split(", ") if z.strip()])
    )
    permits_df = permits_df[permits_df["ZIPs"].apply(len) > 0]

    print("🌀 Expanding multi-ZIP permits...")
    permits_expanded = permits_df.explode("ZIPs", ignore_index=False)

    # ====================
    # 4. Data Processing
    # ====================
    print("📅 Processing temporal data...")
    permits_expanded["num_zips"] = permits_expanded.index.map(
        lambda idx: len(permits_df.loc[idx, "ZIPs"])
    )
    permits_expanded["weight"] = 1 / permits_expanded["num_zips"]
    
    # Convert to monthly period
    permits_expanded["month"] = (
        permits_expanded["StartDateTime"]
        .dt.to_period("M")
        .astype(str)
    )

    # ======================
    # 5. GeoJSON Integration
    # ======================
    print("🗺️ Merging with ZIP boundaries...")
    zip_gdf = gpd.read_file(zip_path)
    zip_gdf["ZIP_CODE"] = zip_gdf["ZIP_CODE"].astype(str)
    permits_expanded["ZIPs"] = permits_expanded["ZIPs"].astype(str)

    grouped = permits_expanded.groupby(["month", "ZIPs"]).agg(
        total=("weight", "count"),
        weighted=("weight", "sum")
    ).reset_index()

    total_pivot = grouped.pivot(index="ZIPs", columns="month", values="total")
    weighted_pivot = grouped.pivot(index="ZIPs", columns="month", values="weighted")
    
    zip_gdf["total_permits"] = zip_gdf["ZIP_CODE"].map(total_pivot.to_dict("index")).fillna({})
    zip_gdf["weighted_permits"] = zip_gdf["ZIP_CODE"].map(weighted_pivot.to_dict("index")).fillna({})

    # =================
    # 6. Output Files
    # =================
    print("💾 Saving processed data...")
    zip_gdf.to_file(processed_data_dir / "zip_data.geojson", driver="GeoJSON")
    
    monthly_stats = [{
        "start": pd.Period(month).start_time.date().isoformat(),
        "end": pd.Period(month).end_time.date().isoformat(),
        "label": pd.Period(month).strftime("%b %Y")
    } for month in grouped["month"].unique()]
    
    with open(processed_data_dir / "monthly_stats.json", "w") as f:
        json.dump({
            "monthly": monthly_stats,
            "aggregate": {
                "start": permits_df["StartDateTime"].min().date().isoformat(),
                "end": permits_df["StartDateTime"].max().date().isoformat(),
                "label": "All Time"
            }
        }, f, indent=2)

    print("✅ Processing complete!")

if __name__ == "__main__":
    process_data()
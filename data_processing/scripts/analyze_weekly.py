import json
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
import sys

def analyze_weekly_data(file_path):
    """Analyze weekly permit data and suggest binning thresholds"""
    # Load data
    with open(file_path) as f:
        data = json.load(f)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Aggregate permits per ZIP per week
    weekly_agg = df.groupby(['year', 'week', 'ZipCode(s)'])['permit_count'].sum().reset_index()
    
    # Basic stats
    print("=== Weekly Permit Count Statistics ===")
    print(f"Total weeks: {weekly_agg[['year', 'week']].drop_duplicates().shape[0]}")
    print(f"Total ZIP codes: {weekly_agg['ZipCode(s)'].nunique()}")
    print("\nPer ZIP/Week Permit Count Stats:")
    print(weekly_agg['permit_count'].describe(percentiles=[.25, .5, .75, .9, .95]))
    
    # Histogram
    plt.figure(figsize=(10, 6))
    n, bins, patches = plt.hist(weekly_agg['permit_count'], 
                               bins='auto', 
                               edgecolor='black',
                               log=True)  # Log scale for better visibility
    plt.title('Weekly Permit Counts Distribution per ZIP Code')
    plt.xlabel('Number of Permits')
    plt.ylabel('Frequency (log scale)')
    plt.grid(True)
    
    # Save histogram
    output_dir = Path(file_path).parent.parent / 'reports'
    output_dir.mkdir(exist_ok=True)
    plt.savefig(output_dir / 'weekly_permits_histogram.png')
    print(f"\nHistogram saved to: {output_dir / 'weekly_permits_histogram.png'}")

if __name__ == "__main__":
    # Default path relative to the script location
    default_path = Path(__file__).parent.parent / 'data' / 'processed' / 'weekly_permits.json'
    
    # Use command line argument if provided, otherwise use default path
    file_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_path
    
    if not file_path.exists():
        print(f"Error: File not found at {file_path}")
        print(f"Usage: python analyze_weekly.py [path_to_weekly_permits.json]")
        sys.exit(1)
    
    analyze_weekly_data(file_path)


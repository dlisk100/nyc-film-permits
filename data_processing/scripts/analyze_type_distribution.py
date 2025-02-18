import json
import pandas as pd
import numpy as np
from collections import Counter

def analyze_type_distribution():
    # Read the JSON file
    with open('../data_processing/data/processed/total_by_type.json', 'r') as f:
        data = json.load(f)
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(data)
    
    # Basic statistics
    print("\n=== Basic Statistics ===")
    total_types = len(data)
    print(f"Total number of types: {total_types}")
    
    if 'count' in df.columns:
        print("\n=== Count Distribution ===")
        print(f"Min count: {df['count'].min()}")
        print(f"Max count: {df['count'].max()}")
        print(f"Mean count: {df['count'].mean():.2f}")
        print(f"Median count: {df['count'].median():.2f}")
        
        # Calculate quartiles for potential color groupings
        quartiles = df['count'].quantile([0.25, 0.5, 0.75])
        print("\n=== Quartiles (for potential color groupings) ===")
        print(f"25th percentile: {quartiles[0.25]:.2f}")
        print(f"50th percentile: {quartiles[0.50]:.2f}")
        print(f"75th percentile: {quartiles[0.75]:.2f}")
        
        # Suggest color distribution ranges
        print("\n=== Suggested Color Distribution Ranges ===")
        ranges = pd.qcut(df['count'], q=5, duplicates='drop')
        print("\nEqual-sized groups (quintiles):")
        for i, (left, right) in enumerate(ranges.unique().categories):
            print(f"Group {i+1}: {left:.2f} to {right:.2f}")

if __name__ == "__main__":
    analyze_type_distribution()

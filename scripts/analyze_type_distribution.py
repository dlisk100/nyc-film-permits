import json
import pandas as pd
import numpy as np
from collections import Counter
import os

def analyze_type_distribution():
    # Get the absolute path to the JSON file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(os.path.dirname(script_dir), 'data_processing', 'data', 'processed', 'total_by_type.json')
    
    try:
        # Read the JSON file
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Convert to DataFrame for easier analysis
        df = pd.DataFrame(data)
        
        # Basic statistics
        print("\n=== Basic Statistics ===")
        total_types = len(data)
        print(f"Total number of types: {total_types}")
        print(f"Unique Event Types: {len(df['EventType'].unique())}")
        print(f"Number of ZipCodes with Activity: {len(df['ZipCode(s)'].unique())}")
        
        # Count distribution
        print("\n=== Count Distribution ===")
        print(f"Min count: {df['type_count'].min()}")
        print(f"Max count: {df['type_count'].max()}")
        print(f"Mean count: {df['type_count'].mean():.2f}")
        print(f"Median count: {df['type_count'].median():.2f}")
        
        # Calculate percentiles for the values
        percentiles = [0, 16.67, 33.33, 50, 66.67, 83.33, 100]
        breaks = np.percentile(df['type_count'], percentiles)
        
        print("\n=== Color Distribution Analysis (7 Buckets) ===")
        print("\nData Distribution Summary:")
        print("Bucket 1: 0 permits (for zip codes with no filming activity)")
        
        # Distribute values into 6 remaining buckets
        for i in range(len(percentiles)-1):
            count = len(df[(df['type_count'] > breaks[i]) & (df['type_count'] <= breaks[i+1])])
            print(f"Bucket {i+2}: {breaks[i]:.0f}-{breaks[i+1]:.0f} permits - {count} items ({count/len(df)*100:.1f}%)")
        
        # Event Type Analysis
        print("\n=== Event Type Analysis ===")
        type_stats = df.groupby('EventType')['type_count'].agg(['count', 'sum', 'mean']).sort_values('sum', ascending=False)
        print("\nTop Event Types by Total Count:")
        print(type_stats.to_string())
        
        print("\n=== Color Distribution Recommendations ===")
        print("Based on the data distribution, here are recommended color intensity breaks:")
        print("\nFor a 7-color sequential scheme (e.g., light to dark):")
        print(f"1. No Activity: 0 permits (gray)")
        print(f"2. Very Light: 1-{breaks[1]:.0f} permits")
        print(f"3. Light: {breaks[1]:.0f}-{breaks[2]:.0f} permits")
        print(f"4. Light-Medium: {breaks[2]:.0f}-{breaks[3]:.0f} permits")
        print(f"5. Medium: {breaks[3]:.0f}-{breaks[4]:.0f} permits")
        print(f"6. Dark: {breaks[4]:.0f}-{breaks[5]:.0f} permits")
        print(f"7. Very Dark: {breaks[5]:.0f}+ permits")
        
        print("\nNote: This distribution splits active zip codes into 6 equal groups,")
        print("with an additional category for zip codes that have no permits.")
        
        # Generate config-ready breaks
        print("\n=== JavaScript Config Values ===")
        print("Copy these values into your config.js file:")
        print("const colorBreaks = [")
        print("    0,  // No permits (use gray)")
        for break_point in breaks[1:-1]:
            print(f"    {break_point:.0f},")
        print(f"    {breaks[-1]:.0f}")
        print("];")
        
    except FileNotFoundError:
        print(f"Error: Could not find file at {json_path}")
        print("Current working directory:", os.getcwd())
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    analyze_type_distribution()

#!/usr/bin/env python3

import logging
import sys
from typing import Dict, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MapHandler:
    def __init__(self):
        self.map_data = None
        self.color_scale = None
        
    def aggregatePermitData(self, permit_data: List[Dict]) -> Dict:
        """
        Aggregate permit data by ZIP code
        
        Args:
            permit_data: List of permit dictionaries
            
        Returns:
            Dictionary of aggregated permit data by ZIP code
        """
        aggregated = {}
        try:
            for permit in permit_data:
                zip_code = permit.get('zipcode')
                if zip_code:
                    if zip_code not in aggregated:
                        aggregated[zip_code] = {
                            'count': 0,
                            'permits': []
                        }
                    aggregated[zip_code]['count'] += 1
                    aggregated[zip_code]['permits'].append(permit)
            return aggregated
        except Exception as e:
            logger.error(f"Error aggregating permit data: {str(e)}")
            return {}

def validate_permit_data(data: List[Dict]) -> bool:
    """
    Validate incoming permit data structure
    
    Args:
        data: List of permit dictionaries
        
    Returns:
        Boolean indicating if data is valid
    """
    try:
        if not data:
            logger.error("Empty permit data")
            return False
            
        required_fields = ['zipcode', 'date', 'type']
        for permit in data:
            if not all(field in permit for field in required_fields):
                logger.error(f"Missing required fields in permit: {permit}")
                return False
                
        return True
    except Exception as e:
        logger.error(f"Data validation failed: {str(e)}")
        return False


def main():
    """Main function to process permits and run tests"""
    # Sample test data
    test_data = [
        {
            "zipcode": "10001",
            "date": "2023-01-01",
            "type": "Street Fair"
        },
        {
            "zipcode": "10002",
            "date": "2023-01-02",
            "type": "Film Shoot"
        }
    ]
    
    print("\nTesting permit data processing:")
    print("-" * 30)
    print("Test Data Sample:")
    for permit in test_data[:2]:
        print(f"ZIP: {permit['zipcode']}, Type: {permit['type']}")
    
    print("\nValidation Results:")
    if validate_permit_data(test_data):
        print("✓ Data validation passed")
        print("  - All required fields present")
        print("  - Data structure is valid")
        
       
    else:
        print("✗ Data validation failed")
    print("-" * 30)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
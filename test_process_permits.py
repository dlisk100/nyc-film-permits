import pytest
from process_permits import MapHandler, validate_permit_data

# Fixtures
@pytest.fixture
def sample_permit_data():
    """
    Fixture providing sample permit data for testing
    Returns a list of dictionaries with permit information
    """
    return [
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

# Environment Setup Test
def test_setup():
    """Verify the test environment configuration"""
    try:
        import pytest
        print("\nTest environment verification:")
        print("-" * 30)
        print("✓ pytest successfully imported")
    except ImportError as e:
        print("✗ pytest import failed")
        raise e

# Data Validation Tests
def test_validate_permit_data(sample_permit_data):
    """Test data validation with valid permit data"""
    try:
        result = validate_permit_data(sample_permit_data)
        assert result is True, "Validation failed for valid permit data"
    except Exception as e:
        pytest.fail(f"Validation test failed with error: {str(e)}")

def test_validate_permit_data_empty():
    """Test data validation with empty dataset"""
    try:
        result = validate_permit_data([])
        assert result is False, "Empty data validation should return False"
    except Exception as e:
        pytest.fail(f"Empty data validation test failed with error: {str(e)}")

# Map Handler Tests
def test_map_handler_aggregation(sample_permit_data):
    """Test permit data aggregation functionality"""
    try:
        handler = MapHandler()
        result = handler.aggregatePermitData(sample_permit_data)
        
        # Verify structure
        assert isinstance(result, dict), "Result should be a dictionary"
        
        # Verify content
        assert "10001" in result, "Expected ZIP code 10001 missing"
        assert "10002" in result, "Expected ZIP code 10002 missing"
        
        # Verify counts
        assert result["10001"]["count"] == 1, "Incorrect count for ZIP 10001"
        assert result["10002"]["count"] == 1, "Incorrect count for ZIP 10002"
    except Exception as e:
        pytest.fail(f"Map handler aggregation test failed with error: {str(e)}")

def test_map_features(sample_permit_data):
    """Test complete map feature workflow"""
    try:
        handler = MapHandler()
        result = handler.aggregatePermitData(sample_permit_data)
        
        assert result is not None, "Aggregation returned None"
        assert isinstance(result, dict), "Result must be a dictionary"
        assert len(result) == 2, "Expected exactly 2 ZIP codes"
        assert all(isinstance(value, dict) for value in result.values()), "Invalid value structure"
    except Exception as e:
        pytest.fail(f"Map features test failed with error: {str(e)}")

def test_edge_cases():
    """Test handling of edge cases"""
    handler = MapHandler()
    
    # Test with empty input
    empty_result = handler.aggregatePermitData([])
    assert isinstance(empty_result, dict), "Empty input should return empty dict"
    assert len(empty_result) == 0, "Empty input should return empty dict"

if __name__ == "__main__":
    pytest.main(["-v"])
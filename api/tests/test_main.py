import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_route():
    """Test the root route returns the expected response."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to the Consensus Service API",
        "docs": "/docs",
        "version": "0.1.0"
    }

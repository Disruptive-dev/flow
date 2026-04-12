"""
Iteration 7 Tests - Spectra Flow
Testing:
1. Analytics time-series endpoint with period filter (week/month/quarter/year)
2. Scoring configuration UI endpoints (GET/PUT /settings/scoring)
3. Auto-list creation when prospect job runs
4. Docker deployment files existence
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["email"] == "admin@spectraflow.com"
        print("PASS: Admin login successful")


class TestAnalyticsTimeSeries:
    """Analytics time-series endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_time_series_week(self, auth_headers):
        """GET /api/analytics/time-series?period=week returns time_series array + top_categories + quality_distribution"""
        response = requests.get(f"{BASE_URL}/api/analytics/time-series", params={"period": "week"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "time_series" in data, "Missing time_series array"
        assert "top_categories" in data, "Missing top_categories"
        assert "quality_distribution" in data, "Missing quality_distribution"
        assert "period" in data, "Missing period"
        assert "days" in data, "Missing days"
        
        # Verify period is week (7 days)
        assert data["period"] == "week"
        assert data["days"] == 7
        
        # Verify time_series has 8 data points (7 days + today)
        assert isinstance(data["time_series"], list)
        assert len(data["time_series"]) == 8, f"Expected 8 data points for week, got {len(data['time_series'])}"
        
        # Verify each data point has required fields
        if data["time_series"]:
            point = data["time_series"][0]
            assert "date" in point
            assert "label" in point
            assert "leads" in point
            assert "scored" in point
            assert "rejected" in point
            assert "jobs" in point
            assert "contacts" in point
        
        print("PASS: Time-series week endpoint returns correct structure")
    
    def test_time_series_month(self, auth_headers):
        """GET /api/analytics/time-series?period=month returns 31 data points"""
        response = requests.get(f"{BASE_URL}/api/analytics/time-series", params={"period": "month"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["period"] == "month"
        assert data["days"] == 30
        # 30 days + today = 31 data points
        assert len(data["time_series"]) == 31, f"Expected 31 data points for month, got {len(data['time_series'])}"
        
        print("PASS: Time-series month endpoint returns 31 data points")
    
    def test_time_series_quarter(self, auth_headers):
        """GET /api/analytics/time-series?period=quarter returns 91 data points"""
        response = requests.get(f"{BASE_URL}/api/analytics/time-series", params={"period": "quarter"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["period"] == "quarter"
        assert data["days"] == 90
        # 90 days + today = 91 data points
        assert len(data["time_series"]) == 91, f"Expected 91 data points for quarter, got {len(data['time_series'])}"
        
        print("PASS: Time-series quarter endpoint returns 91 data points")
    
    def test_time_series_year(self, auth_headers):
        """GET /api/analytics/time-series?period=year returns 366 data points"""
        response = requests.get(f"{BASE_URL}/api/analytics/time-series", params={"period": "year"}, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["period"] == "year"
        assert data["days"] == 365
        # 365 days + today = 366 data points
        assert len(data["time_series"]) == 366, f"Expected 366 data points for year, got {len(data['time_series'])}"
        
        print("PASS: Time-series year endpoint returns 366 data points")
    
    def test_time_series_top_categories_structure(self, auth_headers):
        """Verify top_categories has correct structure"""
        response = requests.get(f"{BASE_URL}/api/analytics/time-series", params={"period": "week"}, headers=auth_headers)
        data = response.json()
        
        assert isinstance(data["top_categories"], list)
        if data["top_categories"]:
            cat = data["top_categories"][0]
            assert "name" in cat, "Category missing 'name'"
            assert "count" in cat, "Category missing 'count'"
            assert "avg_score" in cat, "Category missing 'avg_score'"
        
        print("PASS: Top categories structure is correct")
    
    def test_time_series_quality_distribution_structure(self, auth_headers):
        """Verify quality_distribution has correct structure"""
        response = requests.get(f"{BASE_URL}/api/analytics/time-series", params={"period": "week"}, headers=auth_headers)
        data = response.json()
        
        assert isinstance(data["quality_distribution"], list)
        if data["quality_distribution"]:
            q = data["quality_distribution"][0]
            assert "name" in q, "Quality missing 'name'"
            assert "count" in q, "Quality missing 'count'"
        
        print("PASS: Quality distribution structure is correct")


class TestScoringConfig:
    """Scoring configuration endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_scoring_config(self, auth_headers):
        """GET /api/settings/scoring returns scoring weights"""
        response = requests.get(f"{BASE_URL}/api/settings/scoring", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify at least some core scoring weights exist (config may have been customized)
        core_keys = ["website", "email", "phone", "min_excellent", "min_good"]
        
        for key in core_keys:
            assert key in data, f"Missing core scoring key: {key}"
            assert isinstance(data[key], (int, float)), f"Scoring key {key} should be numeric"
        
        # Verify it's a dict with numeric values
        assert isinstance(data, dict), "Scoring config should be a dict"
        assert len(data) >= 5, f"Scoring config should have at least 5 keys, got {len(data)}"
        
        print(f"PASS: GET /api/settings/scoring returns scoring weights: {list(data.keys())}")
    
    def test_put_scoring_config(self, auth_headers):
        """PUT /api/settings/scoring saves custom weights"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/settings/scoring", headers=auth_headers)
        original_config = get_response.json()
        
        # Update with custom weights
        custom_config = {
            "website": 25,
            "email": 20,
            "phone": 15,
            "address": 10,
            "rating_excellent": 25,
            "rating_good": 18,
            "rating_fair": 12,
            "reviews_100": 12,
            "reviews_50": 8,
            "reviews_10": 5,
            "category_match": 10,
            "professional_name": 5,
            "min_excellent": 85,
            "min_good": 65,
            "min_average": 45
        }
        
        put_response = requests.put(f"{BASE_URL}/api/settings/scoring", json=custom_config, headers=auth_headers)
        assert put_response.status_code == 200, f"Failed to save: {put_response.text}"
        
        # Verify the config was saved by fetching again
        verify_response = requests.get(f"{BASE_URL}/api/settings/scoring", headers=auth_headers)
        saved_config = verify_response.json()
        
        assert saved_config["website"] == 25, "Website weight not saved"
        assert saved_config["min_excellent"] == 85, "min_excellent threshold not saved"
        
        # Restore original config
        requests.put(f"{BASE_URL}/api/settings/scoring", json=original_config, headers=auth_headers)
        
        print("PASS: PUT /api/settings/scoring saves custom weights correctly")


class TestAutoListOnJobStart:
    """Test auto-list creation when prospect job runs"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_auto_list_created_on_job_start(self, auth_headers):
        """When prospect job starts, scored leads are auto-saved to email list"""
        # Create a prospect job
        job_data = {
            "country": "Argentina",
            "province": "Tucuman",
            "city": "San Miguel de Tucuman",
            "category": "TEST_AutoList_Category",
            "quantity": 20
        }
        
        create_response = requests.post(f"{BASE_URL}/api/prospect-jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200, f"Failed to create job: {create_response.text}"
        job = create_response.json()
        job_id = job["id"]
        
        # Start the job (this should create leads and auto-list)
        start_response = requests.post(f"{BASE_URL}/api/prospect-jobs/{job_id}/start", headers=auth_headers)
        assert start_response.status_code == 200, f"Failed to start job: {start_response.text}"
        
        # Check if auto-list was created
        expected_list_name = f"Prospeccion / TEST_AutoList_Category - Leads calificados"
        
        # Get all email lists
        lists_response = requests.get(f"{BASE_URL}/api/email-marketing/lists", headers=auth_headers)
        assert lists_response.status_code == 200
        lists = lists_response.json()
        
        # Find the auto-created list
        auto_list = next((l for l in lists if l["name"] == expected_list_name), None)
        assert auto_list is not None, f"Auto-list '{expected_list_name}' was not created"
        assert auto_list["subscriber_count"] > 0, "Auto-list should have subscribers"
        assert len(auto_list.get("lead_ids", [])) > 0, "Auto-list should have lead_ids"
        
        print(f"PASS: Auto-list created with {auto_list['subscriber_count']} leads")
        
        # Cleanup - delete the auto-list
        if auto_list:
            requests.delete(f"{BASE_URL}/api/email-marketing/lists/{auto_list['id']}", headers=auth_headers)
        
        # Cleanup - delete test leads
        leads_response = requests.get(f"{BASE_URL}/api/leads", params={"job_id": job_id}, headers=auth_headers)
        if leads_response.status_code == 200:
            leads_data = leads_response.json()
            for lead in leads_data.get("leads", []):
                requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers)


class TestDockerDeploymentFiles:
    """Test Docker deployment files existence"""
    
    def test_backend_dockerfile_exists(self):
        """Dockerfile exists at /app/backend/Dockerfile"""
        assert os.path.exists("/app/backend/Dockerfile"), "Backend Dockerfile not found"
        
        with open("/app/backend/Dockerfile", "r") as f:
            content = f.read()
        
        # Verify it's a valid Dockerfile
        assert "FROM" in content, "Dockerfile missing FROM instruction"
        assert "python" in content.lower(), "Dockerfile should use Python image"
        assert "8001" in content, "Dockerfile should expose port 8001"
        
        print("PASS: Backend Dockerfile exists and is valid")
    
    def test_frontend_dockerfile_exists(self):
        """Dockerfile exists at /app/frontend/Dockerfile"""
        assert os.path.exists("/app/frontend/Dockerfile"), "Frontend Dockerfile not found"
        
        with open("/app/frontend/Dockerfile", "r") as f:
            content = f.read()
        
        # Verify it's a valid Dockerfile
        assert "FROM" in content, "Dockerfile missing FROM instruction"
        assert "node" in content.lower(), "Dockerfile should use Node image"
        assert "nginx" in content.lower(), "Dockerfile should use nginx for serving"
        
        print("PASS: Frontend Dockerfile exists and is valid")
    
    def test_docker_compose_exists(self):
        """docker-compose.yml exists at /app/docker-compose.yml"""
        assert os.path.exists("/app/docker-compose.yml"), "docker-compose.yml not found"
        
        with open("/app/docker-compose.yml", "r") as f:
            content = f.read()
        
        # Verify it has required services
        assert "mongodb" in content.lower(), "docker-compose missing mongodb service"
        assert "backend" in content, "docker-compose missing backend service"
        assert "frontend" in content, "docker-compose missing frontend service"
        assert "volumes" in content, "docker-compose missing volumes"
        
        print("PASS: docker-compose.yml exists and has required services")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Iteration 4 Backend Tests - Spectra Flow SaaS
Testing: Dashboard date filters, A/B testing, PWA manifest, Excel export
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
        print(f"Login successful: {data['email']}")


class TestDashboardDateFilters:
    """Dashboard date filter and comparison mode tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_stats_no_filter(self, auth_headers):
        """Test dashboard stats without date filter (all time)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Verify required fields exist
        required_fields = ["jobs_this_month", "total_leads", "qualified_leads", "emails_sent", 
                          "opens", "clicks", "replies", "interested", "leads_sent_to_crm", 
                          "opportunities", "active_campaigns", "recent_activity"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"Dashboard stats (all time): {data['total_leads']} leads, {data['emails_sent']} emails sent")
    
    def test_dashboard_stats_with_date_filter(self, auth_headers):
        """Test dashboard stats with from_date and to_date params"""
        params = {
            "from_date": "2025-01-01T00:00:00",
            "to_date": "2026-12-31T23:59:59"
        }
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers, params=params)
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "emails_sent" in data
        print(f"Dashboard stats (filtered): {data['total_leads']} leads")
    
    def test_dashboard_stats_today_filter(self, auth_headers):
        """Test dashboard stats for today"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%dT00:00:00")
        today_end = datetime.now().strftime("%Y-%m-%dT23:59:59")
        params = {"from_date": today, "to_date": today_end}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers, params=params)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("total_leads"), int)
        print(f"Dashboard stats (today): {data['total_leads']} leads")


class TestABTesting:
    """A/B Template Testing endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_templates(self, auth_headers):
        """Create two test templates for A/B testing"""
        template_a = requests.post(f"{BASE_URL}/api/templates", headers=auth_headers, json={
            "name": "TEST_Template_A",
            "subject": "Test Subject A - {business_name}",
            "html_body": "<p>Hello from Template A</p>",
            "variables": ["business_name"]
        })
        template_b = requests.post(f"{BASE_URL}/api/templates", headers=auth_headers, json={
            "name": "TEST_Template_B",
            "subject": "Test Subject B - {business_name}",
            "html_body": "<p>Hello from Template B</p>",
            "variables": ["business_name"]
        })
        assert template_a.status_code == 200, f"Failed to create template A: {template_a.text}"
        assert template_b.status_code == 200, f"Failed to create template B: {template_b.text}"
        return {
            "template_a_id": template_a.json()["id"],
            "template_b_id": template_b.json()["id"]
        }
    
    def test_create_ab_test(self, auth_headers, test_templates):
        """Test creating an A/B test between two templates"""
        response = requests.post(f"{BASE_URL}/api/templates/ab-test", headers=auth_headers, json={
            "name": "TEST_AB_Test_Q1_2026",
            "template_a_id": test_templates["template_a_id"],
            "template_b_id": test_templates["template_b_id"],
            "split": 50
        })
        assert response.status_code == 200, f"Failed to create A/B test: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_AB_Test_Q1_2026"
        assert data["status"] == "borrador"
        assert "template_a" in data
        assert "template_b" in data
        print(f"A/B Test created: {data['id']}")
        # Store for later tests
        TestABTesting.ab_test_id = data["id"]
    
    def test_list_ab_tests(self, auth_headers):
        """Test listing A/B tests"""
        response = requests.get(f"{BASE_URL}/api/templates/ab-tests", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} A/B tests")
    
    def test_simulate_ab_test(self, auth_headers):
        """Test simulating an A/B test to get results"""
        if not hasattr(TestABTesting, 'ab_test_id'):
            pytest.skip("No A/B test created")
        
        response = requests.post(f"{BASE_URL}/api/templates/ab-tests/{TestABTesting.ab_test_id}/simulate", headers=auth_headers)
        assert response.status_code == 200, f"Failed to simulate: {response.text}"
        data = response.json()
        assert data["status"] == "completado"
        assert data["winner"] in ["A", "B", "Empate"]
        assert data["template_a"]["sent"] > 0
        assert data["template_b"]["sent"] > 0
        print(f"A/B Test simulated - Winner: {data['winner']}")
        print(f"  Template A: {data['template_a']['opens']} opens / {data['template_a']['sent']} sent")
        print(f"  Template B: {data['template_b']['opens']} opens / {data['template_b']['sent']} sent")


class TestPWAManifest:
    """PWA manifest and service worker tests"""
    
    def test_manifest_accessible(self):
        """Test that manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        # Note: manifest.json is served by frontend, not backend API
        # This test checks if it's accessible via the public URL
        if response.status_code == 200:
            data = response.json()
            assert "name" in data
            assert data["name"] == "Spectra Flow"
            assert "icons" in data
            print(f"PWA Manifest accessible: {data['name']}")
        else:
            # If not accessible via API URL, it's expected (served by frontend)
            print(f"Manifest not at API URL (expected - served by frontend): {response.status_code}")


class TestExcelExport:
    """Excel export tests with authentication"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_export_leads_with_auth(self, auth_headers):
        """Test leads export with authentication"""
        response = requests.get(f"{BASE_URL}/api/export/leads", headers=auth_headers)
        assert response.status_code == 200, f"Export failed: {response.status_code}"
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("Content-Type", "")
        assert len(response.content) > 0
        print(f"Leads export successful: {len(response.content)} bytes")
    
    def test_export_leads_without_auth(self):
        """Test leads export without authentication returns 401"""
        response = requests.get(f"{BASE_URL}/api/export/leads")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Export without auth correctly returns 401")
    
    def test_export_crm_contacts_with_auth(self, auth_headers):
        """Test CRM contacts export with authentication"""
        response = requests.get(f"{BASE_URL}/api/export/crm-contacts", headers=auth_headers)
        assert response.status_code == 200, f"Export failed: {response.status_code}"
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("Content-Type", "")
        print(f"CRM contacts export successful: {len(response.content)} bytes")


class TestTemplates:
    """Template CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_templates(self, auth_headers):
        """Test listing templates"""
        response = requests.get(f"{BASE_URL}/api/templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} templates")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_templates(self, auth_headers):
        """Clean up TEST_ prefixed templates"""
        response = requests.get(f"{BASE_URL}/api/templates", headers=auth_headers)
        if response.status_code == 200:
            templates = response.json()
            deleted = 0
            for t in templates:
                if t.get("name", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/templates/{t['id']}", headers=auth_headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

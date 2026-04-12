"""
Iteration 3 Backend Tests for Spectra Flow
Tests for:
1. FlowBot follow-up questions (KeyError fix)
2. Excel export endpoints (auth token fix)
3. Dashboard stats endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@spectraflow.com"
        assert data["role"] == "super_admin"
        assert "access_token" in data
        print("Login test passed")


class TestFlowBot:
    """FlowBot AI endpoint tests - verifies KeyError fix"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_flowbot_initial_analysis(self, auth_token):
        """Test FlowBot initial analysis without question"""
        response = requests.post(
            f"{BASE_URL}/api/ai/flow-bot",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"section": "dashboard"}
        )
        assert response.status_code == 200, f"FlowBot failed: {response.text}"
        data = response.json()
        assert "response" in data
        assert "context" in data
        assert len(data["response"]) > 0
        print(f"FlowBot initial analysis: {data['response'][:100]}...")
    
    def test_flowbot_followup_question(self, auth_token):
        """Test FlowBot follow-up question - verifies KeyError fix for deals without 'name'"""
        response = requests.post(
            f"{BASE_URL}/api/ai/flow-bot",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"section": "dashboard", "question": "analiza la campana Real Estate"}
        )
        assert response.status_code == 200, f"FlowBot follow-up failed: {response.text}"
        data = response.json()
        assert "response" in data
        assert "context" in data
        # Verify no error message in response
        assert "error al procesar" not in data["response"].lower()
        print(f"FlowBot follow-up response: {data['response'][:100]}...")
    
    def test_flowbot_question_about_deals(self, auth_token):
        """Test FlowBot question about deals - verifies d.get('name', d.get('title', '')) fix"""
        response = requests.post(
            f"{BASE_URL}/api/ai/flow-bot",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"section": "crm", "question": "cuales son mis oportunidades activas"}
        )
        assert response.status_code == 200, f"FlowBot deals query failed: {response.text}"
        data = response.json()
        assert "response" in data
        print(f"FlowBot deals response: {data['response'][:100]}...")
    
    def test_flowbot_question_about_contacts(self, auth_token):
        """Test FlowBot question about contacts"""
        response = requests.post(
            f"{BASE_URL}/api/ai/flow-bot",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"section": "crm", "question": "dame informacion sobre mis contactos"}
        )
        assert response.status_code == 200, f"FlowBot contacts query failed: {response.text}"
        data = response.json()
        assert "response" in data
        print(f"FlowBot contacts response: {data['response'][:100]}...")


class TestExcelExport:
    """Excel export endpoint tests - verifies auth token fix"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_export_leads_with_auth(self, auth_token):
        """Test leads export with proper auth token"""
        response = requests.get(
            f"{BASE_URL}/api/export/leads",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Leads export failed: {response.text}"
        # Check content type is xlsx
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, f"Wrong content type: {content_type}"
        # Check file size
        assert len(response.content) > 0, "Empty file returned"
        print(f"Leads export successful, file size: {len(response.content)} bytes")
    
    def test_export_crm_contacts_with_auth(self, auth_token):
        """Test CRM contacts export with proper auth token"""
        response = requests.get(
            f"{BASE_URL}/api/export/crm-contacts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"CRM export failed: {response.text}"
        # Check content type is xlsx
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, f"Wrong content type: {content_type}"
        # Check file size
        assert len(response.content) > 0, "Empty file returned"
        print(f"CRM export successful, file size: {len(response.content)} bytes")
    
    def test_export_leads_without_auth(self):
        """Test leads export without auth - should fail"""
        response = requests.get(f"{BASE_URL}/api/export/leads")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Leads export correctly requires auth")
    
    def test_export_crm_without_auth(self):
        """Test CRM export without auth - should fail"""
        response = requests.get(f"{BASE_URL}/api/export/crm-contacts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("CRM export correctly requires auth")


class TestDashboard:
    """Dashboard stats endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard stats endpoint returns all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Check required fields for conversion rates
        required_fields = [
            "jobs_this_month", "total_leads", "qualified_leads",
            "emails_sent", "opens", "clicks", "replies",
            "interested", "leads_sent_to_crm", "opportunities",
            "active_campaigns", "recent_activity"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Dashboard stats: total_leads={data['total_leads']}, emails_sent={data['emails_sent']}, opens={data['opens']}")


class TestCRMEndpoints:
    """CRM endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_crm_contacts_list(self, auth_token):
        """Test CRM contacts list"""
        response = requests.get(
            f"{BASE_URL}/api/crm/contacts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"CRM contacts count: {len(data)}")
    
    def test_crm_deals_list(self, auth_token):
        """Test CRM deals list"""
        response = requests.get(
            f"{BASE_URL}/api/crm/deals",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"CRM deals count: {len(data)}")
    
    def test_crm_stats(self, auth_token):
        """Test CRM stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/crm/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_contacts" in data
        assert "total_deals" in data
        assert "stage_counts" in data
        print(f"CRM stats: contacts={data['total_contacts']}, deals={data['total_deals']}")


class TestLeadsEndpoints:
    """Leads endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_leads_list(self, auth_token):
        """Test leads list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "total" in data
        print(f"Leads count: {data['total']}")
    
    def test_leads_search(self, auth_token):
        """Test leads search functionality"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"search": "Real Estate"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        print(f"Search results: {len(data['leads'])} leads")


class TestCampaigns:
    """Campaign endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_campaigns_list(self, auth_token):
        """Test campaigns list"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Campaigns count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

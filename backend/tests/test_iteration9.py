"""
Iteration 9 Tests - Manual Lead Creation & Sequence Email List Automation
Features:
1. POST /api/leads creates a manual lead with source='manual' and status='raw'
2. POST /api/leads requires business_name (returns 400 if empty)
3. PUT /api/leads/{id}/status with queued_for_sequence creates 'Secuencia - Leads en cola' email list
4. GET /api/admin/tenants still works (regression)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration9:
    """Iteration 9 - Manual Lead Creation & Sequence Automation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        self.token = login_data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    # ==================== POST /api/leads Tests ====================
    
    def test_create_manual_lead_success(self):
        """POST /api/leads creates a manual lead with source='manual' and status='raw'"""
        unique_name = f"TEST_ManualLead_{uuid.uuid4().hex[:8]}"
        payload = {
            "business_name": unique_name,
            "email": "test@manual.com",
            "phone": "+54 11 1234-5678",
            "city": "Buenos Aires",
            "category": "Technology",
            "website": "www.testmanual.com",
            "notes": "Test manual lead creation"
        }
        
        response = self.session.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Create lead failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "id" in data, "Response should contain 'id'"
        assert data["business_name"] == unique_name, "business_name should match"
        assert data["status"] == "raw", f"Status should be 'raw', got: {data.get('status')}"
        assert data.get("source") == "manual", f"Source should be 'manual', got: {data.get('source')}"
        assert data["email"] == "test@manual.com", "Email should match"
        assert data["phone"] == "+54 11 1234-5678", "Phone should match"
        assert data["city"] == "Buenos Aires", "City should match"
        
        # Verify lead can be retrieved
        lead_id = data["id"]
        get_response = self.session.get(f"{BASE_URL}/api/leads/{lead_id}")
        assert get_response.status_code == 200, f"Get lead failed: {get_response.text}"
        fetched = get_response.json()
        assert fetched["business_name"] == unique_name
        assert fetched["status"] == "raw"
        
        print(f"✓ Manual lead created successfully with id={lead_id}, source=manual, status=raw")
    
    def test_create_lead_requires_business_name(self):
        """POST /api/leads returns 400 if business_name is empty"""
        # Test with empty business_name
        payload = {
            "business_name": "",
            "email": "test@empty.com"
        }
        
        response = self.session.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 400, f"Expected 400 for empty business_name, got: {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        print(f"✓ Empty business_name correctly returns 400: {data.get('detail')}")
    
    def test_create_lead_requires_business_name_whitespace(self):
        """POST /api/leads returns 400 if business_name is only whitespace"""
        payload = {
            "business_name": "   ",
            "email": "test@whitespace.com"
        }
        
        response = self.session.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 400, f"Expected 400 for whitespace business_name, got: {response.status_code}"
        print("✓ Whitespace-only business_name correctly returns 400")
    
    def test_create_lead_no_business_name_field(self):
        """POST /api/leads returns 400 if business_name field is missing"""
        payload = {
            "email": "test@noname.com",
            "city": "Cordoba"
        }
        
        response = self.session.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing business_name, got: {response.status_code}"
        print("✓ Missing business_name field correctly returns 400")
    
    # ==================== Queued for Sequence Email List Tests ====================
    
    def test_queued_for_sequence_creates_email_list(self):
        """PUT /api/leads/{id}/status with queued_for_sequence creates 'Secuencia - Leads en cola' email list"""
        # First create a lead
        unique_name = f"TEST_SeqLead_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/leads", json={
            "business_name": unique_name,
            "email": "seq@test.com"
        })
        assert create_response.status_code == 200, f"Create lead failed: {create_response.text}"
        lead_id = create_response.json()["id"]
        
        # Update status to queued_for_sequence
        status_response = self.session.put(f"{BASE_URL}/api/leads/{lead_id}/status", json={
            "status": "queued_for_sequence"
        })
        assert status_response.status_code == 200, f"Update status failed: {status_response.text}"
        
        # Verify the email list was created
        lists_response = self.session.get(f"{BASE_URL}/api/email-marketing/lists")
        assert lists_response.status_code == 200, f"Get email lists failed: {lists_response.text}"
        
        email_lists = lists_response.json()
        seq_list = next((l for l in email_lists if l.get("name") == "Secuencia - Leads en cola"), None)
        
        assert seq_list is not None, "Email list 'Secuencia - Leads en cola' should exist"
        assert lead_id in seq_list.get("lead_ids", []), f"Lead {lead_id} should be in the email list"
        
        print(f"✓ queued_for_sequence status creates/updates 'Secuencia - Leads en cola' email list with lead {lead_id}")
    
    def test_queued_for_sequence_adds_to_existing_list(self):
        """PUT /api/leads/{id}/status with queued_for_sequence adds lead to existing list (no duplicates)"""
        # Create two leads
        lead1_name = f"TEST_SeqLead1_{uuid.uuid4().hex[:8]}"
        lead2_name = f"TEST_SeqLead2_{uuid.uuid4().hex[:8]}"
        
        create1 = self.session.post(f"{BASE_URL}/api/leads", json={"business_name": lead1_name})
        create2 = self.session.post(f"{BASE_URL}/api/leads", json={"business_name": lead2_name})
        
        assert create1.status_code == 200
        assert create2.status_code == 200
        
        lead1_id = create1.json()["id"]
        lead2_id = create2.json()["id"]
        
        # Queue both leads
        self.session.put(f"{BASE_URL}/api/leads/{lead1_id}/status", json={"status": "queued_for_sequence"})
        self.session.put(f"{BASE_URL}/api/leads/{lead2_id}/status", json={"status": "queued_for_sequence"})
        
        # Verify both are in the list
        lists_response = self.session.get(f"{BASE_URL}/api/email-marketing/lists")
        email_lists = lists_response.json()
        seq_list = next((l for l in email_lists if l.get("name") == "Secuencia - Leads en cola"), None)
        
        assert seq_list is not None
        lead_ids = seq_list.get("lead_ids", [])
        assert lead1_id in lead_ids, f"Lead1 {lead1_id} should be in list"
        assert lead2_id in lead_ids, f"Lead2 {lead2_id} should be in list"
        
        # Queue lead1 again - should not duplicate
        self.session.put(f"{BASE_URL}/api/leads/{lead1_id}/status", json={"status": "queued_for_sequence"})
        
        lists_response2 = self.session.get(f"{BASE_URL}/api/email-marketing/lists")
        seq_list2 = next((l for l in lists_response2.json() if l.get("name") == "Secuencia - Leads en cola"), None)
        lead_ids2 = seq_list2.get("lead_ids", [])
        
        # Count occurrences of lead1_id
        count = lead_ids2.count(lead1_id)
        assert count == 1, f"Lead1 should appear only once in list, found {count} times"
        
        print(f"✓ Multiple leads added to sequence list without duplicates")
    
    # ==================== Regression Tests ====================
    
    def test_admin_tenants_endpoint_still_works(self):
        """GET /api/admin/tenants still works (regression from iteration 8)"""
        response = self.session.get(f"{BASE_URL}/api/admin/tenants")
        assert response.status_code == 200, f"Admin tenants failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of tenants"
        
        if len(data) > 0:
            tenant = data[0]
            # Verify expected fields from iteration 8
            assert "id" in tenant
            assert "name" in tenant
            print(f"✓ GET /api/admin/tenants returns {len(data)} tenants")
        else:
            print("✓ GET /api/admin/tenants returns empty list (no tenants)")
    
    def test_leads_list_endpoint_works(self):
        """GET /api/leads returns paginated leads list"""
        response = self.session.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200, f"Get leads failed: {response.text}"
        
        data = response.json()
        assert "leads" in data, "Response should contain 'leads'"
        assert "total" in data, "Response should contain 'total'"
        assert "page" in data, "Response should contain 'page'"
        assert "pages" in data, "Response should contain 'pages'"
        
        print(f"✓ GET /api/leads returns {data['total']} total leads")
    
    def test_leads_stats_endpoint_works(self):
        """GET /api/leads/stats returns lead statistics"""
        response = self.session.get(f"{BASE_URL}/api/leads/stats")
        assert response.status_code == 200, f"Get leads stats failed: {response.text}"
        
        data = response.json()
        assert "total" in data, "Response should contain 'total'"
        assert "scored" in data, "Response should contain 'scored'"
        assert "approved" in data, "Response should contain 'approved'"
        assert "rejected" in data, "Response should contain 'rejected'"
        
        print(f"✓ GET /api/leads/stats returns stats: total={data['total']}, scored={data['scored']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

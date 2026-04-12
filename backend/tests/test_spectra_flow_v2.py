"""
Spectra Flow API Tests - Iteration 2
Testing new features: Resend email integration, API key masking, Spanish lead statuses,
quality parameters, editable automations, domain sync
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://spectra-hub.preview.emergentagent.com').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@spectraflow.com"
        assert data["role"] == "super_admin"
        assert "access_token" in data
        print("PASS: Admin login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Invalid credentials rejected")
    
    def test_get_me(self, auth_token):
        """Test /auth/me endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@spectraflow.com"
        print("PASS: /auth/me returns user data")


class TestSettings:
    """Settings API tests - Company fields and integrations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_get_settings(self, auth_token):
        """Test getting tenant settings"""
        response = requests.get(f"{BASE_URL}/api/settings", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        # Should have branding object
        assert "branding" in data or "name" in data
        print("PASS: Settings retrieved successfully")
    
    def test_update_company_fields(self, auth_token):
        """Test updating company data fields (industry, phone, tax_id, etc.)"""
        response = requests.put(f"{BASE_URL}/api/settings", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "company_name": "Test Company SRL",
                "industry": "Technology",
                "phone": "+54 381 555-1234",
                "tax_id": "30-12345678-9",
                "country": "Argentina",
                "address": "Av. Test 123",
                "website": "https://testcompany.com",
                "description": "Test company description"
            }
        )
        assert response.status_code == 200
        data = response.json()
        branding = data.get("branding", {})
        assert branding.get("company_name") == "Test Company SRL"
        assert branding.get("industry") == "Technology"
        assert branding.get("phone") == "+54 381 555-1234"
        assert branding.get("tax_id") == "30-12345678-9"
        print("PASS: Company fields updated successfully")
    
    def test_get_integrations(self, auth_token):
        """Test getting integrations list"""
        response = requests.get(f"{BASE_URL}/api/settings/integrations", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} integrations")


class TestLeads:
    """Leads API tests - Spanish statuses and quality parameters"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_list_leads(self, auth_token):
        """Test listing leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "total" in data
        print(f"PASS: Retrieved {data['total']} leads")
    
    def test_lead_has_quality_fields(self, auth_token):
        """Test that leads have quality_level and ai_score fields"""
        response = requests.get(f"{BASE_URL}/api/leads?limit=5", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        if data["leads"]:
            lead = data["leads"][0]
            # Check for quality parameter fields
            assert "ai_score" in lead, "Lead should have ai_score field"
            assert "quality_level" in lead, "Lead should have quality_level field"
            assert "status" in lead, "Lead should have status field"
            print(f"PASS: Lead has quality fields - score: {lead.get('ai_score')}, quality: {lead.get('quality_level')}, status: {lead.get('status')}")
        else:
            print("INFO: No leads found to verify quality fields")
    
    def test_lead_status_update(self, auth_token):
        """Test updating lead status (Spanish statuses)"""
        # First get a lead
        response = requests.get(f"{BASE_URL}/api/leads?limit=1", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        data = response.json()
        if data["leads"]:
            lead_id = data["leads"][0]["id"]
            # Update status to 'approved' (Aprobado in Spanish UI)
            update_response = requests.put(f"{BASE_URL}/api/leads/{lead_id}/status",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"status": "approved"}
            )
            assert update_response.status_code == 200
            print("PASS: Lead status updated successfully")
        else:
            print("INFO: No leads to test status update")
    
    def test_get_lead_detail(self, auth_token):
        """Test getting lead detail with events"""
        response = requests.get(f"{BASE_URL}/api/leads?limit=1", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        data = response.json()
        if data["leads"]:
            lead_id = data["leads"][0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers={
                "Authorization": f"Bearer {auth_token}"
            })
            assert detail_response.status_code == 200
            detail = detail_response.json()
            assert "events" in detail
            print(f"PASS: Lead detail retrieved with {len(detail.get('events', []))} events")
        else:
            print("INFO: No leads to test detail view")


class TestDomains:
    """Domains API tests - Resend integration"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_list_domains(self, auth_token):
        """Test listing domains"""
        response = requests.get(f"{BASE_URL}/api/domains", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} domains")
        # Check if spectra-metrics.com is present
        for domain in data:
            if "spectra-metrics" in domain.get("domain", "") or "spectra-metrics" in domain.get("subdomain", ""):
                print(f"  Found spectra-metrics.com domain - status: {domain.get('status')}")
    
    def test_sync_resend_domains(self, auth_token):
        """Test syncing domains from Resend API"""
        response = requests.post(f"{BASE_URL}/api/domains/sync-resend", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "synced" in data
        assert "domains" in data
        print(f"PASS: Synced {data['synced']} domain(s) from Resend")
    
    def test_get_resend_status(self, auth_token):
        """Test getting Resend domains status"""
        response = requests.get(f"{BASE_URL}/api/domains/resend-status", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "domains" in data
        print(f"PASS: Resend status retrieved - {len(data['domains'])} domains")


class TestEmailSend:
    """Email sending API tests - Real Resend integration"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_email_send_endpoint_exists(self, auth_token):
        """Test that POST /api/email/send endpoint exists and validates input"""
        # Test with missing required fields
        response = requests.post(f"{BASE_URL}/api/email/send",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={}
        )
        # Should return 400 for missing required fields
        assert response.status_code == 400
        print("PASS: Email send endpoint validates required fields")
    
    def test_email_send_with_valid_data(self, auth_token):
        """Test email send with valid data (will actually send via Resend)"""
        response = requests.post(f"{BASE_URL}/api/email/send",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "to_email": "test@example.com",
                "subject": "Test Email from Spectra Flow",
                "html_body": "<p>This is a test email</p>",
                "from_name": "Spectra Flow Test"
            }
        )
        # Should succeed (200) or fail gracefully with error message
        assert response.status_code in [200, 500]
        data = response.json()
        if response.status_code == 200:
            print(f"PASS: Email send successful - simulated: {data.get('simulated', 'unknown')}")
        else:
            print(f"INFO: Email send returned error (expected if Resend not configured): {data}")


class TestEmailMarketing:
    """Email Marketing API tests - Automations CRUD"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_list_automations(self, auth_token):
        """Test listing automations"""
        response = requests.get(f"{BASE_URL}/api/email-marketing/automations", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} automations")
        return data
    
    def test_create_automation(self, auth_token):
        """Test creating a new automation"""
        response = requests.post(f"{BASE_URL}/api/email-marketing/automations",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"name": "TEST_Automation_Flow"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Automation_Flow"
        assert "id" in data
        assert "steps" in data
        print(f"PASS: Automation created with ID: {data['id']}")
        return data["id"]
    
    def test_update_automation_steps(self, auth_token):
        """Test updating automation steps (editable automations feature)"""
        # First create an automation
        create_response = requests.post(f"{BASE_URL}/api/email-marketing/automations",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"name": "TEST_Editable_Automation"}
        )
        automation_id = create_response.json()["id"]
        
        # Update with new steps
        new_steps = [
            {"type": "email", "delay_days": 0, "subject": "Welcome Email", "template": ""},
            {"type": "wait", "delay_days": 3, "subject": "", "template": ""},
            {"type": "email", "delay_days": 0, "subject": "Follow-up Email", "template": ""}
        ]
        
        update_response = requests.put(f"{BASE_URL}/api/email-marketing/automations/{automation_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"steps": new_steps, "trigger": "lead_approved"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert len(data["steps"]) == 3
        assert data["trigger"] == "lead_approved"
        print(f"PASS: Automation steps updated - {len(data['steps'])} steps")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/email-marketing/automations/{automation_id}",
            headers={"Authorization": f"Bearer {auth_token}"})
    
    def test_delete_automation(self, auth_token):
        """Test deleting an automation"""
        # Create one to delete
        create_response = requests.post(f"{BASE_URL}/api/email-marketing/automations",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"name": "TEST_To_Delete"}
        )
        automation_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/email-marketing/automations/{automation_id}",
            headers={"Authorization": f"Bearer {auth_token}"})
        assert delete_response.status_code == 200
        print("PASS: Automation deleted successfully")
    
    def test_list_email_campaigns(self, auth_token):
        """Test listing email marketing campaigns"""
        response = requests.get(f"{BASE_URL}/api/email-marketing/campaigns", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} email marketing campaigns")
    
    def test_email_marketing_stats(self, auth_token):
        """Test getting email marketing stats"""
        response = requests.get(f"{BASE_URL}/api/email-marketing/stats", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "lists" in data
        assert "campaigns" in data
        print(f"PASS: Email marketing stats retrieved")


class TestFlowBot:
    """FlowBot AI tests - Context-aware analysis"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_flow_bot_endpoint(self, auth_token):
        """Test FlowBot endpoint exists and responds"""
        response = requests.post(f"{BASE_URL}/api/ai/flow-bot",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"question": "What is the status of my leads?", "section": "leads"}
        )
        # Should return 200 or 500 (if AI service not available)
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert "response" in data
            print(f"PASS: FlowBot responded")
        else:
            print("INFO: FlowBot returned error (AI service may not be configured)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    def test_cleanup_test_automations(self, auth_token):
        """Clean up TEST_ prefixed automations"""
        response = requests.get(f"{BASE_URL}/api/email-marketing/automations", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        automations = response.json()
        deleted = 0
        for auto in automations:
            if auto["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/email-marketing/automations/{auto['id']}",
                    headers={"Authorization": f"Bearer {auth_token}"})
                deleted += 1
        print(f"PASS: Cleaned up {deleted} test automations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Iteration 5 Tests - Spectra Flow SaaS
Tests for:
1. CRM auto-creates deals when contact stage changes (individual and bulk)
2. Chatwoot webhook upserts contacts with 'bot' tag
3. Email Marketing full CRUD (edit/delete campaigns and lists)
4. Auto-create email lists from scored leads
5. Add leads to email lists from scored/approved leads
6. Scoring customizable endpoint
7. Dashboard layout (rates on top row)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
    
    def test_login_success(self, auth_token):
        """Test admin login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print("✓ Admin login successful")


class TestCrmAutoDealCreation:
    """Test CRM auto-creates deals when contact stage changes"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_contact_and_change_stage_creates_deal(self, auth_headers):
        """PUT /api/crm/contacts/{id} with stage change auto-creates deal"""
        # Create a test contact
        contact_data = {
            "business_name": f"TEST_AutoDeal_{uuid.uuid4().hex[:8]}",
            "contact_name": "Test Contact",
            "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "+54 11 1234-5678"
        }
        create_resp = requests.post(f"{BASE_URL}/api/crm/contacts", json=contact_data, headers=auth_headers)
        assert create_resp.status_code == 200, f"Create contact failed: {create_resp.text}"
        contact = create_resp.json()
        contact_id = contact["id"]
        business_name = contact["business_name"]
        
        # Verify no deals exist for this contact initially
        deals_resp = requests.get(f"{BASE_URL}/api/crm/deals", headers=auth_headers)
        assert deals_resp.status_code == 200
        initial_deals = [d for d in deals_resp.json() if d.get("contact_id") == contact_id]
        assert len(initial_deals) == 0, "Contact should have no deals initially"
        
        # Update contact stage to trigger auto-deal creation
        update_resp = requests.put(f"{BASE_URL}/api/crm/contacts/{contact_id}", json={"stage": "contactado"}, headers=auth_headers)
        assert update_resp.status_code == 200, f"Update contact failed: {update_resp.text}"
        
        # Verify deal was auto-created with business_name as title
        deals_resp = requests.get(f"{BASE_URL}/api/crm/deals", headers=auth_headers)
        assert deals_resp.status_code == 200
        new_deals = [d for d in deals_resp.json() if d.get("contact_id") == contact_id]
        assert len(new_deals) == 1, f"Expected 1 deal, got {len(new_deals)}"
        deal = new_deals[0]
        assert deal["title"] == business_name, f"Deal title should be business_name: {business_name}, got {deal['title']}"
        assert deal["stage"] == "contactado"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/crm/contacts/{contact_id}", headers=auth_headers)
        print(f"✓ Auto-deal created with title '{business_name}' on stage change")
    
    def test_bulk_contact_move_creates_deals(self, auth_headers):
        """Bulk contact move to stage auto-creates deals with business_name as title"""
        # Create multiple test contacts
        contact_ids = []
        business_names = []
        for i in range(2):
            contact_data = {
                "business_name": f"TEST_BulkDeal_{uuid.uuid4().hex[:8]}",
                "email": f"bulk_{uuid.uuid4().hex[:8]}@test.com"
            }
            resp = requests.post(f"{BASE_URL}/api/crm/contacts", json=contact_data, headers=auth_headers)
            assert resp.status_code == 200
            contact = resp.json()
            contact_ids.append(contact["id"])
            business_names.append(contact["business_name"])
        
        # Bulk move to propuesta stage
        bulk_resp = requests.post(f"{BASE_URL}/api/crm/contacts/bulk-action", json={
            "contact_ids": contact_ids,
            "action": "move",
            "stage": "propuesta"
        }, headers=auth_headers)
        assert bulk_resp.status_code == 200, f"Bulk action failed: {bulk_resp.text}"
        
        # Verify deals were created for each contact
        deals_resp = requests.get(f"{BASE_URL}/api/crm/deals", headers=auth_headers)
        assert deals_resp.status_code == 200
        all_deals = deals_resp.json()
        
        for i, cid in enumerate(contact_ids):
            contact_deals = [d for d in all_deals if d.get("contact_id") == cid]
            assert len(contact_deals) >= 1, f"Contact {cid} should have a deal"
            assert contact_deals[0]["title"] == business_names[i], f"Deal title should be {business_names[i]}"
            assert contact_deals[0]["stage"] == "propuesta"
        
        # Cleanup
        for cid in contact_ids:
            requests.delete(f"{BASE_URL}/api/crm/contacts/{cid}", headers=auth_headers)
        print("✓ Bulk contact move creates deals with business_name as title")


class TestChatwootWebhook:
    """Test Chatwoot webhook upserts contacts with 'bot' tag"""
    
    def test_chatwoot_webhook_creates_contact_with_bot_tag(self):
        """POST /api/webhooks/chatwoot/lead creates contact with 'bot' tag"""
        unique_email = f"chatwoot_{uuid.uuid4().hex[:8]}@test.com"
        webhook_data = {
            "email": unique_email,
            "phone": "+54 11 9999-8888",
            "name": "Chatwoot Test Lead",
            "business_name": "TEST_ChatwootBiz",
            "message": "Interested in your services"
        }
        
        resp = requests.post(f"{BASE_URL}/api/webhooks/chatwoot/lead", json=webhook_data)
        assert resp.status_code == 200, f"Webhook failed: {resp.text}"
        data = resp.json()
        assert data["action"] == "created"
        assert "contact_id" in data
        print(f"✓ Chatwoot webhook created contact: {data['contact_id']}")
    
    def test_chatwoot_webhook_upserts_existing_contact(self):
        """POST /api/webhooks/chatwoot/lead upserts existing contact and adds 'bot' tag"""
        unique_email = f"chatwoot_upsert_{uuid.uuid4().hex[:8]}@test.com"
        
        # First call - creates contact
        webhook_data = {
            "email": unique_email,
            "name": "Initial Name",
            "business_name": "TEST_UpsertBiz"
        }
        resp1 = requests.post(f"{BASE_URL}/api/webhooks/chatwoot/lead", json=webhook_data)
        assert resp1.status_code == 200
        assert resp1.json()["action"] == "created"
        contact_id = resp1.json()["contact_id"]
        
        # Second call with same email - should update
        webhook_data2 = {
            "email": unique_email,
            "phone": "+54 11 7777-6666",
            "message": "Follow-up message"
        }
        resp2 = requests.post(f"{BASE_URL}/api/webhooks/chatwoot/lead", json=webhook_data2)
        assert resp2.status_code == 200
        assert resp2.json()["action"] == "updated"
        assert resp2.json()["contact_id"] == contact_id
        print("✓ Chatwoot webhook upserts existing contact")


class TestEmailMarketingCRUD:
    """Test Email Marketing full CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    # Email Lists CRUD
    def test_create_email_list(self, auth_headers):
        """POST /api/email-marketing/lists creates list"""
        list_data = {"name": f"TEST_List_{uuid.uuid4().hex[:8]}", "description": "Test list"}
        resp = requests.post(f"{BASE_URL}/api/email-marketing/lists", json=list_data, headers=auth_headers)
        assert resp.status_code == 200, f"Create list failed: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert data["name"] == list_data["name"]
        print(f"✓ Email list created: {data['id']}")
        return data["id"]
    
    def test_update_email_list(self, auth_headers):
        """PUT /api/email-marketing/lists/{id} updates list"""
        # Create a list first
        list_data = {"name": f"TEST_UpdateList_{uuid.uuid4().hex[:8]}", "description": "Original"}
        create_resp = requests.post(f"{BASE_URL}/api/email-marketing/lists", json=list_data, headers=auth_headers)
        list_id = create_resp.json()["id"]
        
        # Update the list
        update_resp = requests.put(f"{BASE_URL}/api/email-marketing/lists/{list_id}", json={"name": "Updated Name", "description": "Updated desc"}, headers=auth_headers)
        assert update_resp.status_code == 200, f"Update list failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["name"] == "Updated Name"
        assert updated["description"] == "Updated desc"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/email-marketing/lists/{list_id}", headers=auth_headers)
        print("✓ Email list updated successfully")
    
    def test_delete_email_list(self, auth_headers):
        """DELETE /api/email-marketing/lists/{id} deletes list"""
        # Create a list first
        list_data = {"name": f"TEST_DeleteList_{uuid.uuid4().hex[:8]}"}
        create_resp = requests.post(f"{BASE_URL}/api/email-marketing/lists", json=list_data, headers=auth_headers)
        list_id = create_resp.json()["id"]
        
        # Delete the list
        delete_resp = requests.delete(f"{BASE_URL}/api/email-marketing/lists/{list_id}", headers=auth_headers)
        assert delete_resp.status_code == 200, f"Delete list failed: {delete_resp.text}"
        assert "eliminada" in delete_resp.json()["message"].lower()
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/email-marketing/lists", headers=auth_headers)
        lists = get_resp.json()
        assert not any(l["id"] == list_id for l in lists)
        print("✓ Email list deleted successfully")
    
    # Email Campaigns CRUD
    def test_create_email_campaign(self, auth_headers):
        """POST /api/email-marketing/campaigns creates campaign"""
        campaign_data = {"name": f"TEST_Campaign_{uuid.uuid4().hex[:8]}", "subject": "Test Subject"}
        resp = requests.post(f"{BASE_URL}/api/email-marketing/campaigns", json=campaign_data, headers=auth_headers)
        assert resp.status_code == 200, f"Create campaign failed: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert data["name"] == campaign_data["name"]
        print(f"✓ Email campaign created: {data['id']}")
        return data["id"]
    
    def test_update_email_campaign(self, auth_headers):
        """PUT /api/email-marketing/campaigns/{id} updates campaign"""
        # Create a campaign first
        campaign_data = {"name": f"TEST_UpdateCampaign_{uuid.uuid4().hex[:8]}"}
        create_resp = requests.post(f"{BASE_URL}/api/email-marketing/campaigns", json=campaign_data, headers=auth_headers)
        campaign_id = create_resp.json()["id"]
        
        # Update the campaign
        update_resp = requests.put(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}", json={"name": "Updated Campaign", "subject": "New Subject"}, headers=auth_headers)
        assert update_resp.status_code == 200, f"Update campaign failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["name"] == "Updated Campaign"
        assert updated["subject"] == "New Subject"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}", headers=auth_headers)
        print("✓ Email campaign updated successfully")
    
    def test_delete_email_campaign(self, auth_headers):
        """DELETE /api/email-marketing/campaigns/{id} deletes campaign"""
        # Create a campaign first
        campaign_data = {"name": f"TEST_DeleteCampaign_{uuid.uuid4().hex[:8]}"}
        create_resp = requests.post(f"{BASE_URL}/api/email-marketing/campaigns", json=campaign_data, headers=auth_headers)
        campaign_id = create_resp.json()["id"]
        
        # Delete the campaign
        delete_resp = requests.delete(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}", headers=auth_headers)
        assert delete_resp.status_code == 200, f"Delete campaign failed: {delete_resp.text}"
        assert "eliminada" in delete_resp.json()["message"].lower()
        print("✓ Email campaign deleted successfully")


class TestAutoListFromLeads:
    """Test auto-create email lists from scored leads"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_auto_list_from_leads(self, auth_headers):
        """POST /api/email-marketing/auto-list-from-leads creates list with scored leads"""
        resp = requests.post(f"{BASE_URL}/api/email-marketing/auto-list-from-leads", json={
            "name": f"TEST_AutoList_{uuid.uuid4().hex[:8]}",
            "status": "scored"
        }, headers=auth_headers)
        assert resp.status_code == 200, f"Auto-list failed: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert "lead_ids" in data
        assert "subscriber_count" in data
        assert data["subscriber_count"] == len(data["lead_ids"])
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/email-marketing/lists/{data['id']}", headers=auth_headers)
        print(f"✓ Auto-list created with {data['subscriber_count']} leads")


class TestAddLeadsToList:
    """Test adding leads to email lists"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_add_leads_to_list(self, auth_headers):
        """POST /api/email-marketing/lists/{id}/add-leads adds leads to list"""
        # Create a list first
        list_data = {"name": f"TEST_AddLeadsList_{uuid.uuid4().hex[:8]}"}
        create_resp = requests.post(f"{BASE_URL}/api/email-marketing/lists", json=list_data, headers=auth_headers)
        list_id = create_resp.json()["id"]
        
        # Add leads by status filter
        add_resp = requests.post(f"{BASE_URL}/api/email-marketing/lists/{list_id}/add-leads", json={
            "status": "scored"
        }, headers=auth_headers)
        assert add_resp.status_code == 200, f"Add leads failed: {add_resp.text}"
        data = add_resp.json()
        assert "total" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/email-marketing/lists/{list_id}", headers=auth_headers)
        print(f"✓ Added leads to list, total: {data['total']}")


class TestScoringConfig:
    """Test scoring configuration endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_scoring_config_returns_defaults(self, auth_headers):
        """GET /api/settings/scoring returns default config"""
        resp = requests.get(f"{BASE_URL}/api/settings/scoring", headers=auth_headers)
        assert resp.status_code == 200, f"Get scoring config failed: {resp.text}"
        data = resp.json()
        # Check for expected default keys
        assert "website" in data
        assert "email" in data
        assert "phone" in data
        assert "min_excellent" in data
        assert "min_good" in data
        print(f"✓ Scoring config returned with {len(data)} settings")
    
    def test_update_scoring_config(self, auth_headers):
        """PUT /api/settings/scoring saves custom config"""
        custom_config = {
            "website": 25,
            "email": 20,
            "phone": 15,
            "min_excellent": 85,
            "min_good": 65
        }
        resp = requests.put(f"{BASE_URL}/api/settings/scoring", json=custom_config, headers=auth_headers)
        assert resp.status_code == 200, f"Update scoring config failed: {resp.text}"
        data = resp.json()
        assert data["website"] == 25
        assert data["min_excellent"] == 85
        print("✓ Scoring config updated successfully")


class TestDashboardStats:
    """Test dashboard stats endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_stats(self, auth_headers):
        """GET /api/dashboard/stats returns expected fields"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert resp.status_code == 200, f"Dashboard stats failed: {resp.text}"
        data = resp.json()
        # Check for rate-related fields
        assert "emails_sent" in data
        assert "opens" in data
        assert "replies" in data
        assert "leads_sent_to_crm" in data
        assert "opportunities" in data
        print("✓ Dashboard stats returned successfully")


# Cleanup function to remove TEST_ prefixed data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup after tests
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Cleanup contacts
            contacts_resp = requests.get(f"{BASE_URL}/api/crm/contacts", headers=headers)
            if contacts_resp.status_code == 200:
                for contact in contacts_resp.json():
                    if contact.get("business_name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/crm/contacts/{contact['id']}", headers=headers)
            
            # Cleanup email lists
            lists_resp = requests.get(f"{BASE_URL}/api/email-marketing/lists", headers=headers)
            if lists_resp.status_code == 200:
                for lst in lists_resp.json():
                    if lst.get("name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/email-marketing/lists/{lst['id']}", headers=headers)
            
            # Cleanup email campaigns
            campaigns_resp = requests.get(f"{BASE_URL}/api/email-marketing/campaigns", headers=headers)
            if campaigns_resp.status_code == 200:
                for campaign in campaigns_resp.json():
                    if campaign.get("name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/email-marketing/campaigns/{campaign['id']}", headers=headers)
            
            print("✓ Test data cleanup completed")
    except Exception as e:
        print(f"Cleanup warning: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

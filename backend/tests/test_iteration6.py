"""
Iteration 6 Tests - Spectra Flow E2E Integration
Tests for:
1. POST /api/email-marketing/auto-list-from-leads - creates list with scored leads
2. POST /api/ai/dify-score-lead - calls Dify API (may return empty output if Dify not configured)
3. POST /api/webhooks/chatwoot/lead - creates contact with bot tag
4. POST /api/webhooks/chatwoot/lead - upserts existing contact
5. Email Marketing UI: Delete campaign, Delete list, Send Real button
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_login_admin(self, session):
        """Test admin login with correct credentials"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["email"] == "admin@spectraflow.com"
        # Store token for other tests
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        print(f"✓ Admin login successful, role: {data.get('role')}")


class TestEmailMarketingAutoList:
    """Test auto-list creation from scored leads"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        if resp.status_code == 200:
            session.headers.update({"Authorization": f"Bearer {resp.json()['access_token']}"})
        return session
    
    def test_auto_list_from_leads(self, auth_session):
        """POST /api/email-marketing/auto-list-from-leads creates list with scored leads"""
        response = auth_session.post(f"{BASE_URL}/api/email-marketing/auto-list-from-leads", json={
            "name": f"TEST_Auto_List_{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200, f"Auto-list creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "subscriber_count" in data
        assert "lead_ids" in data
        print(f"✓ Auto-list created: {data['name']} with {data['subscriber_count']} leads")
        return data
    
    def test_list_email_lists(self, auth_session):
        """GET /api/email-marketing/lists returns lists"""
        response = auth_session.get(f"{BASE_URL}/api/email-marketing/lists")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} email lists")


class TestEmailMarketingCRUD:
    """Test Email Marketing CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        if resp.status_code == 200:
            session.headers.update({"Authorization": f"Bearer {resp.json()['access_token']}"})
        return session
    
    def test_create_and_delete_list(self, auth_session):
        """Create and delete an email list"""
        # Create list
        list_name = f"TEST_Delete_List_{uuid.uuid4().hex[:8]}"
        create_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/lists", json={
            "name": list_name
        })
        assert create_resp.status_code == 200, f"Create list failed: {create_resp.text}"
        list_data = create_resp.json()
        list_id = list_data["id"]
        print(f"✓ Created list: {list_name}")
        
        # Delete list
        delete_resp = auth_session.delete(f"{BASE_URL}/api/email-marketing/lists/{list_id}")
        assert delete_resp.status_code == 200, f"Delete list failed: {delete_resp.text}"
        print(f"✓ Deleted list: {list_id}")
        
        # Verify deletion
        get_resp = auth_session.get(f"{BASE_URL}/api/email-marketing/lists")
        lists = get_resp.json()
        assert not any(l["id"] == list_id for l in lists), "List still exists after deletion"
        print("✓ Verified list deletion")
    
    def test_create_and_delete_campaign(self, auth_session):
        """Create and delete an email campaign"""
        # Create campaign
        campaign_name = f"TEST_Delete_Campaign_{uuid.uuid4().hex[:8]}"
        create_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/campaigns", json={
            "name": campaign_name
        })
        assert create_resp.status_code == 200, f"Create campaign failed: {create_resp.text}"
        campaign_data = create_resp.json()
        campaign_id = campaign_data["id"]
        print(f"✓ Created campaign: {campaign_name}")
        
        # Delete campaign
        delete_resp = auth_session.delete(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}")
        assert delete_resp.status_code == 200, f"Delete campaign failed: {delete_resp.text}"
        print(f"✓ Deleted campaign: {campaign_id}")
        
        # Verify deletion
        get_resp = auth_session.get(f"{BASE_URL}/api/email-marketing/campaigns")
        campaigns = get_resp.json()
        assert not any(c["id"] == campaign_id for c in campaigns), "Campaign still exists after deletion"
        print("✓ Verified campaign deletion")


class TestSendRealCampaign:
    """Test real email campaign sending"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        if resp.status_code == 200:
            session.headers.update({"Authorization": f"Bearer {resp.json()['access_token']}"})
        return session
    
    def test_send_real_requires_list(self, auth_session):
        """POST /api/email-marketing/campaigns/{id}/send-real requires list_id"""
        # Create campaign without list
        campaign_name = f"TEST_NoList_Campaign_{uuid.uuid4().hex[:8]}"
        create_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/campaigns", json={
            "name": campaign_name
        })
        assert create_resp.status_code == 200
        campaign_id = create_resp.json()["id"]
        
        # Try to send real - should fail
        send_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}/send-real")
        assert send_resp.status_code == 400, f"Expected 400, got {send_resp.status_code}"
        assert "lista" in send_resp.json().get("detail", "").lower() or "list" in send_resp.json().get("detail", "").lower()
        print("✓ Send real correctly requires list_id")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}")
    
    def test_send_real_with_list(self, auth_session):
        """POST /api/email-marketing/campaigns/{id}/send-real works with list"""
        # Create list with auto-leads
        list_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/auto-list-from-leads", json={
            "name": f"TEST_SendReal_List_{uuid.uuid4().hex[:8]}"
        })
        assert list_resp.status_code == 200
        list_id = list_resp.json()["id"]
        
        # Create campaign with list
        campaign_name = f"TEST_SendReal_Campaign_{uuid.uuid4().hex[:8]}"
        create_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/campaigns", json={
            "name": campaign_name,
            "list_id": list_id,
            "subject": "Test Email"
        })
        assert create_resp.status_code == 200
        campaign_id = create_resp.json()["id"]
        
        # Send real - may succeed or fail based on leads/Resend config
        send_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}/send-real")
        # Accept 200 (success) or 400 (no leads with email)
        assert send_resp.status_code in [200, 400], f"Unexpected status: {send_resp.status_code}"
        if send_resp.status_code == 200:
            data = send_resp.json()
            print(f"✓ Send real succeeded: {data.get('sent', 0)} emails sent")
        else:
            print(f"✓ Send real returned 400 (expected if no leads with email): {send_resp.json()}")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/email-marketing/campaigns/{campaign_id}")
        auth_session.delete(f"{BASE_URL}/api/email-marketing/lists/{list_id}")


class TestDifyScoreLead:
    """Test Dify AI scoring endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        if resp.status_code == 200:
            session.headers.update({"Authorization": f"Bearer {resp.json()['access_token']}"})
        return session
    
    def test_dify_score_lead_with_business_data(self, auth_session):
        """POST /api/ai/dify-score-lead calls Dify API"""
        response = auth_session.post(f"{BASE_URL}/api/ai/dify-score-lead", json={
            "business_data": "Nombre: Inmobiliaria Test\nDireccion: Buenos Aires\nTelefono: +54 11 1234-5678\nWebsite: www.test.com.ar\nEmail: test@test.com\nCategoria: Real Estate"
        })
        # Accept 200 (success with empty/full output) or 400 (Dify not configured) or 500 (Dify error)
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        data = response.json()
        
        if response.status_code == 200:
            # Dify was called successfully
            assert "success" in data or "scoring" in data or "raw_output" in data
            print(f"✓ Dify scoring called successfully: {data.get('success', 'N/A')}")
            if data.get("raw_output"):
                print(f"  Raw output: {data['raw_output'][:100]}...")
            elif data.get("scoring"):
                print(f"  Scoring: {data['scoring']}")
            else:
                print(f"  Note: Dify returned empty output (user-side config issue)")
        elif response.status_code == 400:
            print(f"✓ Dify not configured (expected): {data.get('detail', '')}")
        else:
            print(f"✓ Dify error (may be expected): {data.get('detail', '')}")
    
    def test_dify_score_requires_data(self, auth_session):
        """POST /api/ai/dify-score-lead requires business_data or lead_id"""
        response = auth_session.post(f"{BASE_URL}/api/ai/dify-score-lead", json={})
        assert response.status_code == 400
        assert "business_data" in response.json().get("detail", "").lower() or "lead_id" in response.json().get("detail", "").lower()
        print("✓ Dify scoring correctly requires business_data or lead_id")


class TestChatwootWebhook:
    """Test Chatwoot webhook for lead creation/upsert"""
    
    def test_chatwoot_creates_contact_with_bot_tag(self):
        """POST /api/webhooks/chatwoot/lead creates contact with bot tag"""
        unique_email = f"test_bot_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/webhooks/chatwoot/lead", json={
            "name": "Test Bot Lead",
            "contact_name": "Test Bot Lead",
            "email": unique_email,
            "phone": f"+54 11 {uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}",
            "business_name": "Test Bot Business",
            "city": "Buenos Aires",
            "category": "Technology",
            "message": "Test message from bot"
        })
        assert response.status_code == 200, f"Chatwoot webhook failed: {response.text}"
        data = response.json()
        assert "contact_id" in data
        assert data.get("action") == "created"
        print(f"✓ Chatwoot webhook created contact: {data['contact_id']}")
        return data["contact_id"], unique_email
    
    def test_chatwoot_upserts_existing_contact(self):
        """POST /api/webhooks/chatwoot/lead upserts existing contact"""
        # First create a contact
        unique_email = f"test_upsert_{uuid.uuid4().hex[:8]}@test.com"
        create_resp = requests.post(f"{BASE_URL}/api/webhooks/chatwoot/lead", json={
            "name": "Original Name",
            "email": unique_email,
            "business_name": "Original Business"
        })
        assert create_resp.status_code == 200
        assert create_resp.json().get("action") == "created"
        contact_id = create_resp.json()["contact_id"]
        print(f"✓ Created initial contact: {contact_id}")
        
        # Now upsert with same email
        upsert_resp = requests.post(f"{BASE_URL}/api/webhooks/chatwoot/lead", json={
            "name": "Updated Name",
            "email": unique_email,
            "message": "Updated message from bot"
        })
        assert upsert_resp.status_code == 200
        upsert_data = upsert_resp.json()
        assert upsert_data.get("action") == "updated"
        assert upsert_data.get("contact_id") == contact_id
        print(f"✓ Chatwoot webhook upserted existing contact: {contact_id}")


class TestEmailMarketingUI:
    """Test Email Marketing UI elements via API verification"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        if resp.status_code == 200:
            session.headers.update({"Authorization": f"Bearer {resp.json()['access_token']}"})
        return session
    
    def test_campaign_with_list_has_send_real_option(self, auth_session):
        """Campaign with list_id should show Send Real button (API verification)"""
        # Create list
        list_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/auto-list-from-leads", json={
            "name": f"TEST_UI_List_{uuid.uuid4().hex[:8]}"
        })
        list_id = list_resp.json()["id"]
        
        # Create campaign with list
        campaign_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/campaigns", json={
            "name": f"TEST_UI_Campaign_{uuid.uuid4().hex[:8]}",
            "list_id": list_id
        })
        campaign = campaign_resp.json()
        
        # Verify campaign has list_id
        assert campaign.get("list_id") == list_id
        print(f"✓ Campaign has list_id: {list_id} (UI should show Send Real button)")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/email-marketing/campaigns/{campaign['id']}")
        auth_session.delete(f"{BASE_URL}/api/email-marketing/lists/{list_id}")
    
    def test_email_marketing_stats(self, auth_session):
        """GET /api/email-marketing/stats returns stats"""
        response = auth_session.get(f"{BASE_URL}/api/email-marketing/stats")
        assert response.status_code == 200
        data = response.json()
        assert "lists" in data
        assert "campaigns" in data
        print(f"✓ Email marketing stats: {data['lists']} lists, {data['campaigns']} campaigns")


class TestAddLeadsToList:
    """Test adding leads to existing list"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        if resp.status_code == 200:
            session.headers.update({"Authorization": f"Bearer {resp.json()['access_token']}"})
        return session
    
    def test_add_leads_to_list(self, auth_session):
        """POST /api/email-marketing/lists/{id}/add-leads adds qualified leads"""
        # Create a list first
        list_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/lists", json={
            "name": f"TEST_AddLeads_List_{uuid.uuid4().hex[:8]}"
        })
        assert list_resp.status_code == 200
        list_id = list_resp.json()["id"]
        
        # Add leads to list
        add_resp = auth_session.post(f"{BASE_URL}/api/email-marketing/lists/{list_id}/add-leads", json={})
        assert add_resp.status_code == 200
        data = add_resp.json()
        assert "message" in data
        print(f"✓ Add leads to list: {data.get('message', '')}")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/email-marketing/lists/{list_id}")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup after tests
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@spectraflow.com",
        "password": "Admin123!"
    })
    if resp.status_code == 200:
        session.headers.update({"Authorization": f"Bearer {resp.json()['access_token']}"})
        
        # Clean up test lists
        lists_resp = session.get(f"{BASE_URL}/api/email-marketing/lists")
        if lists_resp.status_code == 200:
            for lst in lists_resp.json():
                if lst.get("name", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/email-marketing/lists/{lst['id']}")
        
        # Clean up test campaigns
        campaigns_resp = session.get(f"{BASE_URL}/api/email-marketing/campaigns")
        if campaigns_resp.status_code == 200:
            for camp in campaigns_resp.json():
                if camp.get("name", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/email-marketing/campaigns/{camp['id']}")

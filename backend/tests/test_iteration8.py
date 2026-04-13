"""
Iteration 8 Backend Tests - Spectra Flow
Testing:
1. Sidebar 4 sections (via /api/tenant/modules)
2. Super Admin tenant management (GET/POST/PUT /api/admin/tenants)
3. CRM deals duplication fix (POST /api/crm/deals should update existing)
4. Chatwoot webhook creates leads with BOT tag (/api/webhooks/chatwoot/lead)
5. Leads stats endpoint (/api/leads/stats)
6. Analytics date filters (/api/analytics?period=month)
7. CRM stats date filters (/api/crm/stats?period=quarter)
8. Perdidas metric in CRM stats
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return session with auth cookies"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("role") == "super_admin", f"Expected super_admin role, got {data.get('role')}"
        # Store token for header auth
        session.headers.update({"Authorization": f"Bearer {data.get('access_token')}"})
        return session
    
    def test_login_super_admin(self, auth_session):
        """Test login with admin@spectraflow.com / Admin123!"""
        response = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@spectraflow.com"
        assert data["role"] == "super_admin"
        print(f"✓ Login successful: {data['email']} ({data['role']})")


class TestTenantModules:
    """Module toggle tests for sidebar visibility"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        session.headers.update({"Authorization": f"Bearer {response.json().get('access_token')}"})
        return session
    
    def test_get_tenant_modules(self, auth_session):
        """GET /api/tenant/modules returns modules including 'leads' key"""
        response = auth_session.get(f"{BASE_URL}/api/tenant/modules")
        assert response.status_code == 200
        data = response.json()
        # Should have all 4 module keys
        assert "prospeccion" in data, "Missing 'prospeccion' module"
        assert "leads" in data, "Missing 'leads' module"
        assert "crm" in data, "Missing 'crm' module"
        assert "email_marketing" in data, "Missing 'email_marketing' module"
        print(f"✓ Tenant modules: {data}")
    
    def test_update_tenant_modules(self, auth_session):
        """PUT /api/tenant/modules updates module toggles"""
        # First get current modules
        get_response = auth_session.get(f"{BASE_URL}/api/tenant/modules")
        original_modules = get_response.json()
        
        # Update modules
        new_modules = {
            "prospeccion": True,
            "leads": True,
            "crm": True,
            "email_marketing": False  # Toggle one off
        }
        response = auth_session.put(f"{BASE_URL}/api/tenant/modules", json=new_modules)
        assert response.status_code == 200
        data = response.json()
        assert data["email_marketing"] == False, "Module toggle didn't update"
        
        # Restore original
        auth_session.put(f"{BASE_URL}/api/tenant/modules", json=original_modules)
        print(f"✓ Module toggle update works")


class TestSuperAdminTenants:
    """Super Admin tenant management tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        session.headers.update({"Authorization": f"Bearer {response.json().get('access_token')}"})
        return session
    
    def test_list_tenants(self, auth_session):
        """GET /api/admin/tenants returns list with user_count, lead_count, contact_count"""
        response = auth_session.get(f"{BASE_URL}/api/admin/tenants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of tenants"
        if len(data) > 0:
            tenant = data[0]
            assert "user_count" in tenant, "Missing user_count"
            assert "lead_count" in tenant, "Missing lead_count"
            assert "contact_count" in tenant, "Missing contact_count"
            assert "name" in tenant, "Missing name"
            assert "id" in tenant, "Missing id"
            print(f"✓ Tenants list: {len(data)} tenants, first has user_count={tenant['user_count']}, lead_count={tenant['lead_count']}")
    
    def test_create_tenant(self, auth_session):
        """POST /api/admin/tenants creates new tenant with admin user"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Tenant_{unique_id}",
            "admin_email": f"test_{unique_id}@example.com",
            "admin_password": "TestPass123!",
            "admin_name": "Test Admin",
            "plan": "professional",
            "price": 99.99,
            "modules": {"prospeccion": True, "leads": True, "crm": True, "email_marketing": False}
        }
        response = auth_session.post(f"{BASE_URL}/api/admin/tenants", json=payload)
        assert response.status_code == 200, f"Create tenant failed: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["plan"] == "professional"
        assert data["price"] == 99.99
        assert data["modules"]["email_marketing"] == False
        assert "id" in data
        print(f"✓ Created tenant: {data['name']} (id={data['id'][:8]}...)")
        
        # Store tenant_id for cleanup/update test
        return data["id"]
    
    def test_update_tenant(self, auth_session):
        """PUT /api/admin/tenants/{id} updates tenant plan, price, modules, active status"""
        # First create a tenant to update
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "name": f"TEST_Update_{unique_id}",
            "admin_email": f"update_{unique_id}@example.com",
            "admin_password": "TestPass123!",
            "plan": "starter",
            "price": 0
        }
        create_response = auth_session.post(f"{BASE_URL}/api/admin/tenants", json=create_payload)
        assert create_response.status_code == 200
        tenant_id = create_response.json()["id"]
        
        # Update the tenant
        update_payload = {
            "plan": "enterprise",
            "price": 299.99,
            "modules": {"prospeccion": True, "leads": True, "crm": True, "email_marketing": True},
            "active": False
        }
        response = auth_session.put(f"{BASE_URL}/api/admin/tenants/{tenant_id}", json=update_payload)
        assert response.status_code == 200, f"Update tenant failed: {response.text}"
        data = response.json()
        assert data["plan"] == "enterprise"
        assert data["price"] == 299.99
        assert data["active"] == False
        print(f"✓ Updated tenant: plan={data['plan']}, price={data['price']}, active={data['active']}")


class TestCRMDealsDeduplication:
    """CRM deals duplication bug fix tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        session.headers.update({"Authorization": f"Bearer {response.json().get('access_token')}"})
        return session
    
    def test_crm_deal_update_not_duplicate(self, auth_session):
        """POST /api/crm/deals with existing contact_id should UPDATE existing deal, not create duplicate"""
        # First create a CRM contact
        unique_id = str(uuid.uuid4())[:8]
        contact_payload = {
            "business_name": f"TEST_DealDupe_{unique_id}",
            "email": f"dealdupe_{unique_id}@test.com",
            "phone": "+54 11 1234-5678"
        }
        contact_response = auth_session.post(f"{BASE_URL}/api/crm/contacts", json=contact_payload)
        assert contact_response.status_code == 200
        contact_id = contact_response.json()["id"]
        
        # Create first deal
        deal1_payload = {
            "contact_id": contact_id,
            "title": "First Deal",
            "value": 1000,
            "stage": "nuevo"
        }
        deal1_response = auth_session.post(f"{BASE_URL}/api/crm/deals", json=deal1_payload)
        assert deal1_response.status_code == 200
        deal1_id = deal1_response.json()["id"]
        
        # Try to create second deal for same contact - should UPDATE, not create new
        deal2_payload = {
            "contact_id": contact_id,
            "title": "Updated Deal Title",
            "value": 2000,
            "stage": "propuesta"
        }
        deal2_response = auth_session.post(f"{BASE_URL}/api/crm/deals", json=deal2_payload)
        assert deal2_response.status_code == 200
        deal2_data = deal2_response.json()
        
        # Should return same deal ID (updated), not a new one
        assert deal2_data["id"] == deal1_id, f"Expected same deal ID {deal1_id}, got {deal2_data['id']} - DUPLICATE BUG!"
        assert deal2_data["title"] == "Updated Deal Title"
        assert deal2_data["value"] == 2000
        assert deal2_data["stage"] == "propuesta"
        print(f"✓ CRM deal deduplication works: same deal ID returned after update")


class TestChatwootWebhook:
    """Chatwoot webhook creates leads with BOT tag"""
    
    def test_chatwoot_lead_webhook(self):
        """POST /api/webhooks/chatwoot/lead creates lead in leads collection with tags=['bot'] and source='bot'"""
        # Get tenant_id first
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        session.headers.update({"Authorization": f"Bearer {login_response.json().get('access_token')}"})
        
        # Get user to find tenant_id
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        tenant_id = me_response.json().get("tenant_id")
        
        unique_id = str(uuid.uuid4())[:8]
        webhook_payload = {
            "tenant_id": tenant_id,
            "email": f"chatwoot_{unique_id}@bot.test",
            "phone": "+54 11 9999-8888",
            "name": f"Bot Lead {unique_id}",
            "business_name": f"TEST_ChatwootLead_{unique_id}",
            "message": "Interested in your services",
            "category": "Technology"
        }
        
        # Webhook doesn't require auth
        response = requests.post(f"{BASE_URL}/api/webhooks/chatwoot/lead", json=webhook_payload)
        assert response.status_code == 200, f"Chatwoot webhook failed: {response.text}"
        data = response.json()
        assert data["action"] == "created", f"Expected 'created', got {data['action']}"
        assert "lead_id" in data
        
        # Verify lead was created with correct tags and source
        lead_response = session.get(f"{BASE_URL}/api/leads/{data['lead_id']}")
        assert lead_response.status_code == 200
        lead = lead_response.json()
        assert lead["source"] == "bot", f"Expected source='bot', got {lead.get('source')}"
        assert "bot" in lead.get("tags", []), f"Expected 'bot' in tags, got {lead.get('tags')}"
        print(f"✓ Chatwoot webhook created lead with source='bot' and tags=['bot']")


class TestLeadsStats:
    """Leads stats endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        session.headers.update({"Authorization": f"Bearer {response.json().get('access_token')}"})
        return session
    
    def test_leads_stats(self, auth_session):
        """GET /api/leads/stats returns stats by status (scored, rejected, approved, contacted)"""
        response = auth_session.get(f"{BASE_URL}/api/leads/stats")
        assert response.status_code == 200
        data = response.json()
        # Should have all status counts
        assert "total" in data, "Missing 'total'"
        assert "scored" in data, "Missing 'scored'"
        assert "rejected" in data, "Missing 'rejected'"
        assert "approved" in data, "Missing 'approved'"
        assert "contacted" in data, "Missing 'contacted'"
        assert "sent_to_crm" in data, "Missing 'sent_to_crm'"
        print(f"✓ Leads stats: total={data['total']}, scored={data['scored']}, approved={data['approved']}, rejected={data['rejected']}")


class TestAnalyticsDateFilters:
    """Analytics date filter tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        session.headers.update({"Authorization": f"Bearer {response.json().get('access_token')}"})
        return session
    
    def test_analytics_period_filter(self, auth_session):
        """GET /api/analytics?period=month filters leads by date"""
        # Test without filter
        response_all = auth_session.get(f"{BASE_URL}/api/analytics")
        assert response_all.status_code == 200
        data_all = response_all.json()
        
        # Test with month filter
        response_month = auth_session.get(f"{BASE_URL}/api/analytics?period=month")
        assert response_month.status_code == 200
        data_month = response_month.json()
        
        # Both should have same structure
        assert "total_leads" in data_month
        assert "qualified_leads" in data_month
        assert "approved_leads" in data_month
        assert "rejected_leads" in data_month
        print(f"✓ Analytics period filter works: all={data_all['total_leads']}, month={data_month['total_leads']}")
    
    def test_analytics_week_filter(self, auth_session):
        """GET /api/analytics?period=week filters leads by week"""
        response = auth_session.get(f"{BASE_URL}/api/analytics?period=week")
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        print(f"✓ Analytics week filter: total_leads={data['total_leads']}")
    
    def test_analytics_quarter_filter(self, auth_session):
        """GET /api/analytics?period=quarter filters leads by quarter"""
        response = auth_session.get(f"{BASE_URL}/api/analytics?period=quarter")
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        print(f"✓ Analytics quarter filter: total_leads={data['total_leads']}")


class TestCRMStatsDateFilters:
    """CRM stats date filter tests including Perdidas metric"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@spectraflow.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        session.headers.update({"Authorization": f"Bearer {response.json().get('access_token')}"})
        return session
    
    def test_crm_stats_period_filter(self, auth_session):
        """GET /api/crm/stats?period=quarter filters CRM data by date"""
        # Test without filter
        response_all = auth_session.get(f"{BASE_URL}/api/crm/stats")
        assert response_all.status_code == 200
        data_all = response_all.json()
        
        # Test with quarter filter
        response_quarter = auth_session.get(f"{BASE_URL}/api/crm/stats?period=quarter")
        assert response_quarter.status_code == 200
        data_quarter = response_quarter.json()
        
        # Both should have same structure
        assert "total_contacts" in data_quarter
        assert "total_deals" in data_quarter
        assert "stage_counts" in data_quarter
        assert "won_value" in data_quarter
        print(f"✓ CRM stats period filter works: all contacts={data_all['total_contacts']}, quarter contacts={data_quarter['total_contacts']}")
    
    def test_crm_stats_perdidas_metric(self, auth_session):
        """GET /api/crm/stats returns Perdidas (lost) metric"""
        response = auth_session.get(f"{BASE_URL}/api/crm/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check for perdido stage count
        assert "stage_counts" in data
        assert "perdido" in data["stage_counts"], "Missing 'perdido' in stage_counts"
        
        # Check for lost_value
        assert "lost_value" in data, "Missing 'lost_value' metric"
        print(f"✓ CRM stats has Perdidas: stage_counts.perdido={data['stage_counts']['perdido']}, lost_value={data['lost_value']}")
    
    def test_crm_stats_all_stages(self, auth_session):
        """GET /api/crm/stats returns all pipeline stages"""
        response = auth_session.get(f"{BASE_URL}/api/crm/stats")
        assert response.status_code == 200
        data = response.json()
        
        expected_stages = ["nuevo", "contactado", "propuesta", "negociacion", "ganado", "perdido"]
        for stage in expected_stages:
            assert stage in data["stage_counts"], f"Missing stage '{stage}' in stage_counts"
        print(f"✓ CRM stats has all stages: {list(data['stage_counts'].keys())}")


class TestNonSuperAdminAccess:
    """Test that non-super_admin cannot access admin endpoints"""
    
    def test_operator_cannot_access_admin_tenants(self):
        """Operator role should get 403 on /api/admin/tenants"""
        session = requests.Session()
        # Login as demo operator
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@spectraflow.com",
            "password": "Demo123!"
        })
        if response.status_code != 200:
            pytest.skip("Demo operator account not available")
        
        session.headers.update({"Authorization": f"Bearer {response.json().get('access_token')}"})
        
        # Try to access admin endpoint
        admin_response = session.get(f"{BASE_URL}/api/admin/tenants")
        assert admin_response.status_code == 403, f"Expected 403, got {admin_response.status_code}"
        print(f"✓ Operator correctly denied access to admin endpoints (403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

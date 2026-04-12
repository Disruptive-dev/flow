#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Spectra Flow
Tests all endpoints with proper authentication and error handling
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SpectraFlowAPITester:
    def __init__(self, base_url: str = "https://spectra-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name} - {details}")
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> tuple[bool, Dict]:
        """Make API request with proper headers and error handling"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}
            
            if not success:
                print(f"   Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}
    
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test login with correct credentials
        success, data = self.make_request(
            'POST', '/auth/login',
            {"email": "admin@spectraflow.com", "password": "Admin123!"},
            auth_required=False
        )
        self.log_test("Admin Login", success)
        
        if success and 'access_token' in data:
            self.access_token = data['access_token']
            self.user_data = data
            print(f"   Logged in as: {data.get('name', 'Unknown')} ({data.get('role', 'Unknown')})")
        
        # Test /auth/me endpoint
        success, data = self.make_request('GET', '/auth/me')
        self.log_test("Get Current User", success)
        
        # Test login with wrong credentials
        success, data = self.make_request(
            'POST', '/auth/login',
            {"email": "admin@spectraflow.com", "password": "WrongPassword"},
            expected_status=401, auth_required=False
        )
        self.log_test("Invalid Login Rejection", success)
    
    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n📊 Testing Dashboard Endpoints...")
        
        success, data = self.make_request('GET', '/dashboard/stats')
        self.log_test("Dashboard Stats", success)
        
        if success:
            required_fields = ['jobs_this_month', 'total_leads', 'qualified_leads', 'emails_sent']
            has_required = all(field in data for field in required_fields)
            self.log_test("Dashboard Stats Structure", has_required, 
                         f"Missing fields: {[f for f in required_fields if f not in data]}")
    
    def test_prospect_jobs_endpoints(self):
        """Test prospect jobs endpoints"""
        print("\n🎯 Testing Prospect Jobs Endpoints...")
        
        # List jobs
        success, data = self.make_request('GET', '/prospect-jobs')
        self.log_test("List Prospect Jobs", success)
        
        # Create new job
        job_data = {
            "province": "Test Province",
            "city": "Test City", 
            "category": "Test Category",
            "quantity": 50
        }
        success, data = self.make_request('POST', '/prospect-jobs', job_data, 200)
        job_id = None
        if success and 'id' in data:
            job_id = data['id']
        self.log_test("Create Prospect Job", success)
        
        # Get specific job
        if job_id:
            success, data = self.make_request('GET', f'/prospect-jobs/{job_id}')
            self.log_test("Get Specific Job", success)
            
            # Start job processing
            success, data = self.make_request('POST', f'/prospect-jobs/{job_id}/start')
            self.log_test("Start Job Processing", success)
    
    def test_leads_endpoints(self):
        """Test leads endpoints"""
        print("\n👥 Testing Leads Endpoints...")
        
        # List leads
        success, data = self.make_request('GET', '/leads')
        self.log_test("List Leads", success)
        
        lead_id = None
        if success and 'leads' in data and data['leads']:
            lead_id = data['leads'][0]['id']
            
            # Get specific lead
            success, data = self.make_request('GET', f'/leads/{lead_id}')
            self.log_test("Get Specific Lead", success)
            
            # Update lead status
            success, data = self.make_request('PUT', f'/leads/{lead_id}/status', {"status": "approved"})
            self.log_test("Update Lead Status", success)
        
        # Test bulk actions
        if lead_id:
            success, data = self.make_request('POST', '/leads/bulk-action', {
                "lead_ids": [lead_id], 
                "action": "approve"
            })
            self.log_test("Bulk Lead Action", success)
    
    def test_campaigns_endpoints(self):
        """Test campaigns endpoints"""
        print("\n📧 Testing Campaigns Endpoints...")
        
        # List campaigns
        success, data = self.make_request('GET', '/campaigns')
        self.log_test("List Campaigns", success)
        
        # Create campaign
        campaign_data = {
            "name": "Test Campaign",
            "sender_profile_id": "",
            "template_id": "",
            "lead_ids": []
        }
        success, data = self.make_request('POST', '/campaigns', campaign_data, 200)
        campaign_id = None
        if success and 'id' in data:
            campaign_id = data['id']
        self.log_test("Create Campaign", success)
        
        # Get and update campaign
        if campaign_id:
            success, data = self.make_request('GET', f'/campaigns/{campaign_id}')
            self.log_test("Get Specific Campaign", success)
            
            success, data = self.make_request('PUT', f'/campaigns/{campaign_id}', {"status": "active"})
            self.log_test("Update Campaign", success)
    
    def test_templates_endpoints(self):
        """Test templates endpoints"""
        print("\n📝 Testing Templates Endpoints...")
        
        # List templates
        success, data = self.make_request('GET', '/templates')
        self.log_test("List Templates", success)
        
        # Create template
        template_data = {
            "name": "Test Template",
            "subject": "Test Subject",
            "html_body": "<p>Test body with {business_name}</p>",
            "variables": ["business_name"]
        }
        success, data = self.make_request('POST', '/templates', template_data, 200)
        template_id = None
        if success and 'id' in data:
            template_id = data['id']
        self.log_test("Create Template", success)
        
        # Update and delete template
        if template_id:
            success, data = self.make_request('PUT', f'/templates/{template_id}', {"name": "Updated Template"})
            self.log_test("Update Template", success)
            
            success, data = self.make_request('DELETE', f'/templates/{template_id}')
            self.log_test("Delete Template", success)
    
    def test_domains_endpoints(self):
        """Test domains endpoints"""
        print("\n🌐 Testing Domains Endpoints...")
        
        # List domains
        success, data = self.make_request('GET', '/domains')
        self.log_test("List Domains", success)
        
        # Create domain
        domain_data = {
            "domain": "test-domain.com",
            "sender_name": "Test Sender",
            "sender_email": "test@test-domain.com"
        }
        success, data = self.make_request('POST', '/domains', domain_data, 200)
        domain_id = None
        if success and 'id' in data:
            domain_id = data['id']
        self.log_test("Create Domain", success)
        
        # Update and verify domain
        if domain_id:
            success, data = self.make_request('PUT', f'/domains/{domain_id}', {"sender_name": "Updated Sender"})
            self.log_test("Update Domain", success)
            
            success, data = self.make_request('POST', f'/domains/{domain_id}/verify')
            self.log_test("Verify Domain", success)
    
    def test_crm_sync_endpoints(self):
        """Test CRM sync endpoints"""
        print("\n🔄 Testing CRM Sync Endpoints...")
        
        # List CRM sync logs
        success, data = self.make_request('GET', '/crm-sync/logs')
        self.log_test("List CRM Sync Logs", success)
        
        # Test CRM push (need lead IDs)
        leads_success, leads_data = self.make_request('GET', '/leads')
        if leads_success and 'leads' in leads_data and leads_data['leads']:
            lead_ids = [leads_data['leads'][0]['id']]
            success, data = self.make_request('POST', '/crm-sync/push', {
                "lead_ids": lead_ids,
                "assigned_owner": "Test Owner"
            })
            self.log_test("CRM Push", success)
    
    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n📈 Testing Analytics Endpoints...")
        
        success, data = self.make_request('GET', '/analytics')
        self.log_test("Analytics Data", success)
        
        if success:
            required_fields = ['jobs_created', 'total_leads', 'qualification_rate', 'approval_rate']
            has_required = all(field in data for field in required_fields)
            self.log_test("Analytics Structure", has_required)
    
    def test_settings_endpoints(self):
        """Test settings endpoints"""
        print("\n⚙️ Testing Settings Endpoints...")
        
        # Get settings
        success, data = self.make_request('GET', '/settings')
        self.log_test("Get Settings", success)
        
        # Update settings
        settings_data = {
            "company_name": "Updated Company",
            "primary_color": "#FF0000"
        }
        success, data = self.make_request('PUT', '/settings', settings_data)
        self.log_test("Update Settings", success)
        
        # Get integrations
        success, data = self.make_request('GET', '/settings/integrations')
        self.log_test("Get Integrations", success)
        
        # Update integration
        if success and data:
            integration_name = data[0]['name'] if data else 'n8n'
            success, data = self.make_request('PUT', f'/settings/integrations/{integration_name}', {
                "enabled": True,
                "base_url": "https://test.example.com"
            })
            self.log_test("Update Integration", success)
    
    def test_users_endpoints(self):
        """Test users endpoints (admin only)"""
        print("\n👤 Testing Users Endpoints...")
        
        # List users
        success, data = self.make_request('GET', '/users')
        self.log_test("List Users", success)
        
        # Create user
        user_data = {
            "email": f"test-{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "role": "operator"
        }
        success, data = self.make_request('POST', '/users', user_data, 200)
        self.log_test("Create User", success)
    
    def test_logout(self):
        """Test logout"""
        print("\n🚪 Testing Logout...")
        
        success, data = self.make_request('POST', '/auth/logout')
        self.log_test("Logout", success)
        
        # Verify token is invalid after logout
        success, data = self.make_request('GET', '/auth/me', expected_status=401)
        self.log_test("Token Invalid After Logout", success)
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Spectra Flow Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_auth_endpoints()
            if not self.access_token:
                print("❌ Cannot proceed without authentication")
                return False
            
            self.test_dashboard_endpoints()
            self.test_prospect_jobs_endpoints()
            self.test_leads_endpoints()
            self.test_campaigns_endpoints()
            self.test_templates_endpoints()
            self.test_domains_endpoints()
            self.test_crm_sync_endpoints()
            self.test_analytics_endpoints()
            self.test_settings_endpoints()
            self.test_users_endpoints()
            self.test_logout()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            return False
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for test in self.failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ success rate as passing

def main():
    """Main test execution"""
    tester = SpectraFlowAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
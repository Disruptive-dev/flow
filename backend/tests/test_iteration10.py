"""
Iteration 10 - Spectra Flow pre-launch testing
Covers:
- Forgot/reset password flow (JWT-based token)
- 15-day trial registration (modules: leads+crm, plan=trial, trial_ends_at ~15d)
- Reset demo data (super_admin required)
- CRM deals bulk-action (move / delete)
"""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://spectra-hub.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@spectraflow.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin123!")


# ==================== Fixtures ====================

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def admin_client(session, admin_token):
    session.headers.update({"Authorization": f"Bearer {admin_token}"})
    return session


# ==================== Forgot / Reset Password ====================

class TestForgotResetPassword:

    def test_forgot_password_valid_email(self, session):
        r = session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "message" in body
        assert "email" in body["message"].lower() or "recibir" in body["message"].lower()

    def test_forgot_password_invalid_email_returns_200(self, session):
        # Should not leak whether email exists
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": f"noexiste-{uuid.uuid4().hex[:6]}@example.com"})
        assert r.status_code == 200, r.text
        assert "message" in r.json()

    def test_reset_password_invalid_token(self, session):
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"token": "not-a-valid-jwt", "new_password": "NewPass123!"})
        assert r.status_code == 400

    def test_reset_password_valid_token_updates_password(self, session):
        # Create a temp test user via register, then reset via JWT
        email = f"trial-reset-{int(time.time())}@example.com"
        orig_pw = "OrigPass123!"
        reg = session.post(f"{BASE_URL}/api/auth/register",
                           json={"email": email, "password": orig_pw, "name": "Reset Tester",
                                 "tenant_name": "ResetTestCo"})
        assert reg.status_code == 200, reg.text

        # Request password reset -> backend sends email with JWT; we mimic by decoding? 
        # Instead, we use same JWT creation via forgot-password success path.
        # The endpoint doesn't return the token, so we'll create our own JWT with same secret.
        import jwt as _jwt
        from datetime import timedelta
        # Fetch user id via login
        lo = session.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": orig_pw})
        assert lo.status_code == 200
        user_id = lo.json()["id"]

        secret = os.environ.get("JWT_SECRET", "a7f2c8e4d1b5g3h9k2l4m6n8p0q1r3s5t7u9v1w3x5y7z9a2b4c6d8e0f1g3h5")
        payload = {"sub": user_id, "email": email,
                   "exp": datetime.now(timezone.utc) + timedelta(hours=1), "type": "access"}
        token = _jwt.encode(payload, secret, algorithm="HS256")

        new_pw = "NewSecurePass456!"
        # Remove any existing Authorization header from module-level fixture
        clean = requests.Session()
        clean.headers.update({"Content-Type": "application/json"})
        r = clean.post(f"{BASE_URL}/api/auth/reset-password",
                       json={"token": token, "new_password": new_pw})
        assert r.status_code == 200, r.text
        assert "exitosa" in r.json()["message"].lower() or "restablec" in r.json()["message"].lower()

        # Verify new password works
        lo2 = clean.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": new_pw})
        assert lo2.status_code == 200

        # Verify old password rejected
        lo3 = clean.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": orig_pw})
        assert lo3.status_code == 401


# ==================== Trial Registration ====================

class TestTrialRegistration:

    def test_register_creates_trial_tenant_with_correct_modules(self, session):
        email = f"trial-test-{int(time.time())}-{uuid.uuid4().hex[:4]}@example.com"
        clean = requests.Session()
        clean.headers.update({"Content-Type": "application/json"})
        r = clean.post(f"{BASE_URL}/api/auth/register",
                       json={"email": email, "password": "TrialPass123!",
                             "name": "Trial Owner", "tenant_name": "TrialOrgTEST"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "tenant_admin"
        tenant_id = data["tenant_id"]
        assert tenant_id

        # Fetch tenant doc via admin
        admin_s = requests.Session()
        admin_s.headers.update({"Content-Type": "application/json"})
        lo = admin_s.post(f"{BASE_URL}/api/auth/login",
                         json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert lo.status_code == 200
        admin_s.headers.update({"Authorization": f"Bearer {lo.json()['access_token']}"})
        tr = admin_s.get(f"{BASE_URL}/api/admin/tenants")
        assert tr.status_code == 200
        tenants = tr.json()
        tenant = next((t for t in tenants if t.get("id") == tenant_id), None)
        assert tenant is not None, f"Tenant {tenant_id} not found"

        assert tenant.get("plan") == "trial", f"Expected plan=trial, got {tenant.get('plan')}"
        modules = tenant.get("modules", {})
        assert modules.get("leads") is True
        assert modules.get("crm") is True
        assert modules.get("prospeccion") is False
        assert modules.get("email_marketing") is False

        trial_end = tenant.get("trial_ends_at")
        assert trial_end, "trial_ends_at missing"
        # Parse and check ~15 days from now
        try:
            te = datetime.fromisoformat(trial_end.replace("Z", "+00:00"))
        except Exception:
            te = datetime.fromisoformat(trial_end)
        delta_days = (te - datetime.now(timezone.utc)).days
        assert 13 <= delta_days <= 15, f"trial_ends_at delta = {delta_days} days (expected ~15)"


# ==================== Reset Demo Data ====================

class TestResetDemoData:

    def test_reset_demo_data_requires_super_admin(self):
        # Register a regular tenant_admin -> should get 403
        email = f"non-sa-{int(time.time())}@example.com"
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{BASE_URL}/api/auth/register",
                   json={"email": email, "password": "Pass1234!", "name": "Non SA",
                         "tenant_name": "NonSAOrg"})
        assert r.status_code == 200
        token = r.json()["access_token"]
        s.headers.update({"Authorization": f"Bearer {token}"})
        rr = s.post(f"{BASE_URL}/api/admin/reset-demo-data", json={})
        assert rr.status_code == 403, f"Expected 403, got {rr.status_code} - {rr.text}"

    def test_reset_demo_data_as_super_admin(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/admin/reset-demo-data", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "deleted" in data
        deleted = data["deleted"]
        # Check that all expected collections are reported
        expected_cols = ["leads", "crm_contacts", "crm_deals", "crm_tasks", "crm_notes",
                         "campaigns", "email_campaigns"]
        for col in expected_cols:
            assert col in deleted, f"Missing col {col} in deleted counts"


# ==================== CRM Deals Bulk Action ====================

class TestCrmDealsBulkAction:

    def _create_contact(self, client):
        r = client.post(f"{BASE_URL}/api/crm/contacts",
                        json={"business_name": f"TEST_BulkContact_{uuid.uuid4().hex[:6]}",
                              "name": f"TEST_BulkContact_{uuid.uuid4().hex[:6]}",
                              "email": f"tc{uuid.uuid4().hex[:6]}@test.com"})
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def _create_deal(self, client, contact_id, stage="lead"):
        r = client.post(f"{BASE_URL}/api/crm/deals",
                        json={"contact_id": contact_id,
                              "title": f"TEST_BulkDeal_{uuid.uuid4().hex[:6]}",
                              "value": 1000, "stage": stage})
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def test_bulk_action_move_updates_stages(self, admin_client):
        cid = self._create_contact(admin_client)
        ids = [self._create_deal(admin_client, cid, stage="lead") for _ in range(3)]

        r = admin_client.post(f"{BASE_URL}/api/crm/deals/bulk-action",
                              json={"deal_ids": ids, "action": "move", "stage": "qualified"})
        assert r.status_code == 200, r.text
        assert "move" in r.json()["message"].lower() or "movid" in r.json()["message"].lower()

        # Verify stages via GET (list)
        g = admin_client.get(f"{BASE_URL}/api/crm/deals")
        assert g.status_code == 200
        deals_map = {d["id"]: d for d in g.json()}
        for did in ids:
            assert did in deals_map, f"Deal {did} missing"
            assert deals_map[did]["stage"] == "qualified", f"Deal {did} stage not updated"

    def test_bulk_action_delete_removes_deals(self, admin_client):
        cid = self._create_contact(admin_client)
        ids = [self._create_deal(admin_client, cid) for _ in range(2)]

        r = admin_client.post(f"{BASE_URL}/api/crm/deals/bulk-action",
                              json={"deal_ids": ids, "action": "delete"})
        assert r.status_code == 200, r.text

        # Verify deleted (via list)
        g = admin_client.get(f"{BASE_URL}/api/crm/deals")
        assert g.status_code == 200
        existing_ids = {d["id"] for d in g.json()}
        for did in ids:
            assert did not in existing_ids, f"Deal {did} still exists"

    def test_bulk_action_invalid_action(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/crm/deals/bulk-action",
                              json={"deal_ids": ["fake"], "action": "unknown"})
        assert r.status_code == 400

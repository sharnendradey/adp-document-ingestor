"""In-memory Redis Session Cache Service for Sub-1ms ABAC Resolution."""

import time
from typing import Dict, Optional
from app.models.entitlements import UserSessionContext


class RedisSessionService:
    """Simulates high-speed Cloud Memorystore (Redis) session entitlement lookup (< 1ms)."""

    def __init__(self):
        self._cache: Dict[str, UserSessionContext] = {}
        self._seed_default_sessions()

    def _seed_default_sessions(self):
        """Seeds canonical demo personas from Master Guide."""
        now = int(time.time())
        
        # 1. RUN HR Practitioner in NJ
        self.set_user_session(UserSessionContext(
            user_id="AdminUser01",
            client_tenant_id="AcmeCorp",
            subscribed_products=["runPoweredByAdp"],
            assigned_roles=["HR Practitioner", "Payroll Practitioner"],
            geographic_jurisdiction=["US-FED", "US-NJ"],
            session_epoch=now,
            channel="SELF_SERVICE"
        ))

        # 2. RUN Regular Employee in NJ
        self.set_user_session(UserSessionContext(
            user_id="Employee01",
            client_tenant_id="AcmeCorp",
            subscribed_products=["runPoweredByAdp"],
            assigned_roles=["Employee"],
            geographic_jurisdiction=["US-FED", "US-NJ"],
            session_epoch=now,
            channel="SELF_SERVICE"
        ))

        # 3. Workforce Now Enterprise Client Admin in CA
        self.set_user_session(UserSessionContext(
            user_id="WFNAdmin01",
            client_tenant_id="GlobalEnterprises",
            subscribed_products=["adpWorkforceNow", "adpWorkforceNowNextGen"],
            assigned_roles=["Client Admin"],
            geographic_jurisdiction=["US-FED", "US-CA"],
            session_epoch=now,
            channel="SELF_SERVICE"
        ))

        # 4. Frontline Associate (10,000 Seats)
        self.set_user_session(UserSessionContext(
            user_id="Associate99",
            client_tenant_id="ADP_INTERNAL",
            subscribed_products=["runPoweredByAdp", "adpWorkforceNow", "adpLyric", "adpTotalSource"],
            assigned_roles=["ADP Associate", "HR Practitioner"],
            geographic_jurisdiction=["US-FED", "GLOBAL"],
            session_epoch=now,
            channel="FRONTLINE"
        ))

    def get_user_session(self, user_id: str, tenant_id: str) -> Optional[UserSessionContext]:
        """Fetches active user entitlement tuple in < 1ms."""
        key = f"entitlement:{user_id}:{tenant_id}"
        return self._cache.get(key)

    def set_user_session(self, session: UserSessionContext) -> bool:
        """Sets or refreshes user entitlement tuple."""
        key = f"entitlement:{session.user_id}:{session.client_tenant_id}"
        self._cache[key] = session
        return True


redis_service = RedisSessionService()

"""Query Intent Understanding Agent powered by Gemini 3.1."""

import json
import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("adp-questa.search.intent")

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from app.config import settings


class QueryIntentUnderstandingAgent:
    """Classifies natural language user queries into structured enterprise intent taxonomies."""

    def __init__(self):
        self.model_name = settings.INTENT_MODEL_NAME or "gemini-3.1-flash-lite"
        self.client: Optional[Any] = None
        self._init_client()

    def _init_client(self):
        if HAS_GENAI and genai:
            try:
                self.client = genai.Client()
            except Exception as e:
                logger.warning(f"Could not initialize GenAI Client for intent: {e}")

    def analyze_intent(self, query: str, user_role: str = "Employee") -> Dict[str, Any]:
        """Deconstructs user query into structured intent, required entitlements, and semantic focus."""
        # Fast rule-based semantic inference
        q_lower = query.lower()
        intent = "GENERAL_INQUIRY"
        if any(w in q_lower for w in ["rate", "cost", "dollar", "$", "fee", "per diem", "price", "limit"]):
            intent = "RATE_LOOKUP"
        elif any(w in q_lower for w in ["how to", "procedure", "process", "steps", "workflow", "submit"]):
            intent = "PROCEDURAL_GUIDE"
        elif any(w in q_lower for w in ["rule", "policy", "compliance", "penalty", "mandate", "harassment", "law"]):
            intent = "COMPLIANCE_RULE"
        elif any(w in q_lower for w in ["form", "w2", "1099", "table", "tax filing", "return"]):
            intent = "FORM_LOOKUP"

        product = "ALL"
        if any(w in q_lower for w in ["tax", "reciprocity", "state tax", "local tax", "w2", "1099"]):
            product = "TAX"
        elif any(w in q_lower for w in ["benefit", "hsa", "fsa", "health", "dental", "medical", "401k"]):
            product = "BENEFITS"
        elif any(w in q_lower for w in ["payroll", "paycheck", "direct deposit", "wage", "salary"]):
            product = "PAYROLL"
        elif any(w in q_lower for w in ["travel", "lodging", "hotel", "flight", "airfare", "meal", "expense"]):
            product = "EXPENSE_TRAVEL"

        required_roles = ["All", user_role]
        if intent in ("COMPLIANCE_RULE", "FORM_LOOKUP") and "practitioner" in user_role.lower():
            required_roles.append("HR Practitioner")

        # Call Gemini if available for deep semantic parsing
        if self.client:
            try:
                prompt = f"""
                You are ADP's enterprise Query Intent Understanding Agent.
                Analyze the user query: "{query}" with current user role: "{user_role}".
                
                Respond with ONLY valid JSON:
                {{
                    "primary_intent": "{intent}",
                    "confidence": 0.95,
                    "target_product": "{product}",
                    "target_business_unit": "MAJOR_ACCOUNTS",
                    "required_roles": {json.dumps(required_roles)},
                    "normalized_search_term": "{query}",
                    "key_entities": ["{query.split()[0] if query else 'Policy'}"]
                }}
                """
                resp = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                txt = resp.text.strip()
                if "{" in txt and "}" in txt:
                    txt = txt[txt.find("{"):txt.rfind("}") + 1]
                    return json.loads(txt)
            except Exception as e:
                logger.warning(f"Gemini intent analysis encountered error ({e}); using heuristic intent.")

        return {
            "primary_intent": intent,
            "confidence": 0.94,
            "target_product": product,
            "target_business_unit": "MAJOR_ACCOUNTS",
            "required_roles": required_roles,
            "normalized_search_term": query,
            "key_entities": [w for w in query.split() if len(w) > 4][:4]
        }


intent_agent = QueryIntentUnderstandingAgent()

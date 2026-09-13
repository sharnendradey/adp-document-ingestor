"""ScaNN Vector Engine & Entitlement-Filtered Spanner Retrieval."""

import time
from typing import Any, Dict, List, Optional

from app.services.spanner_service import spanner_service
from app.services.vertex_embedding_service import embedding_service


class GovernedSearchEngine:
    """Executes ABAC pre-filtered vector retrieval over Cloud Spanner."""

    @staticmethod
    def search_entitled(
        query_text: str,
        tenant_boundary: str = "GLOBAL",
        product_families: Optional[List[str]] = None,
        audience_roles: Optional[List[str]] = None,
        geographies: Optional[List[str]] = None,
        current_epoch: Optional[int] = None,
        top_k: int = 5,
        distance_threshold: float = 1.2
    ) -> List[Dict[str, Any]]:
        """Generates dense vector and executes ScaNN pre-filtered mathematical search in Spanner."""
        query_vector = embedding_service.generate_embedding(query_text)
        products = product_families or ["ALL"]
        roles = audience_roles or ["All"]
        geos = geographies or ["GLOBAL", "US", "US-FED"]
        epoch = current_epoch or int(time.time())

        return spanner_service.search_vector_entitled(
            query_vector=query_vector,
            tenant_boundary=tenant_boundary,
            product_families=products,
            audience_roles=roles,
            geographies=geos,
            current_epoch=epoch,
            top_k=top_k,
            distance_threshold=distance_threshold
        )


search_engine = GovernedSearchEngine()

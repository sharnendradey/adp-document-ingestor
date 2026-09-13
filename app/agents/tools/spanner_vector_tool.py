"""ADK Tool for Pre-Filtered Cloud Spanner Vector Retrieval."""

from typing import Any, Dict, List
from app.services.spanner_service import spanner_service
from app.services.vertex_embedding_service import embedding_service
from app.models.entitlements import UserSessionContext


class SpannerVectorTool:
    """Queries Cloud Spanner Vector Index with strict ABAC pre-filtering."""

    def search_authorized_knowledge(
        self,
        query: str,
        session: UserSessionContext,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Executes ScaNN pre-filtered mathematical vector retrieval.
        Pushes user product subscriptions, role whitelist, jurisdictions, and current epoch into Spanner.
        """
        # 1. Generate query embedding
        query_vec = embedding_service.generate_embedding(query)

        # 2. Execute entitled vector search
        results = spanner_service.search_vector_entitled(
            query_vector=query_vec,
            tenant_boundary=session.client_tenant_id,
            product_families=session.subscribed_products,
            audience_roles=session.assigned_roles,
            geographies=session.geographic_jurisdiction,
            current_epoch=session.session_epoch,
            top_k=top_k,
            distance_threshold=1.2
        )
        return results


spanner_vector_tool = SpannerVectorTool()

"""ADK Tool for Cloud Spanner Property Graph Lineage & Overrides Traversal."""

from typing import Any, Dict, List
from app.services.spanner_service import spanner_service


class SpannerGraphTool:
    """Traverses Spanner Graph edges for statutory state exceptions and policy successors."""

    def resolve_jurisdiction_exceptions(
        self,
        candidate_chunk_ids: List[str],
        jurisdiction_codes: List[str]
    ) -> List[Dict[str, Any]]:
        """Traverses [:HAS_EXCEPTION] edges to check for localized state statutory carve-outs (e.g. US-NJ)."""
        all_overrides = []
        for geo in jurisdiction_codes:
            if geo != "US-FED" and geo != "GLOBAL":
                overrides = spanner_service.traverse_graph_overrides(candidate_chunk_ids, geo)
                all_overrides.extend(overrides)
        return all_overrides


spanner_graph_tool = SpannerGraphTool()

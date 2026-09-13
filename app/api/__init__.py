"""API endpoints module for ADP Questa Agentic Service."""

from app.api.routes import router as main_router
from app.api.extraction_routes import router as extraction_router

__all__ = [
    "main_router",
    "extraction_router",
]

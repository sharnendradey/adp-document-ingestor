"""Main FastAPI application entrypoint for ADP Questa Agentic Service."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import router as main_router
from app.api.extraction_routes import router as extraction_router
from app.api.spanner_routes import router as spanner_router
from app.ingestion.routes import router as ingestion_router
from app.search.routes import router as search_router
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

# Logging Configuration
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("adp-questa.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and graceful shutdown."""
    logger.info(f"Starting {settings.APP_NAME} (ADK Agent: {settings.AGENT_NAME})")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title="ADP Questa Knowledge & Runtime Entitlements Agentic Service",
    description=(
        "Production-grade Google ADK agent service operationalizing the Two-Pass Ingestion "
        "pipeline and Sub-5ms Runtime Entitlements over Cloud Spanner Vector & Graph."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Routers
app.include_router(main_router)
app.include_router(extraction_router)
app.include_router(spanner_router)
app.include_router(ingestion_router)
app.include_router(search_router)

# Mount React UI static assets if built
ui_dist_dir = os.path.join(os.path.dirname(__file__), "..", "ui", "dist")
ui_assets_dir = os.path.join(ui_dist_dir, "assets")
if os.path.exists(ui_assets_dir):
    app.mount("/assets", StaticFiles(directory=ui_assets_dir), name="ui_assets")


@app.get("/", include_in_schema=False)
def serve_web_ui():
    """Serves the ADP Questa Client Experience UI (React SPA or fallback)."""
    react_index = os.path.join(ui_dist_dir, "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    index_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    return FileResponse(index_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

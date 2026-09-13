"""Ingestion REST & SSE Streaming API Endpoints."""

import asyncio
import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.ingestion.pipeline import ingestion_pipeline
from app.services.spanner_service import spanner_service

logger = logging.getLogger("adp-questa.ingestion.routes")
router = APIRouter(prefix="/api/v1/ingest", tags=["Ingestion"])

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ProcessRequest(BaseModel):
    job_id: Optional[str] = None
    file_path: Optional[str] = None
    filename: Optional[str] = None
    raw_text: Optional[str] = None
    document_id: Optional[str] = None
    source_system_id: str = "EKM_CORE"
    version: int = 1


@router.get("/samples")
def list_sample_documents() -> Dict[str, Any]:
    """Scans and categorizes all client files available in Client-Data repository."""
    client_data_dir = os.path.join(WORKSPACE_ROOT, "Client-Data")
    if not os.path.exists(client_data_dir):
        # Fallback to local search
        client_data_dir = os.path.abspath("../Client-Data")

    categories = {
        "Call Drivers": [],
        "Client Policies": [],
        "Metadata & Taxonomy": [],
        "RUN Help Topics": [],
        "Requirements & Architecture": []
    }

    supported_exts = {".pdf", ".docx", ".xlsx", ".xls", ".html", ".htm", ".csv", ".txt"}

    if os.path.exists(client_data_dir):
        for root, _, files in os.walk(client_data_dir):
            for file in sorted(files):
                ext = os.path.splitext(file)[1].lower()
                if ext in supported_exts and not file.startswith("~$") and not file.startswith("."):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, client_data_dir)
                    size = os.path.getsize(full_path)

                    item = {
                        "filename": file,
                        "relative_path": rel_path,
                        "full_path": full_path,
                        "format": ext.lstrip(".").upper(),
                        "size_bytes": size,
                        "size_display": f"{size / 1024:.1f} KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.1f} MB"
                    }

                    if "Call Drivers" in root:
                        categories["Call Drivers"].append(item)
                    elif "Client Policies" in root:
                        categories["Client Policies"].append(item)
                    elif "Metadata" in root:
                        categories["Metadata & Taxonomy"].append(item)
                    elif "RUN Help Topics" in root:
                        categories["RUN Help Topics"].append(item)
                    else:
                        categories["Requirements & Architecture"].append(item)

    total_count = sum(len(items) for items in categories.values())
    return {
        "total_files": total_count,
        "categories": categories
    }


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None),
    version: int = Form(1)
) -> Dict[str, Any]:
    """Uploads a document to local staging area and registers a job_id for SSE tracking."""
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    filename = file.filename or "uploaded_document"
    dest_path = os.path.join(UPLOAD_DIR, f"{job_id}_{filename}")

    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    # Initialize event queue
    ingestion_pipeline.get_or_create_queue(job_id)

    return {
        "job_id": job_id,
        "filename": filename,
        "file_path": dest_path,
        "document_id": document_id,
        "version": version,
        "size_bytes": len(content),
        "stream_url": f"/api/v1/ingest/stream/{job_id}"
    }


@router.post("/process")
async def start_ingestion_process(
    req: ProcessRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """Triggers asynchronous governed ingestion execution with background telemetry streaming."""
    job_id = req.job_id or f"job_{uuid.uuid4().hex[:12]}"
    ingestion_pipeline.get_or_create_queue(job_id)

    target_content = req.file_path or req.raw_text
    if not target_content:
        raise HTTPException(status_code=400, detail="Either file_path or raw_text must be provided")

    filename = req.filename or (os.path.basename(req.file_path) if req.file_path else "in_memory_doc.txt")

    background_tasks.add_task(
        ingestion_pipeline.run_ingestion_async,
        job_id=job_id,
        file_path_or_content=target_content,
        filename=filename,
        document_id=req.document_id,
        source_system_id=req.source_system_id,
        version=req.version
    )

    return {
        "job_id": job_id,
        "status": "QUEUED",
        "stream_url": f"/api/v1/ingest/stream/{job_id}"
    }


@router.get("/stream/{job_id}")
async def stream_ingestion_telemetry(job_id: str):
    """Server-Sent Events (SSE) live streaming endpoint broadcasting ingestion progress in real-time."""
    queue = ingestion_pipeline.get_or_create_queue(job_id)

    async def event_generator():
        yield f"data: {json.dumps({'event_type': 'connected', 'job_id': job_id})}\n\n"
        while True:
            try:
                # Wait up to 30s for next event
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("event_type") in ("job_completed", "error"):
                    break
            except asyncio.TimeoutError:
                yield f": keepalive\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'event_type': 'error', 'message': str(e)})}\n\n"
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/document/{document_id}")
def get_document_details(document_id: str) -> Dict[str, Any]:
    """Retrieves macro document catalog metadata and all child knowledge units with Tri-Views."""
    doc = spanner_service.get_macro_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found in parent table")

    units = spanner_service.list_knowledge_units(document_id=document_id, limit=200)

    return {
        "document": doc,
        "total_units": len(units),
        "knowledge_units": units
    }

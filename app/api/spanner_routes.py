"""API routes for inspecting live Cloud Spanner database records and sample data."""

import os
import re
from html.parser import HTMLParser
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.services.spanner_service import spanner_service

router = APIRouter()

SAMPLE_DATA_DIR = "/Users/sharnendradey/Documents/adp-ai-db/Client-Data/Sample Data/Content Repository RUN/1. RUN Help Topics"


class SimpleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        cleaned = data.strip()
        if cleaned:
            self.parts.append(cleaned)

    def get_text(self):
        return " ".join(self.parts)


def parse_html(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        parser = SimpleParser()
        parser.feed(f.read())
        return parser.get_text()


@router.get("/api/v1/spanner/status")
def get_spanner_status() -> Dict[str, Any]:
    """Returns the live Cloud Spanner connection status and record counts."""
    docs = spanner_service.list_documents(limit=100)
    chunks = spanner_service.list_knowledge_units(limit=100)
    is_live = spanner_service.database is not None
    return {
        "status": "CONNECTED" if is_live else "FALLBACK_IN_MEMORY",
        "is_live_spanner": is_live,
        "gcp_project": settings.GCP_PROJECT_ID,
        "instance_id": settings.SPANNER_INSTANCE_ID,
        "database_id": settings.SPANNER_DATABASE_ID,
        "document_count": len(docs),
        "chunk_count": len(chunks),
        "tables": [
            {"name": "knowledge_documents", "description": "Parent Document Catalog (BU Admin & Ingress, NO Vectors)", "row_count": len(docs)},
            {"name": "knowledge_units", "description": "Child Retrieval Atoms (768d Vectors, 33 ABAC Attributes)", "row_count": len(chunks)},
            {"name": "knowledge_graph_edges", "description": "Relational Property Graph Overrides & Lineage", "row_count": 0},
            {"name": "audit_log_tombstones", "description": "Cryptographic Revocation Ledger", "row_count": 0}
        ]
    }


@router.get("/api/v1/spanner/documents")
def list_spanner_documents(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns rows from knowledge_documents table in Cloud Spanner."""
    return spanner_service.list_documents(limit=limit)


@router.get("/api/v1/spanner/chunks")
def list_spanner_chunks(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns rows from knowledge_units table in Cloud Spanner."""
    return spanner_service.list_knowledge_units(limit=limit)


SAMPLE_ROOTS = [
    ("/Users/sharnendradey/Documents/adp-ai-db/Client-Data/Sample Data/Call Drivers", "Call Drivers (Excel & PDF)"),
    ("/Users/sharnendradey/Documents/adp-ai-db/Client-Data/Metadata", "Enterprise Architecture & Metadata"),
    ("/Users/sharnendradey/Documents/adp-ai-db/Client-Data/Sample Data/Client Policies", "Client Policy Handbooks (PDF)"),
    ("/Users/sharnendradey/Documents/adp-ai-db/Client-Data/Sample Data/Content Repository RUN/1. RUN Help Topics", "RUN Knowledge Topics (HTML)")
]


@router.get("/api/v1/sample-files")
def list_sample_client_files() -> List[Dict[str, Any]]:
    """Lists available client sample files across XLSX, DOCX, PDF, and HTML formats."""
    results = []
    for dir_path, category in SAMPLE_ROOTS:
        if not os.path.exists(dir_path):
            continue
        for f in sorted(os.listdir(dir_path)):
            if f.startswith("."):
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in [".xlsx", ".xls", ".docx", ".pdf", ".html", ".csv"]:
                fpath = os.path.join(dir_path, f)
                clean_id = "doc_" + re.sub(r'[^a-zA-Z0-9_]', '_', os.path.splitext(f)[0])[:40]
                results.append({
                    "filename": f,
                    "category": category,
                    "file_type": ext.lstrip(".").upper(),
                    "size_bytes": os.path.getsize(fpath),
                    "file_path": fpath,
                    "doc_id": clean_id
                })
    return results


@router.get("/api/v1/sample-files/{filename}")
def get_sample_file_content(filename: str) -> Dict[str, Any]:
    """Retrieves content or file metadata of a sample file for ingestion."""
    target_path = None
    target_category = "General"
    for dir_path, category in SAMPLE_ROOTS:
        fpath = os.path.join(dir_path, filename)
        if os.path.exists(fpath):
            target_path = fpath
            target_category = category
            break

    if not target_path:
        raise HTTPException(status_code=404, detail=f"Sample file '{filename}' not found.")

    ext = os.path.splitext(filename)[1].lower()
    clean_id = "doc_" + re.sub(r'[^a-zA-Z0-9_]', '_', os.path.splitext(filename)[0])[:40]
    size = os.path.getsize(target_path)

    if ext in [".html", ".htm"]:
        with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return {
            "filename": filename,
            "category": target_category,
            "file_type": "HTML",
            "file_path": target_path,
            "doc_id": clean_id,
            "character_count": len(content),
            "content": content
        }
    else:
        # Binary or structured document (.xlsx, .docx, .pdf, .csv)
        return {
            "filename": filename,
            "category": target_category,
            "file_type": ext.lstrip(".").upper(),
            "file_path": target_path,
            "doc_id": clean_id,
            "character_count": size,
            "content": target_path  # Pass file path directly for layout decomposition
        }


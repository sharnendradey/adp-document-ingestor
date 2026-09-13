"""API routes for document ingestion and metadata extraction pipeline."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.root_supervisor import root_supervisor_agent

router = APIRouter()


class IngestDocumentRequest(BaseModel):
    document_id: str = Field(..., example="doc_payroll_direct_deposit_2026")
    filename: str = Field(..., example="ADP_RUN_Direct_Deposit_Setup.pdf")
    content: str = Field(..., description="Raw document text content, OCR stream, or physical file path")
    source_system_id: str = Field(default="EKM_CORE", example="EKM_CORE")


class IngestFileRequest(BaseModel):
    file_path: str = Field(..., description="Absolute or relative path to file on disk (.xlsx, .xls, .docx, .pdf, .html, .csv)")
    source_system_id: str = Field(default="CLIENT_DATA_CORPUS", description="Source repository code")
    document_id: Optional[str] = Field(default=None, description="Optional custom document identifier")


@router.post("/api/v1/extract/document")
def extract_document(req: IngestDocumentRequest) -> Dict[str, Any]:
    """Triggers the Two-Pass Ingestion Pipeline & Quality Assurance Gate for text or file path."""
    try:
        result = root_supervisor_agent.ingest_document(
            document_id=req.document_id,
            raw_text=req.content,
            filename=req.filename,
            source_system_id=req.source_system_id
        )
        return {"status": "SUCCESS", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/extract/file")
def extract_file(req: IngestFileRequest) -> Dict[str, Any]:
    """Ingests any enterprise document (.xlsx, .docx, .pdf, .html, .csv) directly from disk."""
    try:
        result = root_supervisor_agent.ingest_file(
            file_path=req.file_path,
            source_system_id=req.source_system_id,
            document_id=req.document_id
        )
        return {"status": "SUCCESS", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


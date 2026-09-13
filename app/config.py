"""Application configuration settings for ADP Questa Agentic Service."""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration loaded from environment variables and .env file."""

    # Service & Network
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    DEBUG: bool = True
    APP_NAME: str = "adp_questa_agentic_service"
    AGENT_NAME: str = "adp_questa_supervisor"

    # AI Models (Gemini Multimodal Suite on Vertex AI)
    MODEL_NAME: str = "gemini-3.5-flash"
    SUPERVISOR_MODEL_NAME: str = "gemini-3.1-pro-preview"
    INTENT_MODEL_NAME: str = "gemini-3.5-flash"
    LIVE_MODEL_NAME: str = "gemini-3.5-flash"
    EMBEDDING_MODEL_NAME: str = "text-multilingual-embedding-002"
    GEMINI_LOCATION: str = "global"
    GEMINI_API_KEY: Optional[str] = None

    # Google Cloud Platform
    GCP_PROJECT_ID: str = "gemini-ai-apigee-security"
    GOOGLE_CLOUD_QUOTA_PROJECT: str = "gemini-ai-apigee-security"
    GCP_LOCATION: str = "us-central1"
    GCS_INGEST_BUCKET: str = "adp-questa-document-ingest-poc"

    # Cloud Spanner
    SPANNER_INSTANCE_ID: str = "adp-test-spanner"
    SPANNER_DATABASE_ID: str = "adp_governed_knowledge"
    SPANNER_USE_EMULATOR: bool = False

    # Document AI
    DOCAI_LOCATION: str = "us"
    DOCAI_PROCESSOR_ID: Optional[str] = None

    # Redis Session Cache
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_TTL_SECONDS: int = 3600

    # VerifyAI Integration
    VERIFYAI_ENDPOINT: str = "https://verifyai.adp.internal/api/v1/incidents"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

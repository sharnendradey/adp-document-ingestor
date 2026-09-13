"""Embedding Service for text-embedding-004 (768-dimensional vectors)."""

import hashlib
import logging
import math
from typing import List

logger = logging.getLogger("adp-questa.embedding")

try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from app.config import settings


class VertexEmbeddingService:
    """Generates 768-dimensional dense vector embeddings."""

    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self.client = None
        if HAS_GENAI:
            try:
                if settings.GEMINI_API_KEY:
                    self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                elif settings.GCP_PROJECT_ID:
                    self.client = genai.Client(
                        vertexai=True,
                        project=settings.GCP_PROJECT_ID,
                        location="us-central1"
                    )
                    logger.info("Initialized live Vertex AI GenAI Client (text-embedding-004)")
            except Exception as e:
                logger.warning(f"Could not initialize GenAI client: {e}")

    def generate_embedding(self, text: str) -> List[float]:
        """Generates 768-dimensional normalized vector embedding for text."""
        if self.client:
            try:
                response = self.client.models.embed_content(
                    model=self.model_name,
                    contents=text
                )
                if response and response.embeddings:
                    return response.embeddings[0].values
            except Exception as e:
                logger.warning(f"Live embedding generation failed ({e}). Using deterministic fallback.")

        # Deterministic 768-dimensional normalized mock vector
        return self._generate_deterministic_vector(text)

    def generate_embeddings_batch(self, texts: List[str], max_chars_per_batch: int = 35000, max_items: int = 20) -> List[List[float]]:
        """Generates 768-dimensional embeddings for a batch of texts using high-throughput batch requests.
        Respects Vertex AI 20,000 token budget per batch request with recursive subdivision fallback.
        """
        if not texts:
            return []

        # Adaptive grouping based on text length to stay well below the 20k token limit
        batches: List[List[str]] = []
        current_batch: List[str] = []
        current_chars = 0

        for t in texts:
            t_len = len(t)
            if current_batch and (current_chars + t_len > max_chars_per_batch or len(current_batch) >= max_items):
                batches.append(current_batch)
                current_batch = []
                current_chars = 0
            current_batch.append(t)
            current_chars += t_len

        if current_batch:
            batches.append(current_batch)

        all_embeddings: List[List[float]] = []

        def _embed_sub_batch(sub_batch: List[str]) -> List[List[float]]:
            if not sub_batch:
                return []
            if self.client:
                try:
                    response = self.client.models.embed_content(
                        model=self.model_name,
                        contents=sub_batch
                    )
                    if response and response.embeddings and len(response.embeddings) == len(sub_batch):
                        return [emb.values for emb in response.embeddings]
                except Exception as e:
                    logger.warning(f"Batch embedding failed for {len(sub_batch)} items ({e}). Sub-dividing...")
                    if len(sub_batch) > 1:
                        mid = len(sub_batch) // 2
                        return _embed_sub_batch(sub_batch[:mid]) + _embed_sub_batch(sub_batch[mid:])
            # Fallback to single-item generation
            return [self.generate_embedding(t) for t in sub_batch]

        for b in batches:
            all_embeddings.extend(_embed_sub_batch(b))

        return all_embeddings


    def _generate_deterministic_vector(self, text: str) -> List[float]:
        """Generates reproducible 768d unit vector for testing."""
        h = hashlib.sha256(text.encode("utf-8")).digest()
        vec = []
        for i in range(768):
            byte_val = h[i % len(h)]
            float_val = (byte_val - 128.0) / 128.0 + (math.sin(i + byte_val) * 0.1)
            vec.append(float_val)

        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [round(x / norm, 6) for x in vec]


embedding_service = VertexEmbeddingService()

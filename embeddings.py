"""
Embedding utilities for RAG System.
Handles embedding generation, caching, and similarity calculations.
"""

import os
import json
import hashlib
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from google.cloud import aiplatform
from google.cloud.aiplatform import TextEmbeddingModel
from google.cloud import firestore
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
PROJECT_ID = os.getenv("PROJECT_ID", "your-project-id")
LOCATION = os.getenv("REGION", "us-central1")
EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIMENSION = 768
BATCH_SIZE = 20
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

# Initialize clients
aiplatform.init(project=PROJECT_ID, location=LOCATION)
firestore_client = firestore.Client(project=PROJECT_ID)


# ─────────────────────────────────────────────
# Core Embedding Generation
# ─────────────────────────────────────────────

def generate_embeddings(
    texts: List[str],
    model_name: str = EMBEDDING_MODEL,
    task_type: str = "RETRIEVAL_DOCUMENT",
    output_dimensionality: int = EMBEDDING_DIMENSION,
    use_cache: bool = True
) -> List[List[float]]:
    """
    Generate embeddings for a list of texts using Vertex AI.
    Supports caching to avoid redundant API calls.
    """
    if not texts:
        return []

    results = []
    uncached_texts = []
    uncached_indices = []

    # Check cache for each text
    if use_cache:
        for i, text in enumerate(texts):
            cached = get_cached_embedding(text, model_name)
            if cached is not None:
                results.append((i, cached))
            else:
                uncached_texts.append(text)
                uncached_indices.append(i)
    else:
        uncached_texts = texts
        uncached_indices = list(range(len(texts)))

    # Generate embeddings for uncached texts
    if uncached_texts:
        new_embeddings = _batch_generate_embeddings(
            uncached_texts, model_name, task_type, output_dimensionality
        )

        for idx, (text, embedding) in enumerate(zip(uncached_texts, new_embeddings)):
            original_index = uncached_indices[idx]
            results.append((original_index, embedding))

            if use_cache:
                cache_embedding(text, embedding, model_name)

    # Sort by original index and return
    results.sort(key=lambda x: x[0])
    return [emb for _, emb in results]


def _batch_generate_embeddings(
    texts: List[str],
    model_name: str,
    task_type: str,
    output_dimensionality: int
) -> List[List[float]]:
    """
    Internal function to generate embeddings in batches with retry logic.
    """
    all_embeddings = []
    model = TextEmbeddingModel.from_pretrained(model_name)

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info(f"Generating embeddings batch {batch_num}/{total_batches}")

        for attempt in range(MAX_RETRIES):
            try:
                embeddings = model.get_embeddings(
                    batch,
                    output_dimensionality=output_dimensionality,
                    task_type=task_type
                )
                all_embeddings.extend([list(emb.values) for emb in embeddings])
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    wait_time = RETRY_DELAY * (attempt + 1)
                    logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"All {MAX_RETRIES} attempts failed for batch {batch_num}")
                    raise

    return all_embeddings


def generate_query_embedding(
    query: str,
    model_name: str = EMBEDDING_MODEL,
    output_dimensionality: int = EMBEDDING_DIMENSION
) -> List[float]:
    """
    Generate an embedding specifically for a query (uses RETRIEVAL_QUERY task type).
    """
    model = TextEmbeddingModel.from_pretrained(model_name)

    for attempt in range(MAX_RETRIES):
        try:
            embeddings = model.get_embeddings(
                [query],
                output_dimensionality=output_dimensionality,
                task_type="RETRIEVAL_QUERY"
            )
            return list(embeddings[0].values)
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                raise RuntimeError(f"Failed to generate query embedding: {e}")


# ─────────────────────────────────────────────
# Similarity Functions
# ─────────────────────────────────────────────

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a = np.array(a)
    b = np.array(b)
    dot_product = np.dot(a, b)
    magnitude_a = np.linalg.norm(a)
    magnitude_b = np.linalg.norm(b)

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return float(dot_product / (magnitude_a * magnitude_b))


def euclidean_distance(a: List[float], b: List[float]) -> float:
    """Calculate Euclidean distance between two vectors."""
    a = np.array(a)
    b = np.array(b)
    return float(np.linalg.norm(a - b))


def dot_product_similarity(a: List[float], b: List[float]) -> float:
    """Calculate dot product similarity between two vectors."""
    return float(np.dot(np.array(a), np.array(b)))


def rank_by_similarity(
    query_embedding: List[float],
    candidate_embeddings: List[Dict[str, Any]],
    metric: str = "cosine",
    top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Rank candidates by similarity to a query embedding.

    Args:
        query_embedding: The query vector.
        candidate_embeddings: List of dicts with 'embedding' and metadata keys.
        metric: Similarity metric ('cosine', 'euclidean', 'dot').
        top_k: Number of top results to return.

    Returns:
        Sorted list of candidates with similarity scores.
    """
    scored = []

    for candidate in candidate_embeddings:
        emb = candidate.get("embedding", [])
        if not emb:
            continue

        if metric == "cosine":
            score = cosine_similarity(query_embedding, emb)
        elif metric == "euclidean":
            score = -euclidean_distance(query_embedding, emb)  # Negate for ranking
        elif metric == "dot":
            score = dot_product_similarity(query_embedding, emb)
        else:
            raise ValueError(f"Unknown metric: {metric}")

        scored.append({**candidate, "similarity_score": score})

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:top_k]


# ─────────────────────────────────────────────
# Embedding Cache
# ─────────────────────────────────────────────

def _get_cache_key(text: str, model_name: str) -> str:
    """Generate a unique cache key for a text and model combination."""
    content = f"{model_name}:{text}"
    return hashlib.sha256(content.encode()).hexdigest()


def cache_embedding(
    text: str,
    embedding: List[float],
    model_name: str = EMBEDDING_MODEL
) -> None:
    """Cache an embedding in Firestore."""
    try:
        cache_key = _get_cache_key(text, model_name)
        cache_ref = firestore_client.collection("embedding_cache").document(cache_key)
        cache_ref.set({
            "text_hash": cache_key,
            "model": model_name,
            "embedding": embedding,
            "dimension": len(embedding),
            "cached_at": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        logger.warning(f"Failed to cache embedding: {e}")


def get_cached_embedding(
    text: str,
    model_name: str = EMBEDDING_MODEL
) -> Optional[List[float]]:
    """Retrieve a cached embedding from Firestore."""
    try:
        cache_key = _get_cache_key(text, model_name)
        cache_ref = firestore_client.collection("embedding_cache").document(cache_key)
        doc = cache_ref.get()

        if doc.exists:
            return doc.to_dict().get("embedding")
        return None
    except Exception as e:
        logger.warning(f"Failed to retrieve cached embedding: {e}")
        return None


def clear_embedding_cache(model_name: Optional[str] = None) -> int:
    """
    Clear cached embeddings from Firestore.
    If model_name is specified, only clears cache for that model.
    Returns number of deleted documents.
    """
    try:
        query = firestore_client.collection("embedding_cache")
        if model_name:
            query = query.where("model", "==", model_name)

        docs = query.stream()
        count = 0

        batch = firestore_client.batch()
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = firestore_client.batch()

        if count % 500 != 0:
            batch.commit()

        logger.info(f"Cleared {count} cached embeddings.")
        return count
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise


# ─────────────────────────────────────────────
# Embedding Validation & Analysis
# ─────────────────────────────────────────────

def validate_embedding(embedding: List[float], expected_dim: int = EMBEDDING_DIMENSION) -> bool:
    """Validate that an embedding has the correct dimension and no NaN/Inf values."""
    if len(embedding) != expected_dim:
        logger.error(f"Embedding dimension mismatch: expected {expected_dim}, got {len(embedding)}")
        return False

    arr = np.array(embedding)
    if np.any(np.isnan(arr)) or np.any(np.isinf(arr)):
        logger.error("Embedding contains NaN or Inf values.")
        return False

    return True


def normalize_embedding(embedding: List[float]) -> List[float]:
    """Normalize an embedding to unit length."""
    arr = np.array(embedding)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return embedding
    return list(arr / norm)


def average_embeddings(embeddings: List[List[float]]) -> List[float]:
    """Compute the average of multiple embeddings (useful for document-level embeddings)."""
    if not embeddings:
        raise ValueError("Cannot average empty list of embeddings.")
    arr = np.array(embeddings)
    return list(np.mean(arr, axis=0))


def embedding_statistics(embeddings: List[List[float]]) -> Dict[str, Any]:
    """Compute statistics for a set of embeddings."""
    arr = np.array(embeddings)
    return {
        "count": len(embeddings),
        "dimension": arr.shape[1] if len(arr.shape) > 1 else 0,
        "mean_norm": float(np.mean(np.linalg.norm(arr, axis=1))),
        "std_norm": float(np.std(np.linalg.norm(arr, axis=1))),
        "min_value": float(np.min(arr)),
        "max_value": float(np.max(arr)),
        "mean_value": float(np.mean(arr))
    }
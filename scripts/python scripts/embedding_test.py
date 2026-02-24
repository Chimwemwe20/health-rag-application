"""
Embedding utilities for RAG System.
Handles embedding generation, caching, and similarity calculations.
"""

import os
import hashlib
import numpy as np
from typing import List, Optional
import vertexai
# Added TextEmbeddingInput to the imports
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
from google.cloud import firestore
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
PROJECT_ID = os.getenv("PROJECT_ID", "health-lifeline-53fb3")
LOCATION = os.getenv("REGION", "us-central1") 
EMBEDDING_MODEL_NAME = "text-embedding-004"
EMBEDDING_DIMENSION = 768
BATCH_SIZE = 20

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

try:
    firestore_client = firestore.Client(project=PROJECT_ID)
except Exception:
    logger.warning("Firestore client could not initialize. Caching disabled.")
    firestore_client = None

# ─────────────────────────────────────────────
# Core Embedding Generation
# ─────────────────────────────────────────────

def generate_embeddings(
    texts: List[str],
    task_type: str = "RETRIEVAL_DOCUMENT"
) -> List[List[float]]:
    if not texts: return []
    
    model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL_NAME)
    
    # FIX: Wrap strings in TextEmbeddingInput objects
    inputs = [TextEmbeddingInput(text=t, task_type=task_type) for t in texts]
    
    # Now call get_embeddings with the objects
    embeddings = model.get_embeddings(inputs)
    return [list(emb.values) for emb in embeddings]

def generate_query_embedding(query: str) -> List[float]:
    model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL_NAME)
    
    # FIX: Wrap the query string in TextEmbeddingInput
    input_obj = TextEmbeddingInput(text=query, task_type="RETRIEVAL_QUERY")
    
    embeddings = model.get_embeddings([input_obj])
    return list(embeddings[0].values)

# ─────────────────────────────────────────────
# Similarity & Execution
# ─────────────────────────────────────────────

def cosine_similarity(a: List[float], b: List[float]) -> float:
    a, b = np.array(a), np.array(b)
    norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
    return float(np.dot(a, b) / (norm_a * norm_b)) if norm_a and norm_b else 0.0

if __name__ == "__main__":
    print("\n" + "="*40)
    print("🚀 STARTING EMBEDDING TEST")
    print("="*40)
    
    try:
        sample_text = ["Diabetes is a chronic disease characterized by elevated blood glucose."]
        print(f"1. Target Text: '{sample_text[0]}'")
        
        doc_emb = generate_embeddings(sample_text)
        print(f"✅ Document Embedding Generated!")
        
        query = "What is diabetes?"
        print(f"\n2. Query Text: '{query}'")
        query_emb = generate_query_embedding(query)
        print(f"✅ Query Embedding Generated!")
        
        score = cosine_similarity(doc_emb[0], query_emb)
        print(f"\n📊 Cosine Similarity Score: {score:.4f}")
        
    except Exception as e:
        print(f"\n❌ Error during execution: {e}")
    
    print("\n" + "="*40)
    print("🏁 TEST COMPLETE")
    print("="*40)
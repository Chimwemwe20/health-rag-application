"""
Firestore utility functions for RAG System.
Handles all database operations including CRUD, querying, and batch operations.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("PROJECT_ID", "your-project-id")

# Initialize Firestore client
db = firestore.Client(project=PROJECT_ID)

# Collection names — must match firestore.rules and firestore.indexes.json
COLLECTION_HEALTH_CHUNKS = "health_chunks"
COLLECTION_USERS = "users"
COLLECTION_CONVERSATIONS = "conversations"
COLLECTION_QUERY_LOGS = "query_logs"
COLLECTION_ABSTENTION_LOGS = "abstention_logs"
COLLECTION_RATE_LIMITS = "rate_limits"
COLLECTION_CACHE = "embedding_cache"

# Subcollections
SUBCOLLECTION_MESSAGES = "messages"

MAX_BATCH_SIZE = 500


# ─────────────────────────────────────────────
# Document Operations
# ─────────────────────────────────────────────

def create_document(
    collection: str,
    document_id: str,
    data: Dict[str, Any],
    merge: bool = False
) -> str:
    """Create or overwrite a Firestore document."""
    try:
        data["createdAt"] = firestore.SERVER_TIMESTAMP
        data["updatedAt"] = firestore.SERVER_TIMESTAMP

        doc_ref = db.collection(collection).document(document_id)
        if merge:
            doc_ref.set(data, merge=True)
        else:
            doc_ref.set(data)

        logger.info(f"Document created: {collection}/{document_id}")
        return document_id
    except Exception as e:
        logger.error(f"Failed to create document {collection}/{document_id}: {e}")
        raise


def get_document(
    collection: str,
    document_id: str
) -> Optional[Dict[str, Any]]:
    """Retrieve a single Firestore document."""
    try:
        doc_ref = db.collection(collection).document(document_id)
        doc = doc_ref.get()

        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None
    except Exception as e:
        logger.error(f"Failed to get document {collection}/{document_id}: {e}")
        raise


def update_document(
    collection: str,
    document_id: str,
    data: Dict[str, Any]
) -> None:
    """Update specific fields of a Firestore document."""
    try:
        data["updatedAt"] = firestore.SERVER_TIMESTAMP
        doc_ref = db.collection(collection).document(document_id)
        doc_ref.update(data)
        logger.info(f"Document updated: {collection}/{document_id}")
    except Exception as e:
        logger.error(f"Failed to update document {collection}/{document_id}: {e}")
        raise


def delete_document(
    collection: str,
    document_id: str,
    delete_subcollections: bool = True
) -> None:
    """Delete a Firestore document and optionally its subcollections."""
    try:
        doc_ref = db.collection(collection).document(document_id)

        if delete_subcollections:
            _delete_subcollections(doc_ref)

        doc_ref.delete()
        logger.info(f"Document deleted: {collection}/{document_id}")
    except Exception as e:
        logger.error(f"Failed to delete document {collection}/{document_id}: {e}")
        raise


def document_exists(collection: str, document_id: str) -> bool:
    """Check if a document exists in Firestore."""
    doc_ref = db.collection(collection).document(document_id)
    return doc_ref.get().exists


# ─────────────────────────────────────────────
# health_chunks Operations
# ─────────────────────────────────────────────
#
# health_chunks is a top-level collection (not a subcollection).
# Each chunk is its own document with a deterministic ID: {documentId}_{chunkIndex:05d}
#
# Schema per firestore.rules:
#   text:         string  (chunk text, ≤ 512 tokens)
#   embedding:    vector<768>
#   jurisdiction: string  (e.g. "Zambia")
#   sourceTitle:  string  (source document title)
#   sourceUrl:    string? (URL or GCS path)
#   documentId:   string  (parent document identifier)
#   chunkIndex:   number  (position within parent document)
#   tokenCount:   number  (≤ 512)
#   createdAt:    timestamp

def store_health_chunks(
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]],
    document_id: str,
    source_title: str,
    jurisdiction: str = "Zambia",
    source_url: Optional[str] = None
) -> int:
    """
    Store health chunks and their embeddings in the health_chunks collection.

    Args:
        chunks:       Output from chunking.py (list of chunk dicts).
        embeddings:   Parallel list of 768-dim embedding vectors.
        document_id:  Stable identifier for the parent document (e.g. GCS object name).
        source_title: Human-readable document title (e.g. "Zambia STG Edition 06").
        jurisdiction: Jurisdiction label — defaults to "Zambia".
        source_url:   Optional GCS URI or public URL for the source file.

    Returns:
        Number of chunks stored.
    """
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings must have the same length.")

    batch = db.batch()
    batch_count = 0
    total_stored = 0

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_index = chunk.get("chunk_index", i)
        chunk_doc_id = f"{document_id}_{chunk_index:05d}"
        chunk_ref = db.collection(COLLECTION_HEALTH_CHUNKS).document(chunk_doc_id)

        chunk_data = {
            "text": chunk["text"],
            "embedding": embedding,
            "jurisdiction": jurisdiction,
            "sourceTitle": source_title,
            "sourceUrl": source_url,
            "documentId": document_id,
            "chunkIndex": chunk_index,
            "tokenCount": chunk.get("tokens", chunk.get("token_count", 0)),
            "createdAt": firestore.SERVER_TIMESTAMP,
        }

        batch.set(chunk_ref, chunk_data)
        batch_count += 1
        total_stored += 1

        if batch_count >= MAX_BATCH_SIZE:
            batch.commit()
            logger.info(f"Committed batch of {batch_count} chunks (total: {total_stored})")
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()
        logger.info(f"Committed final batch of {batch_count} chunks (total: {total_stored})")

    return total_stored


def get_chunks_by_document(
    document_id: str,
    include_embeddings: bool = True
) -> List[Dict[str, Any]]:
    """Retrieve all health_chunks for a given documentId, ordered by chunkIndex."""
    try:
        query = (
            db.collection(COLLECTION_HEALTH_CHUNKS)
            .where(filter=FieldFilter("documentId", "==", document_id))
            .order_by("chunkIndex")
        )
        docs = query.stream()

        chunks = []
        for doc in docs:
            data = doc.to_dict()
            if not include_embeddings:
                data.pop("embedding", None)
            chunks.append({"id": doc.id, **data})

        return chunks
    except Exception as e:
        logger.error(f"Failed to get chunks for documentId={document_id}: {e}")
        raise


def get_chunks_by_document_paginated(
    document_id: str,
    page_size: int = 100,
    start_after_index: Optional[int] = None
) -> Tuple[List[Dict[str, Any]], Optional[int]]:
    """
    Retrieve health_chunks for a document with pagination.

    Returns:
        (chunks, next_chunk_index) — next_chunk_index is None when on the last page.
    """
    try:
        query = (
            db.collection(COLLECTION_HEALTH_CHUNKS)
            .where(filter=FieldFilter("documentId", "==", document_id))
            .order_by("chunkIndex")
            .limit(page_size)
        )

        if start_after_index is not None:
            query = query.where(filter=FieldFilter("chunkIndex", ">", start_after_index))

        docs = list(query.stream())
        chunks = [{"id": doc.id, **doc.to_dict()} for doc in docs]

        next_index = chunks[-1]["chunkIndex"] if len(chunks) == page_size else None
        return chunks, next_index
    except Exception as e:
        logger.error(f"Failed to paginate chunks for documentId={document_id}: {e}")
        raise


def delete_chunks_by_document(document_id: str) -> int:
    """
    Delete all health_chunks belonging to a given documentId.
    Returns the number of chunks deleted.
    """
    query = (
        db.collection(COLLECTION_HEALTH_CHUNKS)
        .where(filter=FieldFilter("documentId", "==", document_id))
    )

    count = 0
    batch = db.batch()
    batch_count = 0

    for doc in query.stream():
        batch.delete(doc.reference)
        batch_count += 1
        count += 1

        if batch_count >= MAX_BATCH_SIZE:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()

    logger.info(f"Deleted {count} chunks for documentId={document_id}")
    return count


def get_chunk_count_for_document(document_id: str) -> int:
    """Return the number of health_chunks stored for a given documentId."""
    query = (
        db.collection(COLLECTION_HEALTH_CHUNKS)
        .where(filter=FieldFilter("documentId", "==", document_id))
    )
    return sum(1 for _ in query.stream())


def document_already_ingested(document_id: str) -> bool:
    """Check if any health_chunks exist for a given documentId."""
    return get_chunk_count_for_document(document_id) > 0


# ─────────────────────────────────────────────
# Audit Log Operations
# ─────────────────────────────────────────────

def log_query(
    uid: str,
    query: str,
    similarity_score: Optional[float],
    top_chunk_ids: List[str],
    abstained: bool,
    emergency_triggered: bool
) -> str:
    """Write an entry to query_logs. Returns the new document ID."""
    doc_ref = db.collection(COLLECTION_QUERY_LOGS).document()
    doc_ref.set({
        "uid": uid,
        "query": query,
        "similarityScore": similarity_score,
        "topChunkIds": top_chunk_ids,
        "abstained": abstained,
        "emergencyTriggered": emergency_triggered,
        "timestamp": firestore.SERVER_TIMESTAMP,
    })
    logger.info(f"Query logged: {doc_ref.id}")
    return doc_ref.id


def log_abstention(
    uid: str,
    query: str,
    reason: str,
    max_similarity: Optional[float]
) -> str:
    """
    Write an entry to abstention_logs.

    Args:
        reason: One of 'no_documents', 'low_similarity', 'emergency'.

    Returns:
        The new document ID.
    """
    valid_reasons = {"no_documents", "low_similarity", "emergency"}
    if reason not in valid_reasons:
        raise ValueError(f"reason must be one of {valid_reasons}, got '{reason}'")

    doc_ref = db.collection(COLLECTION_ABSTENTION_LOGS).document()
    doc_ref.set({
        "uid": uid,
        "query": query,
        "reason": reason,
        "maxSimilarity": max_similarity,
        "timestamp": firestore.SERVER_TIMESTAMP,
    })
    logger.info(f"Abstention logged: {doc_ref.id} (reason={reason})")
    return doc_ref.id


# ─────────────────────────────────────────────
# Query Operations
# ─────────────────────────────────────────────

def query_collection(
    collection: str,
    filters: Optional[List[Dict[str, Any]]] = None,
    order_by: Optional[str] = None,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Query a Firestore collection with optional filters, ordering, and limit.

    filters format: [{"field": "status", "op": "==", "value": "processed"}]
    """
    try:
        query = db.collection(collection)

        if filters:
            for f in filters:
                query = query.where(
                    filter=FieldFilter(f["field"], f["op"], f["value"])
                )

        if order_by:
            query = query.order_by(order_by)

        if limit:
            query = query.limit(limit)

        docs = query.stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        logger.error(f"Failed to query collection {collection}: {e}")
        raise


def get_user_conversations(
    uid: str,
    include_deleted: bool = False,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get all conversations for a user, ordered by updatedAt descending."""
    filters = [{"field": "uid", "op": "==", "value": uid}]
    if not include_deleted:
        filters.append({"field": "deletedAt", "op": "==", "value": None})
    return query_collection(
        COLLECTION_CONVERSATIONS,
        filters=filters,
        order_by="updatedAt",
        limit=limit
    )


def get_conversation_messages(
    conversation_id: str,
    include_deleted: bool = False
) -> List[Dict[str, Any]]:
    """Get all messages for a conversation, ordered by createdAt ascending."""
    try:
        query = (
            db.collection(COLLECTION_CONVERSATIONS)
            .document(conversation_id)
            .collection(SUBCOLLECTION_MESSAGES)
            .order_by("createdAt")
        )
        if not include_deleted:
            query = query.where(filter=FieldFilter("deletedAt", "==", None))

        return [{"id": doc.id, **doc.to_dict()} for doc in query.stream()]
    except Exception as e:
        logger.error(f"Failed to get messages for conversation {conversation_id}: {e}")
        raise


def get_query_logs_for_user(uid: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get query log entries for a specific user, most recent first."""
    return query_collection(
        COLLECTION_QUERY_LOGS,
        filters=[{"field": "uid", "op": "==", "value": uid}],
        order_by="timestamp",
        limit=limit
    )


def get_abstention_logs_by_reason(
    reason: str,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get abstention log entries filtered by reason."""
    return query_collection(
        COLLECTION_ABSTENTION_LOGS,
        filters=[{"field": "reason", "op": "==", "value": reason}],
        order_by="timestamp",
        limit=limit
    )


# ─────────────────────────────────────────────
# Bulk Operations
# ─────────────────────────────────────────────

def bulk_delete_collection(collection: str, dry_run: bool = False) -> int:
    """
    Delete all documents in a collection.
    Use dry_run=True to count documents without deleting.
    """
    docs = db.collection(collection).stream()
    count = 0
    batch = db.batch()
    batch_count = 0

    for doc in docs:
        if not dry_run:
            batch.delete(doc.reference)
            batch_count += 1
        count += 1

        if batch_count >= MAX_BATCH_SIZE:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0 and not dry_run:
        batch.commit()

    action = "Would delete" if dry_run else "Deleted"
    logger.info(f"{action} {count} documents from {collection}")
    return count


def export_collection_to_dict(collection: str) -> Dict[str, Any]:
    """Export entire collection as a Python dictionary."""
    docs = db.collection(collection).stream()
    return {doc.id: doc.to_dict() for doc in docs}


def import_documents_from_dict(
    collection: str,
    data: Dict[str, Any],
    overwrite: bool = False
) -> int:
    """Import documents into Firestore from a dictionary."""
    batch = db.batch()
    batch_count = 0
    total = 0

    for doc_id, doc_data in data.items():
        doc_ref = db.collection(collection).document(doc_id)

        if not overwrite and doc_ref.get().exists:
            logger.warning(f"Skipping existing document: {collection}/{doc_id}")
            continue

        batch.set(doc_ref, doc_data)
        batch_count += 1
        total += 1

        if batch_count >= MAX_BATCH_SIZE:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()

    logger.info(f"Imported {total} documents into {collection}")
    return total


# ─────────────────────────────────────────────
# Stats & Monitoring
# ─────────────────────────────────────────────

def get_collection_stats(collection: str) -> Dict[str, Any]:
    """Get basic stats about a collection."""
    docs = list(db.collection(collection).stream())
    return {
        "collection": collection,
        "documentCount": len(docs),
        "documentIds": [doc.id for doc in docs]
    }


def get_health_chunks_stats() -> Dict[str, Any]:
    """Get stats about the health_chunks corpus grouped by documentId."""
    docs = list(db.collection(COLLECTION_HEALTH_CHUNKS).stream())
    by_document: Dict[str, int] = {}

    for doc in docs:
        doc_id = doc.to_dict().get("documentId", "unknown")
        by_document[doc_id] = by_document.get(doc_id, 0) + 1

    return {
        "totalChunks": len(docs),
        "documentCount": len(by_document),
        "chunksByDocument": by_document,
    }


# ─────────────────────────────────────────────
# Internal Helpers
# ─────────────────────────────────────────────

def _delete_subcollections(doc_ref) -> None:
    """Recursively delete all subcollections of a document."""
    for subcollection in doc_ref.collections():
        for doc in subcollection.stream():
            _delete_subcollections(doc.reference)
            doc.reference.delete()

"""
Google Cloud Storage utility functions for RAG System.
Handles uploading, downloading, listing, and managing files in GCS.
"""

import os
import io
import logging
from typing import List, Dict, Any, Optional, BinaryIO, Tuple
from pathlib import Path
from datetime import timedelta
from google.cloud import storage
from google.cloud.storage import Blob, Bucket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("PROJECT_ID", "your-project-id")
DEFAULT_BUCKET = f"{PROJECT_ID}-documents"
DEFAULT_REGION = "us-central1"

# Initialize GCS client
storage_client = storage.Client(project=PROJECT_ID)


# ─────────────────────────────────────────────
# Bucket Operations
# ─────────────────────────────────────────────

def create_bucket(
    bucket_name: str,
    location: str = DEFAULT_REGION,
    storage_class: str = "STANDARD",
    uniform_access: bool = True
) -> Bucket:
    """Create a new GCS bucket."""
    try:
        bucket = storage_client.bucket(bucket_name)
        bucket.storage_class = storage_class
        new_bucket = storage_client.create_bucket(bucket, location=location)

        if uniform_access:
            new_bucket.iam_configuration.uniform_bucket_level_access_enabled = True
            new_bucket.patch()

        logger.info(f"Bucket created: gs://{bucket_name}")
        return new_bucket
    except Exception as e:
        logger.error(f"Failed to create bucket {bucket_name}: {e}")
        raise


def get_bucket(bucket_name: str = DEFAULT_BUCKET) -> Bucket:
    """Get a GCS bucket reference."""
    return storage_client.bucket(bucket_name)


def bucket_exists(bucket_name: str) -> bool:
    """Check if a GCS bucket exists."""
    try:
        storage_client.get_bucket(bucket_name)
        return True
    except Exception:
        return False


def delete_bucket(bucket_name: str, force: bool = False) -> None:
    """Delete a GCS bucket. Use force=True to delete non-empty buckets."""
    bucket = storage_client.bucket(bucket_name)
    bucket.delete(force=force)
    logger.info(f"Bucket deleted: gs://{bucket_name}")


# ─────────────────────────────────────────────
# File Upload Operations
# ─────────────────────────────────────────────

def upload_file(
    local_path: str,
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET,
    content_type: Optional[str] = None,
    metadata: Optional[Dict[str, str]] = None
) -> str:
    """
    Upload a local file to GCS.
    Returns the full GCS URI.
    """
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_path)

        if metadata:
            blob.metadata = metadata

        blob.upload_from_filename(
            local_path,
            content_type=content_type or _infer_content_type(local_path)
        )

        uri = f"gs://{bucket_name}/{gcs_path}"
        logger.info(f"Uploaded: {local_path} → {uri}")
        return uri
    except Exception as e:
        logger.error(f"Failed to upload {local_path}: {e}")
        raise


def upload_bytes(
    data: bytes,
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET,
    content_type: str = "application/octet-stream",
    metadata: Optional[Dict[str, str]] = None
) -> str:
    """
    Upload bytes directly to GCS.
    Returns the full GCS URI.
    """
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_path)

        if metadata:
            blob.metadata = metadata

        blob.upload_from_string(data, content_type=content_type)

        uri = f"gs://{bucket_name}/{gcs_path}"
        logger.info(f"Uploaded bytes to: {uri}")
        return uri
    except Exception as e:
        logger.error(f"Failed to upload bytes to {gcs_path}: {e}")
        raise


def upload_stream(
    stream: BinaryIO,
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET,
    content_type: str = "application/octet-stream"
) -> str:
    """Upload a file-like stream to GCS."""
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_path)
        blob.upload_from_file(stream, content_type=content_type)

        uri = f"gs://{bucket_name}/{gcs_path}"
        logger.info(f"Uploaded stream to: {uri}")
        return uri
    except Exception as e:
        logger.error(f"Failed to upload stream to {gcs_path}: {e}")
        raise


def upload_directory(
    local_dir: str,
    gcs_prefix: str,
    bucket_name: str = DEFAULT_BUCKET,
    file_extensions: Optional[List[str]] = None
) -> List[str]:
    """
    Upload all files in a local directory to GCS.
    Optionally filter by file extensions (e.g., ['.pdf', '.txt']).
    Returns list of uploaded GCS URIs.
    """
    uploaded = []
    local_path = Path(local_dir)

    for file_path in local_path.rglob("*"):
        if not file_path.is_file():
            continue

        if file_extensions and file_path.suffix.lower() not in file_extensions:
            continue

        relative_path = file_path.relative_to(local_path)
        gcs_path = f"{gcs_prefix}/{relative_path}".replace("\\", "/")

        uri = upload_file(str(file_path), gcs_path, bucket_name)
        uploaded.append(uri)

    logger.info(f"Uploaded {len(uploaded)} files from {local_dir}")
    return uploaded


# ─────────────────────────────────────────────
# File Download Operations
# ─────────────────────────────────────────────

def download_file(
    gcs_path: str,
    local_path: str,
    bucket_name: str = DEFAULT_BUCKET
) -> str:
    """Download a file from GCS to local filesystem."""
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_path)

        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        blob.download_to_filename(local_path)

        logger.info(f"Downloaded: gs://{bucket_name}/{gcs_path} → {local_path}")
        return local_path
    except Exception as e:
        logger.error(f"Failed to download {gcs_path}: {e}")
        raise


def download_as_bytes(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET
) -> bytes:
    """Download a file from GCS as bytes."""
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_path)
        return blob.download_as_bytes()
    except Exception as e:
        logger.error(f"Failed to download bytes from {gcs_path}: {e}")
        raise


def download_as_text(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET,
    encoding: str = "utf-8"
) -> str:
    """Download a text file from GCS."""
    data = download_as_bytes(gcs_path, bucket_name)
    return data.decode(encoding)


def stream_large_file(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET,
    chunk_size: int = 8 * 1024 * 1024  # 8MB chunks
) -> io.BytesIO:
    """Stream a large file from GCS into a BytesIO object."""
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    buffer = io.BytesIO()
    blob.download_to_file(buffer)
    buffer.seek(0)
    return buffer


# ─────────────────────────────────────────────
# File Management
# ─────────────────────────────────────────────

def list_files(
    bucket_name: str = DEFAULT_BUCKET,
    prefix: Optional[str] = None,
    delimiter: Optional[str] = None,
    extensions: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    List files in a GCS bucket with optional prefix and extension filtering.
    Returns list of file metadata dicts.
    """
    try:
        blobs = storage_client.list_blobs(
            bucket_name,
            prefix=prefix,
            delimiter=delimiter
        )

        files = []
        for blob in blobs:
            if blob.name.endswith("/"):
                continue  # Skip directory markers

            if extensions:
                ext = Path(blob.name).suffix.lower()
                if ext not in extensions:
                    continue

            files.append({
                "name": blob.name,
                "size": blob.size,
                "content_type": blob.content_type,
                "updated": blob.updated,
                "created": blob.time_created,
                "uri": f"gs://{bucket_name}/{blob.name}",
                "metadata": blob.metadata or {}
            })

        return files
    except Exception as e:
        logger.error(f"Failed to list files in {bucket_name}: {e}")
        raise


def file_exists(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET
) -> bool:
    """Check if a file exists in GCS."""
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    return blob.exists()


def delete_file(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET
) -> None:
    """Delete a file from GCS."""
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_path)
        blob.delete()
        logger.info(f"Deleted: gs://{bucket_name}/{gcs_path}")
    except Exception as e:
        logger.error(f"Failed to delete {gcs_path}: {e}")
        raise


def delete_files_by_prefix(
    prefix: str,
    bucket_name: str = DEFAULT_BUCKET
) -> int:
    """Delete all files with a given prefix. Returns count deleted."""
    blobs = list(storage_client.list_blobs(bucket_name, prefix=prefix))
    bucket = storage_client.bucket(bucket_name)
    bucket.delete_blobs(blobs)
    logger.info(f"Deleted {len(blobs)} files with prefix: {prefix}")
    return len(blobs)


def copy_file(
    source_path: str,
    dest_path: str,
    source_bucket: str = DEFAULT_BUCKET,
    dest_bucket: Optional[str] = None
) -> str:
    """Copy a file within or between GCS buckets."""
    try:
        dest_bucket = dest_bucket or source_bucket
        src_bucket = storage_client.bucket(source_bucket)
        dst_bucket = storage_client.bucket(dest_bucket)

        src_blob = src_bucket.blob(source_path)
        src_bucket.copy_blob(src_blob, dst_bucket, dest_path)

        uri = f"gs://{dest_bucket}/{dest_path}"
        logger.info(f"Copied: gs://{source_bucket}/{source_path} → {uri}")
        return uri
    except Exception as e:
        logger.error(f"Failed to copy file: {e}")
        raise


def move_file(
    source_path: str,
    dest_path: str,
    source_bucket: str = DEFAULT_BUCKET,
    dest_bucket: Optional[str] = None
) -> str:
    """Move a file by copying then deleting the source."""
    uri = copy_file(source_path, dest_path, source_bucket, dest_bucket)
    delete_file(source_path, source_bucket)
    return uri


def get_file_metadata(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET
) -> Dict[str, Any]:
    """Get metadata for a GCS file."""
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    blob.reload()

    return {
        "name": blob.name,
        "bucket": bucket_name,
        "uri": f"gs://{bucket_name}/{gcs_path}",
        "size": blob.size,
        "content_type": blob.content_type,
        "created": blob.time_created,
        "updated": blob.updated,
        "etag": blob.etag,
        "md5_hash": blob.md5_hash,
        "metadata": blob.metadata or {}
    }


def update_file_metadata(
    gcs_path: str,
    metadata: Dict[str, str],
    bucket_name: str = DEFAULT_BUCKET
) -> None:
    """Update custom metadata on a GCS file."""
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    blob.metadata = metadata
    blob.patch()
    logger.info(f"Updated metadata for: gs://{bucket_name}/{gcs_path}")


# ─────────────────────────────────────────────
# Signed URLs & Access
# ─────────────────────────────────────────────

def generate_signed_url(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET,
    expiration_minutes: int = 60,
    method: str = "GET"
) -> str:
    """
    Generate a signed URL for temporary file access.
    Useful for giving frontend apps direct access to files.
    """
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)

    url = blob.generate_signed_url(
        expiration=timedelta(minutes=expiration_minutes),
        method=method,
        version="v4"
    )

    logger.info(f"Generated signed URL for: gs://{bucket_name}/{gcs_path}")
    return url


def make_file_public(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET
) -> str:
    """Make a file publicly accessible and return its public URL."""
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)
    blob.make_public()

    public_url = blob.public_url
    logger.info(f"Made public: {public_url}")
    return public_url


# ─────────────────────────────────────────────
# PDF-Specific Helpers
# ─────────────────────────────────────────────

def download_pdf_bytes(
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET
) -> bytes:
    """Download a PDF from GCS as bytes (alias for clarity)."""
    return download_as_bytes(gcs_path, bucket_name)


def list_pdfs(
    bucket_name: str = DEFAULT_BUCKET,
    prefix: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List all PDF files in a bucket."""
    return list_files(bucket_name, prefix=prefix, extensions=[".pdf"])


def upload_pdf(
    local_path: str,
    gcs_path: str,
    bucket_name: str = DEFAULT_BUCKET,
    metadata: Optional[Dict[str, str]] = None
) -> str:
    """Upload a PDF file to GCS."""
    return upload_file(
        local_path, gcs_path, bucket_name,
        content_type="application/pdf",
        metadata=metadata
    )


# ─────────────────────────────────────────────
# Internal Helpers
# ─────────────────────────────────────────────

def _infer_content_type(file_path: str) -> str:
    """Infer content type from file extension."""
    ext = Path(file_path).suffix.lower()
    content_types = {
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".json": "application/json",
        ".csv": "text/csv",
        ".html": "text/html",
        ".xml": "application/xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".zip": "application/zip",
    }
    return content_types.get(ext, "application/octet-stream")
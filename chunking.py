"""
Text chunking strategies for RAG System.
Provides multiple chunking methods for different document types.
"""

import re
import os
import logging
from typing import List, Dict, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default chunking config
DEFAULT_MAX_TOKENS = 500
DEFAULT_OVERLAP_TOKENS = 50
DEFAULT_MIN_CHUNK_TOKENS = 50


# ─────────────────────────────────────────────
# Token Estimation
# ─────────────────────────────────────────────

def estimate_tokens(text: str) -> int:
    """
    Estimate token count for a string.
    Uses word count as a rough proxy (1 token ≈ 0.75 words).
    """
    words = len(text.split())
    return int(words / 0.75)


def count_words(text: str) -> int:
    """Count words in a text string."""
    return len(text.split())


# ─────────────────────────────────────────────
# Chunking Strategies
# ─────────────────────────────────────────────

def chunk_by_sentences(
    text_items: List[Dict[str, Any]],
    max_tokens: int = DEFAULT_MAX_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
    min_chunk_tokens: int = DEFAULT_MIN_CHUNK_TOKENS
) -> List[Dict[str, Any]]:
    """
    Chunk text by sentences with token-based size control and overlap.
    Best for: General documents, articles, reports.
    """
    chunks = []

    for item in text_items:
        text = item["text"]
        page = item["page"]
        metadata = item.get("metadata", {})

        # Split into sentences
        sentences = _split_into_sentences(text)
        current_chunk_sentences = []
        current_tokens = 0

        for sentence in sentences:
            sentence_tokens = estimate_tokens(sentence)

            if current_tokens + sentence_tokens > max_tokens and current_chunk_sentences:
                chunk_text = " ".join(current_chunk_sentences).strip()

                if estimate_tokens(chunk_text) >= min_chunk_tokens:
                    chunks.append(_build_chunk(chunk_text, page, metadata, len(chunks)))

                # Overlap: keep last N sentences
                overlap_sentences = _get_overlap_sentences(
                    current_chunk_sentences, overlap_tokens
                )
                current_chunk_sentences = overlap_sentences + [sentence]
                current_tokens = sum(estimate_tokens(s) for s in current_chunk_sentences)
            else:
                current_chunk_sentences.append(sentence)
                current_tokens += sentence_tokens

        # Add remaining text as final chunk
        if current_chunk_sentences:
            chunk_text = " ".join(current_chunk_sentences).strip()
            if estimate_tokens(chunk_text) >= min_chunk_tokens:
                chunks.append(_build_chunk(chunk_text, page, metadata, len(chunks)))

    return chunks


def chunk_by_paragraphs(
    text_items: List[Dict[str, Any]],
    max_tokens: int = DEFAULT_MAX_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
    min_chunk_tokens: int = DEFAULT_MIN_CHUNK_TOKENS
) -> List[Dict[str, Any]]:
    """
    Chunk text by paragraphs, merging small ones together.
    Best for: Documents with clear paragraph structure.
    """
    chunks = []

    for item in text_items:
        text = item["text"]
        page = item["page"]
        metadata = item.get("metadata", {})

        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        current_paragraphs = []
        current_tokens = 0

        for paragraph in paragraphs:
            para_tokens = estimate_tokens(paragraph)

            # If a single paragraph exceeds max, split it by sentences
            if para_tokens > max_tokens:
                if current_paragraphs:
                    chunk_text = "\n\n".join(current_paragraphs)
                    if estimate_tokens(chunk_text) >= min_chunk_tokens:
                        chunks.append(_build_chunk(chunk_text, page, metadata, len(chunks)))
                    current_paragraphs = []
                    current_tokens = 0

                # Recursively chunk the oversized paragraph by sentences
                sub_items = [{"text": paragraph, "page": page, "metadata": metadata}]
                sub_chunks = chunk_by_sentences(sub_items, max_tokens, overlap_tokens)
                chunks.extend(sub_chunks)
                continue

            if current_tokens + para_tokens > max_tokens and current_paragraphs:
                chunk_text = "\n\n".join(current_paragraphs)
                if estimate_tokens(chunk_text) >= min_chunk_tokens:
                    chunks.append(_build_chunk(chunk_text, page, metadata, len(chunks)))

                # Overlap: keep last paragraph
                current_paragraphs = [current_paragraphs[-1], paragraph]
                current_tokens = estimate_tokens(current_paragraphs[0]) + para_tokens
            else:
                current_paragraphs.append(paragraph)
                current_tokens += para_tokens

        if current_paragraphs:
            chunk_text = "\n\n".join(current_paragraphs)
            if estimate_tokens(chunk_text) >= min_chunk_tokens:
                chunks.append(_build_chunk(chunk_text, page, metadata, len(chunks)))

    return chunks


def chunk_by_fixed_size(
    text_items: List[Dict[str, Any]],
    chunk_size: int = DEFAULT_MAX_TOKENS,
    overlap: int = DEFAULT_OVERLAP_TOKENS
) -> List[Dict[str, Any]]:
    """
    Chunk text into fixed-size word windows with overlap.
    Best for: Dense technical documents where structure matters less.
    """
    chunks = []

    for item in text_items:
        text = item["text"]
        page = item["page"]
        metadata = item.get("metadata", {})

        words = text.split()
        step = chunk_size - overlap

        for start in range(0, len(words), step):
            end = start + chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words).strip()

            if chunk_text:
                chunks.append(_build_chunk(chunk_text, page, metadata, len(chunks)))

    return chunks


def chunk_by_semantic_sections(
    text_items: List[Dict[str, Any]],
    max_tokens: int = DEFAULT_MAX_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS
) -> List[Dict[str, Any]]:
    """
    Chunk text by detecting semantic section headers.
    Best for: Structured documents with headings (policies, frameworks, manuals).
    """
    chunks = []
    section_pattern = re.compile(
        r'^(#{1,6}\s+.+|[A-Z][A-Z\s]{3,50}:?\s*$|\d+\.\s+[A-Z].+)',
        re.MULTILINE
    )

    for item in text_items:
        text = item["text"]
        page = item["page"]
        metadata = item.get("metadata", {})

        # Split by section headers
        sections = section_pattern.split(text)
        sections = [s.strip() for s in sections if s.strip()]

        current_section = ""
        current_tokens = 0

        for section in sections:
            section_tokens = estimate_tokens(section)

            if current_tokens + section_tokens > max_tokens and current_section:
                chunks.append(_build_chunk(current_section, page, metadata, len(chunks)))

                # Overlap
                overlap_text = _get_text_overlap(current_section, overlap_tokens)
                current_section = overlap_text + " " + section
                current_tokens = estimate_tokens(current_section)
            else:
                current_section += " " + section if current_section else section
                current_tokens += section_tokens

        if current_section.strip():
            chunks.append(_build_chunk(current_section.strip(), page, metadata, len(chunks)))

    return chunks


def chunk_by_markdown_headers(
    text_items: List[Dict[str, Any]],
    max_tokens: int = DEFAULT_MAX_TOKENS
) -> List[Dict[str, Any]]:
    """
    Chunk markdown documents by header hierarchy.
    Best for: Markdown files, documentation, README files.
    """
    chunks = []
    header_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)

    for item in text_items:
        text = item["text"]
        page = item["page"]
        metadata = item.get("metadata", {})

        # Split text at headers
        parts = header_pattern.split(text)
        i = 0
        current_header = ""
        current_content = ""

        while i < len(parts):
            part = parts[i]
            if header_pattern.match(part) or (i > 0 and re.match(r'^#{1,6}$', parts[i - 1] if i > 0 else "")):
                if current_content.strip():
                    full_text = f"{current_header}\n{current_content}".strip()
                    if estimate_tokens(full_text) > max_tokens:
                        # Further split oversized sections
                        sub_items = [{"text": full_text, "page": page, "metadata": metadata}]
                        sub_chunks = chunk_by_sentences(sub_items, max_tokens)
                        chunks.extend(sub_chunks)
                    else:
                        chunks.append(_build_chunk(full_text, page, metadata, len(chunks)))

                current_header = part
                current_content = ""
            else:
                current_content += part
            i += 1

        if current_content.strip():
            full_text = f"{current_header}\n{current_content}".strip()
            chunks.append(_build_chunk(full_text, page, metadata, len(chunks)))

    return chunks


# ─────────────────────────────────────────────
# Chunk Post-Processing
# ─────────────────────────────────────────────

def deduplicate_chunks(chunks: List[Dict[str, Any]], similarity_threshold: float = 0.95) -> List[Dict[str, Any]]:
    """
    Remove near-duplicate chunks based on text similarity.
    Uses simple Jaccard similarity for efficiency.
    """
    unique_chunks = []
    seen_sets = []

    for chunk in chunks:
        words = set(chunk["text"].lower().split())
        is_duplicate = False

        for seen in seen_sets:
            intersection = words & seen
            union = words | seen
            jaccard = len(intersection) / len(union) if union else 0

            if jaccard >= similarity_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            unique_chunks.append(chunk)
            seen_sets.append(words)

    logger.info(f"Deduplicated: {len(chunks)} → {len(unique_chunks)} chunks")
    return unique_chunks


def filter_short_chunks(
    chunks: List[Dict[str, Any]],
    min_tokens: int = DEFAULT_MIN_CHUNK_TOKENS
) -> List[Dict[str, Any]]:
    """Remove chunks that are too short to be meaningful."""
    filtered = [c for c in chunks if estimate_tokens(c["text"]) >= min_tokens]
    logger.info(f"Filtered short chunks: {len(chunks)} → {len(filtered)} chunks")
    return filtered


def clean_chunk_text(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Clean and normalize chunk text."""
    cleaned = []
    for chunk in chunks:
        text = chunk["text"]

        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        # Remove non-printable characters
        text = re.sub(r'[^\x20-\x7E\n]', '', text)

        # Remove repeated punctuation
        text = re.sub(r'([.!?])\1+', r'\1', text)

        if text:
            cleaned.append({**chunk, "text": text})

    return cleaned


def add_chunk_metadata(
    chunks: List[Dict[str, Any]],
    document_name: str,
    collection_name: str,
    source_url: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Enrich chunks with additional metadata."""
    enriched = []
    for i, chunk in enumerate(chunks):
        enriched.append({
            **chunk,
            "chunk_index": i,
            "total_chunks": len(chunks),
            "document_name": document_name,
            "collection_name": collection_name,
            "source_url": source_url,
            "token_count": estimate_tokens(chunk["text"]),
            "word_count": count_words(chunk["text"]),
            "char_count": len(chunk["text"])
        })
    return enriched


# ─────────────────────────────────────────────
# Strategy Selector
# ─────────────────────────────────────────────

def auto_chunk(
    text_items: List[Dict[str, Any]],
    strategy: str = "sentences",
    max_tokens: int = DEFAULT_MAX_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS
) -> List[Dict[str, Any]]:
    """
    Automatically chunk using the specified strategy.

    Strategies:
        - 'sentences': Sentence-based chunking (default)
        - 'paragraphs': Paragraph-based chunking
        - 'fixed': Fixed-size window chunking
        - 'semantic': Semantic section detection
        - 'markdown': Markdown header-based chunking
    """
    strategy_map = {
        "sentences": lambda: chunk_by_sentences(text_items, max_tokens, overlap_tokens),
        "paragraphs": lambda: chunk_by_paragraphs(text_items, max_tokens, overlap_tokens),
        "fixed": lambda: chunk_by_fixed_size(text_items, max_tokens, overlap_tokens),
        "semantic": lambda: chunk_by_semantic_sections(text_items, max_tokens, overlap_tokens),
        "markdown": lambda: chunk_by_markdown_headers(text_items, max_tokens),
    }

    if strategy not in strategy_map:
        raise ValueError(f"Unknown strategy '{strategy}'. Choose from: {list(strategy_map.keys())}")

    chunks = strategy_map[strategy]()
    chunks = clean_chunk_text(chunks)
    chunks = filter_short_chunks(chunks)
    return chunks


# ─────────────────────────────────────────────
# Internal Helpers
# ─────────────────────────────────────────────

def _split_into_sentences(text: str) -> List[str]:
    """Split text into sentences using regex."""
    sentence_endings = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')
    sentences = sentence_endings.split(text)
    return [s.strip() for s in sentences if s.strip()]


def _get_overlap_sentences(sentences: List[str], overlap_tokens: int) -> List[str]:
    """Get the last N sentences that fit within overlap_tokens."""
    overlap = []
    tokens = 0
    for sentence in reversed(sentences):
        t = estimate_tokens(sentence)
        if tokens + t > overlap_tokens:
            break
        overlap.insert(0, sentence)
        tokens += t
    return overlap


def _get_text_overlap(text: str, overlap_tokens: int) -> str:
    """Get the last portion of text within overlap_tokens."""
    words = text.split()
    overlap_words = []
    tokens = 0
    for word in reversed(words):
        if tokens >= overlap_tokens:
            break
        overlap_words.insert(0, word)
        tokens += 1
    return " ".join(overlap_words)


def _build_chunk(
    text: str,
    page: int,
    metadata: Dict[str, Any],
    index: int
) -> Dict[str, Any]:
    """Build a standardized chunk dictionary."""
    return {
        "text": text,
        "page": page,
        "chunk_index": index,
        "tokens": estimate_tokens(text),
        "word_count": count_words(text),
        "char_count": len(text),
        "metadata": metadata
    }
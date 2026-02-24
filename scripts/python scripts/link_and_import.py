import vertexai
from vertexai.preview import rag

vertexai.init(project="health-lifeline-53fb3", location="europe-west2")

# 1. This uses your specific Corpus ID
CORPUS_ID = "projects/538967848417/locations/europe-west2/ragCorpora/7631349568579305472"
BUCKET_URI = "gs://healthlinebucket/Diabetes"

def start_ingestion():
    # Use the variable name here so Python understands it
    print(f"Ingesting data into {CORPUS_ID}...")
    try:
        response = rag.import_files(
            corpus_name=CORPUS_ID,
            paths=[BUCKET_URI],
            transformation_config=rag.TransformationConfig(
                chunking_config=rag.ChunkingConfig(
                    chunk_size=512,      # ✅ 512 Chunk Size added
                    chunk_overlap=60     # ✅ 60 Overlap added
                )
            )
        )
        print(f"SUCCESS! AI has processed {response.imported_rag_files_count} files.")
    except Exception as e:
        print(f"INGESTION ERROR: {e}")

if __name__ == "__main__":
    start_ingestion()
import vertexai
from vertexai.preview import rag

# 1. Configuration
PROJECT_ID = "health-lifeline-53fb3"
LOCATION = "europe-west2" 
# This is the path to your PDFs
GCS_PATH = "gs://healthlinebucket/Diabetes" 
# This is the ID you found!
CORPUS_ID = "7631349568579305472"
CORPUS_NAME = f"projects/{PROJECT_ID}/locations/{LOCATION}/ragCorpora/{CORPUS_ID}"

# 2. Initialize
vertexai.init(project=PROJECT_ID, location=LOCATION)

def sync_bucket_to_rag():
    print(f"🚀 Starting import from {GCS_PATH}...")
    
    try:
        # We trigger the import
        # This handles extraction, chunking, and embedding in the cloud
        response = rag.import_files(
            corpus_name=CORPUS_NAME,
            paths=[GCS_PATH],
            transformation_config=rag.TransformationConfig(
                chunking_config=rag.ChunkingConfig(
                    chunk_size=512,      # Smaller chunks = more precise answers
                    chunk_overlap=100    # Helps keep context between chunks
                )
            )
        )
        print("✅ Import triggered!")
        print(f"Check the status here: {response}")

    except Exception as e:
        print(f"❌ Failed to sync bucket: {e}")

if __name__ == "__main__":
    sync_bucket_to_rag()
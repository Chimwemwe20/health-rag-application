import vertexai
from vertexai.preview import rag

# Initialize project and region
vertexai.init(project="health-lifeline-53fb3", location="europe-west2")

def setup_corpus():
    print("Creating Healthcorp with Vector Search and text-embedding-004...")
    
    # This creates the corpus with the embedding model you requested
    try:
        new_corpus = rag.create_corpus(
            display_name="Healthcorp",
            description="Health corpus for specific diseases",
            # We define the model here; the Vector Search is managed automatically by the RAG Engine
            embedding_model_config=rag.EmbeddingModelConfig(
                publisher_model="projects/health-lifeline-53fb3/locations/europe-west2/publishers/google/models/text-embedding-004"
            )
        )
        print("\n--- NEW CORPUS CREATED ---")
        print(f"Name: {new_corpus.display_name}")
        print(f"FULL ID: {new_corpus.name}")
        print("--------------------------")
    except Exception as e:
        print(f"Error creating corpus: {e}")

if __name__ == "__main__":
    setup_corpus()
from google.cloud import firestore
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput

# Config matches Step 2
db = firestore.Client(project="health-lifeline-53fb3", database="medical-rag-db")

def search_knowledge(question):
    # 1. Convert question to vector
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    input_obj = TextEmbeddingInput(text=question, task_type="RETRIEVAL_QUERY")
    query_vector = list(model.get_embeddings([input_obj])[0].values)
    
    # 2. Query Firestore
    collection = db.collection("medical_knowledge")
    results = collection.find_nearest(
        vector_field="embedding",
        query_vector=firestore.Vector(query_vector),
        distance_measure=firestore.DistanceMeasure.COSINE,
        limit=2
    ).get()
    
    for doc in results:
        print(f"\n[Score: {doc.distance:.4f}] Found: {doc.to_dict()['content']}")

if __name__ == "__main__":
    search_knowledge("What is type 1 diabetes?")
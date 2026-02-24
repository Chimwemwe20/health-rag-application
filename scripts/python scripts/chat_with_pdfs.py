import vertexai
from vertexai.preview import rag
from vertexai.generative_models import GenerativeModel, Tool

# 1. Configuration
PROJECT_ID = "health-lifeline-53fb3"
LOCATION = "europe-west2"
CORPUS_ID = "7631349568579305472"
CORPUS_PATH = f"projects/{PROJECT_ID}/locations/{LOCATION}/ragCorpora/{CORPUS_ID}"

# 2. Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

def ask_diabetes_expert(user_query):
    print(f"🔍 Searching PDFs for: {user_query}")
    
    # Step A: Setup the RAG Retrieval Tool
    rag_retrieval_tool = Tool.from_retrieval(
        retrieval=rag.Retrieval(
            source=rag.VertexRagStore(
                rag_resources=[rag.RagResource(rag_corpus=CORPUS_PATH)],
                similarity_top_k=3, 
            ),
        )
    )

    # Step B: Initialize the LATEST model
    # gemini-2.5-flash is the standard workhorse for RAG in 2026
    model = GenerativeModel("gemini-2.5-flash")
    
    # Step C: Generate Response
    response = model.generate_content(
        user_query,
        tools=[rag_retrieval_tool],
    )

    print(f"\n🤖 AI Response:\n{response.text}")

if __name__ == "__main__":
    query = input("Ask a question about Diabetes: ")
    if query:
        ask_diabetes_expert(query)
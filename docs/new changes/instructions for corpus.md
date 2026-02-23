Project Initialization and API Enabling
Project Selection: Targeted the health-lifeline-53fb3 project for all resources.

Service Activation: Enabled the aiplatform.googleapis.com (Vertex AI) and discoveryengine.googleapis.com (Vertex AI Search) APIs to allow for document indexing and retrieval.

Region Specification: Set the primary location to europe-west2 (London) to ensure your Cloud Functions and RAG engine are in the same region for minimum latency.

RAG Corpus Creation
Defining the Corpus: Created a dedicated RAG Corpus (a managed database for your documents).

Identity Assignment: Generated the unique Resource Name: projects/health-lifeline-53fb3/locations/europe-west2/ragCorpora/7631349568579305472.

Vector Config: Configured the corpus to use Google’s text-embedding models to convert your health PDFs into high-dimensional math (vectors) that Gemini can "understand".

1. Data Ingestion and Indexing
   GCS Integration: Linked the gcs_utils.py logic to pull health PDFs from your Google Cloud Storage buckets.

Chunking Strategy: Used chunking.py to break large medical documents into smaller, meaningful segments (chunks) so the AI doesn't get overwhelmed.

Embedding Generation: Used embeddings.py to process these chunks and store them within the RAG Corpus index.

Firestore Integration
Metadata Storage: Utilized firestore_utils.py to create a mapping in Firestore.

Cross-Referencing: While the raw vectors live in Vertex AI, Firestore keeps track of the "source" information (like filenames or page numbers) so your chat.ts router can return sources: string[] to the user.

1. Security and Access Control (IAM)
   Service Account Setup: Configured the firebase-adminsdk service account to act as the primary bridge.
   Role Alignment: Ensured that the backend has permissions to "Read" from the RAG Corpus and "Predict" using the Gemini models

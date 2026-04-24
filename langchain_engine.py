import os
import uuid
import json
from typing import List, Dict, Any

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
import chromadb

# Initialize the persistent ChromaDB client
CHROMA_PATH = "./chroma_db"
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Initialize the HuggingFace embeddings model
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Get or create the specific collection for our talent pool
collection = chroma_client.get_or_create_collection(
    name="talent_pool",
    metadata={"hnsw:space": "cosine"}  # Cosine similarity is typically best for text embeddings
)

def embed_document(sanitized_text: str, metadata: dict) -> None:
    """
    Chunks the given text using RecursiveCharacterTextSplitter and upserts
    the chunks along with their embeddings into the ChromaDB collection.
    """
    # 1. Chunk the text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=50
    )
    chunks = splitter.split_text(sanitized_text)
    
    if not chunks:
        return
        
    documents = []
    metadatas = []
    ids = []
    
    # Generate a unique base ID for this document
    doc_id = str(uuid.uuid4())
    
    # 2. Prepare data for ChromaDB
    for i, chunk in enumerate(chunks):
        documents.append(chunk)
        # We ensure metadata only contains primitives (str, int, float, bool)
        # Complex objects like nested dicts inside tcfe_metrics must be flattened or converted to strings
        safe_metadata = {}
        for k, v in metadata.items():
            if isinstance(v, (str, int, float, bool)):
                safe_metadata[k] = v
            else:
                safe_metadata[k] = json.dumps(v)
                
        safe_metadata["chunk_index"] = i
        safe_metadata["doc_id"] = doc_id
        metadatas.append(safe_metadata)
        
        ids.append(f"{doc_id}-chunk-{i}")
        
    # 3. Embed the chunks
    embeddings = embeddings_model.embed_documents(documents)
    
    # 4. Upsert into ChromaDB
    collection.upsert(
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )

def score_candidates(job_description: str, k: int = 5) -> List[Dict[str, Any]]:
    """
    Embeds the job description, retrieves the top k similar chunks from ChromaDB,
    aggregates them by candidate, and scores them using an OpenAI LLM based on a rubric.
    """
    # Check if OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("WARNING: OPENAI_API_KEY environment variable is not set. LLM scoring will fail.")
        
    # 1. Embed the Job Description
    jd_embedding = embeddings_model.embed_query(job_description)
    
    # 2. Similarity Search in ChromaDB
    results = collection.query(
        query_embeddings=[jd_embedding],
        n_results=k,
        include=["documents", "metadatas"]
    )
    
    if not results["documents"] or not results["documents"][0]:
        return []
        
    retrieved_docs = results["documents"][0]
    retrieved_metadatas = results["metadatas"][0]
    
    # 3. Group retrieved chunks by candidate (using github_url or doc_id as unique identifier)
    candidates_data = {}
    for doc, meta in zip(retrieved_docs, retrieved_metadatas):
        cand_id = meta.get("github_url") or meta.get("doc_id", str(uuid.uuid4()))
        if cand_id not in candidates_data:
            candidates_data[cand_id] = {
                "metadata": meta,
                "chunks": []
            }
        candidates_data[cand_id]["chunks"].append(doc)
        
    # 4. Initialize LLM and Prompt
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
    
    prompt = PromptTemplate.from_template("""
    You are an expert technical recruiter scoring a candidate based on the following Job Description.
    
    JOB DESCRIPTION:
    {job_description}
    
    CANDIDATE METADATA (Includes GitHub TCFE metrics if available):
    {metadata}
    
    CANDIDATE RESUME EXCERPTS (Retrieved chunks):
    {resume_excerpts}
    
    Score the candidate out of 100 based strictly on this rubric:
    1. Semantic Skill Match (40%)
    2. Verified PoW Depth (30%) - infer from resume details or TCFE metrics
    3. Experience (15%)
    4. Keywords (15%)
    
    Output your response ONLY as a valid JSON string with the following schema:
    {{
        "score": 85.5,
        "xai_explanation": "A 2-sentence justification explaining the score based on the rubric."
    }}
    """)
    
    chain = prompt | llm
    scored_candidates = []
    
    # 5. Score each retrieved candidate
    for cand_id, data in candidates_data.items():
        excerpts = "\n---\n".join(data["chunks"])
        meta_str = json.dumps(data["metadata"], indent=2)
        
        try:
            response = chain.invoke({
                "job_description": job_description,
                "metadata": meta_str,
                "resume_excerpts": excerpts
            })
            
            # Clean up potential markdown formatting from LLM response
            response_text = response.content.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith("```"):
                response_text = response_text[3:-3].strip()
                
            result_json = json.loads(response_text)
            
            # Attach the original metadata so the frontend knows who this is
            result_json["metadata"] = data["metadata"]
            scored_candidates.append(result_json)
        except Exception as e:
            print(f"Error scoring candidate {cand_id}: {e}")
            
    # Sort candidates by highest score
    scored_candidates.sort(key=lambda x: x.get("score", 0), reverse=True)
    return scored_candidates

import os
import json
import re
import ast
import logging
from typing import List, Dict, Any, Optional
from langchain_ollama import ChatOllama

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
import chromadb

# Logging setup
logger = logging.getLogger(__name__)

# Initialize persistent ChromaDB client
CHROMA_PATH = "./chroma_db"
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Get or create the specific collection for our talent pool
collection = chroma_client.get_or_create_collection(
    name="talent_pool",
    metadata={"hnsw:space": "cosine"}  # Cosine similarity is typically best for text embeddings
)

# Initialize the HuggingFace embeddings model locally
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

class EvaluationPayload(BaseModel):
    semantic_skill_score_40: float = Field(description="Score out of 40 for semantic skill match")
    pow_depth_score_30: float = Field(description="Score out of 30 for proof-of-work depth")
    experience_score_15: float = Field(description="Score out of 15 for experience")
    keyword_score_15: float = Field(description="Score out of 15 for keywords")
    total_score: float = Field(description="Total score (sum of the above)")
    xai_explanation: str = Field(description="A highly concise, natural-language Explainable AI summary justifying the score")
    extracted_candidate_skills: List[str] = Field(description="List of strict technical hard skills extracted from the candidate's resume (e.g. Python, AWS). No generic buzzwords.")
    extracted_jd_skills: List[str] = Field(description="List of strict technical hard skills extracted from the job description (e.g. React, Docker). No generic buzzwords.")

class CommitEvaluationPayload(BaseModel):
    quality_multiplier: float = Field(description="Decimal from 0.0 to 1.0 representing commit quality.")

def embed_document(candidate_id: str, text: str, metadata: Dict[str, Any] = None) -> None:
    """
    Chunks the given text using RecursiveCharacterTextSplitter and upserts
    the chunks along with their embeddings into the ChromaDB collection.
    """
    if metadata is None:
        metadata = {}
        
    # 1. Chunk the text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=50
    )
    chunks = splitter.split_text(text)
    
    if not chunks:
        return
        
    documents = []
    metadatas = []
    ids = []
    
    # 2. Prepare data for ChromaDB
    for i, chunk in enumerate(chunks):
        documents.append(chunk)
        # We ensure metadata only contains primitives
        safe_metadata = {"candidate_id": candidate_id}
        for k, v in metadata.items():
            if isinstance(v, (str, int, float, bool)):
                safe_metadata[k] = v
                
        safe_metadata["chunk_index"] = i
        metadatas.append(safe_metadata)
        
        ids.append(f"{candidate_id}-chunk-{i}")
        
    # 3. Embed the chunks
    embeddings = embeddings_model.embed_documents(documents)
    
    # 4. Upsert into ChromaDB
    collection.upsert(
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )

def evaluate_candidate(candidate_id: str, job_description: str, pow_data: Dict[str, Any], role_context: str = "", pow_results: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Evaluates a candidate using deterministic Vector Search mathematical similarities.
    Uses Llama 3.2 purely to generate a strict, 2-sentence Traceability Report based on the math.
    """
    # 1. Mathematical Vector Search
    # We query ChromaDB to get the Cosine Similarity between the JD and the candidate's chunks
    results = collection.query(
        query_texts=[job_description],
        where={"candidate_id": candidate_id},
        n_results=5,
        include=["documents", "distances"]
    )
    
    if not results.get("documents") or not results["documents"][0]:
        raise ValueError(f"No documents found for candidate ID {candidate_id}")
        
    distances = results.get("distances", [[1.0]])[0]
    avg_distance = sum(distances) / len(distances) if distances else 1.0
    
    # Convert Cosine distance to similarity percentage
    similarity = max(0.0, 1.0 - avg_distance)
    semantic_skill_score_40 = min(40.0, round(similarity * 40.0, 2))
    
    # 2. Mathematical Heuristic Scoring
    resume_text = "\n".join(results["documents"][0]).lower()
    jd_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', job_description.lower()))
    
    # Filter common stop words
    stop_words = {"this", "that", "with", "from", "your", "have", "will", "what", "role", "team", "work", "experience"}
    jd_words = jd_words - stop_words
    
    matched_keywords = [w for w in jd_words if w in resume_text]
    keyword_ratio = len(matched_keywords) / max(len(jd_words), 1)
    # Slight boost curve for keyword ratio
    keyword_score_15 = min(15.0, round((keyword_ratio * 1.5) * 15.0, 2))
    
    exp_keywords = ['years', 'senior', 'lead', 'managed', 'developed', 'architected', 'designed']
    exp_matches = [w for w in exp_keywords if w in resume_text]
    experience_score_15 = min(15.0, round((len(exp_matches) / 4) * 15.0, 2))
    
    missing_key_terms = list(jd_words - set(matched_keywords))[:5]
    
    # 3. Traceability JSON for the LLM
    vector_similarity_results = {
        "semantic_match_percentage": round(similarity * 100, 2),
        "keyword_match_percentage": round(keyword_ratio * 100, 2),
        "experience_indicators_found": exp_matches,
        "missing_key_terms_or_gaps": missing_key_terms,
        "matched_skills": matched_keywords[:5]
    }
    
    # 4. Traceability Report Prompt (Strict Data Translation)
    prompt = f"""You are a strict Data Translation Agent generating a "Traceability Report" for a recruiter. 
You are NOT evaluating the candidate. The evaluation has already been mathematically calculated via Vector Search.

You will be provided with a JSON object containing the exact mathematical skill overlaps and gaps between the candidate and the job description.

RULES:
1. Translate the provided JSON data into two concise, professional sentences explaining the match.
2. DO NOT hallucinate, infer, or invent any skills, traits, or reasoning that are not explicitly present in the JSON payload.
3. If a skill is listed under "gaps" or "missing_key_terms_or_gaps", you must state it as a missing requirement. Do not make excuses for the candidate.

Input JSON: {json.dumps(vector_similarity_results)}
Traceability Report:"""

    xai_explanation = ""
    try:
        import httpx
        with httpx.Client(timeout=30.0) as client:
            res = client.post("http://localhost:11434/api/generate", json={
                "model": "llama3.2",
                "prompt": prompt,
                "stream": False
            })
            if res.status_code == 200:
                data = res.json()
                xai_explanation = data.get("response", "").strip()
    except Exception as e:
        logger.error(f"Ollama Traceability Report failed: {e}")
        
    if not xai_explanation:
        xai_explanation = f"Mathematical scan completed. Semantic match: {round(similarity*100)}%. Missing terms: {', '.join(missing_key_terms)}."

    # 5. Compile Final Payload
    pow_score = 0.0
    if pow_results and not pow_results.get("pow_data_unavailable", True):
        pow_score = round(pow_results.get("pow_score", 0.0) * 0.30, 2)

    total_score = round(semantic_skill_score_40 + pow_score + experience_score_15 + keyword_score_15, 2)

    parsed_data = {
        "semantic_skill_score_40": semantic_skill_score_40,
        "pow_depth_score_30": pow_score,
        "experience_score_15": experience_score_15,
        "keyword_score_15": keyword_score_15,
        "total_score": total_score,
        "xai_explanation": xai_explanation,
        "extracted_candidate_skills": matched_keywords[:10],
        "extracted_jd_skills": list(jd_words)[:10]
    }
    
    return parsed_data

def evaluate_commit_semantics(commit_messages: List[str]) -> float:
    """
    Evaluates the quality of a list of commit messages using an LLM.
    Penalizes vague messages and rewards descriptive ones.
    Returns a float between 0.0 and 1.0 as a quality multiplier.
    """
    if not commit_messages:
        return 0.0
        
    llm = ChatOllama(
        model="llama3.2",
        base_url="http://127.0.0.1:11434",
        temperature=0.0,
        format="json"
    )
    
    prompt = PromptTemplate(
        template="""You are a strict AI Code Reviewer. Evaluate the semantic quality of these recent commit messages.
        
COMMIT MESSAGES:
{commit_messages}

SCORING RULES:
1. Penalize vague messages like 'update', 'fix', 'wip', 'test', 'init'. These indicate poor engineering practices.
2. Reward descriptive messages like 'refactored auth flow', 'added vector embeddings', or standard conventional commits (e.g., 'feat(api): ...', 'fix(core): ...').
3. Output a single 'quality_multiplier' float between 0.0 (pure spam/useless) and 1.0 (highly descriptive and professional).

Return the evaluation in this exact JSON format:
{format_instructions}
""",
        input_variables=["commit_messages"],
        partial_variables={"format_instructions": JsonOutputParser(pydantic_object=CommitEvaluationPayload).get_format_instructions()}
    )
    
    chain = prompt | llm | JsonOutputParser(pydantic_object=CommitEvaluationPayload)
    
    try:
        messages_str = "\\n".join([f"- {msg}" for msg in commit_messages])
        response = chain.invoke({"commit_messages": messages_str})
        return float(response.get("quality_multiplier", 1.0))
    except Exception as e:
        logger.error(f"Error evaluating commit semantics: {e}")
        return 1.0  # Fallback to no penalty if LLM fails
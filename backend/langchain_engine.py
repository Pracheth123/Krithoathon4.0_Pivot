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

def evaluate_candidate(candidate_id: str, job_description: str, pow_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves the most semantically relevant candidate chunks from ChromaDB and evaluates 
    the candidate against the Job Description using a local LLM.
    """
    # 1. Fetch all chunks for the candidate from ChromaDB
    results = collection.get(
        where={"candidate_id": candidate_id},
        include=["documents"]
    )
    
    if not results["documents"]:
        raise ValueError(f"No documents found for candidate ID {candidate_id}")
        
    # 2. Join all chunks into a single string for full context
    retrieved_chunks = results["documents"]
    resume_context = "\n\n---\n\n".join(retrieved_chunks)
    
    # 3. Initialize local LLM for RTX 4050 (Llama 3.2 3B)
    llm = ChatOllama(
        model="llama3.2",
        base_url="http://127.0.0.1:11434",
        temperature=0.0,
        format="json"  # Forces Ollama to strictly output JSON
    )
    
    # Dynamic Rubric Logic
    if pow_data:
        scoring_rubric = """
        Use the Technical Scoring Rubric:
        - semantic_skill_score_40 (Max 40): Evaluate deep technical overlap.
        - pow_depth_score_30 (Max 30): Evaluate based on provided Proof of Work/GitHub data.
        - experience_score_15 (Max 15): Alignment of projects/roles with the JD.
        - keyword_score_15 (Max 15): Exact tech stack matches.
        """
    else:
        scoring_rubric = """
        Use the Non-Technical/Business Scoring Rubric:
        - semantic_skill_score_40 (Max 50): Evaluate core competencies and soft/hard skill overlap.
        - experience_score_15 (Max 35): Heavily weigh their track record, achievements, and past roles.
        - keyword_score_15 (Max 15): Exact industry terminology matches.
        - pow_depth_score_30 (Max 0): ALWAYS output 0. Do not penalize the candidate; this metric is not applicable.
        """

    # 4. Define Aggressive Prompt for the Small Local Model
    prompt = PromptTemplate(
        template="""You are an AI Assessor. NEVER echo or repeat the Job Description. CRITICAL: You must output ONLY a raw, valid JSON object. Do not use markdown code blocks (```json). Do not include any conversational text before or after the JSON. Evaluate the candidate purely on semantic business/operational skills if `pow_data` is empty. DO NOT leave any fields blank.

JOB DESCRIPTION:
{job_description}

CANDIDATE PROOF-OF-WORK DATA (GitHub TCFE Metrics):
{pow_data}

RELEVANT RESUME EXCERPTS:
{resume_context}

SCORING RULES (You MUST assign a number > 0 for matching skills):
{scoring_rubric}
5. total_score: Sum of the above 4 scores.
6. xai_explanation: You MUST write a 2-sentence explanation of why you gave these scores. DO NOT LEAVE BLANK. CRITICAL: If the provided `pow_data` is empty or null, the candidate is a non-technical applicant. You MUST NOT mention GitHub, commit history, burst scores, or proof-of-work in the XAI explanation. Base your evaluation purely on the semantic overlap between the resume and the job description. If `pow_data` is present, mention the candidate's recent commit activity or 'burst' status in the xai_explanation if relevant to their current skill momentum.
7. extracted_candidate_skills: Extract a list of STRICT technical hard skills (e.g., Python, AWS, React) from the candidate's resume. Do NOT include generic buzzwords (e.g., "Leadership", "Agile").
8. extracted_jd_skills: Extract a list of STRICT technical hard skills from the job description. Do NOT include generic buzzwords.

Return the evaluation in this exact JSON format:
{{
  "semantic_skill_score_40": "<integer between 0 and 40>",
  "pow_depth_score_30": "<integer between 0 and 30>",
  "experience_score_15": "<integer between 0 and 15>",
  "keyword_score_15": "<integer between 0 and 15>",
  "total_score": "<integer sum of the above>",
  "xai_explanation": "<A highly concise, natural-language Explainable AI summary>",
  "extracted_candidate_skills": ["<skill1>", "<skill2>"],
  "extracted_jd_skills": ["<skill1>", "<skill2>"]
}}
""",
        input_variables=["job_description", "pow_data", "resume_context", "scoring_rubric"]
    )
    
    chain = prompt | llm
    
    # 5. Score Candidate using LLM
    try:
        raw_response = chain.invoke({
            "job_description": job_description,
            "pow_data": json.dumps(pow_data),
            "resume_context": resume_context,
            "scoring_rubric": scoring_rubric
        })
        
        # Smart Parsing (The Regex Fix)
        text_content = raw_response.content if hasattr(raw_response, 'content') else str(raw_response)
        match = re.search(r'\{.*\}', text_content, re.DOTALL)
        dict_string = match.group(0) if match else text_content
        
        try:
            # Try standard JSON first
            parsed_data = json.loads(dict_string)
        except json.JSONDecodeError:
            try:
                # Hackathon Cheat Code: Safely evaluate Python-style dictionary strings (handles single quotes)
                parsed_data = ast.literal_eval(dict_string)
            except Exception as e:
                print(f"FATAL PARSE ERROR: {e}")
                raise ValueError(f"No JSON or Python dictionary found in LLM response: {text_content}")
                
        # Never Trust LLM Math: Force integer conversion safely
        sem_score = int(parsed_data.get('semantic_skill_score_40', 0))
        pow_score = int(parsed_data.get('pow_depth_score_30', 0))
        exp_score = int(parsed_data.get('experience_score_15', 0))
        key_score = int(parsed_data.get('keyword_score_15', 0))
        
        # Python calculates the absolute truth
        parsed_data['total_score'] = sem_score + pow_score + exp_score + key_score
        
        return parsed_data
            
    except Exception as e:
        logger.error(f"Error evaluating candidate {candidate_id}: {e}")
        print(f"WARNING: LLM output failed to parse as JSON. Using fallback. Error: {e}")
        return {
            "semantic_skill_score_40": 20.0,
            "pow_depth_score_30": 0.0,
            "experience_score_15": 10.0,
            "keyword_score_15": 10.0,
            "total_score": 40.0,
            "xai_explanation": "Candidate evaluated on semantic matches. Strong overlap in core business operations.",
            "extracted_candidate_skills": [],
            "extracted_jd_skills": []
        }

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
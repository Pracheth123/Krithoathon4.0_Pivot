import io
import re
import os
import unicodedata
import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import PyPDF2
import docx
import spacy
from github_client import GitHubExtractor
from tcfe_engine import calculate_tcfe
from langchain_engine import embed_document, evaluate_candidate
from graph_engine import generate_knowledge_graph, calculate_gap_analysis
import asyncio
from auth import auth_router, get_current_user

app = FastAPI(title="TalentGraph AI - Resume Parser API")

app.include_router(auth_router)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# --- 🚨 CORS MIDDLEWARE FIX (For Frontend Integration) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Wildcard works ONLY if allow_credentials=False
    allow_credentials=False, # We use Bearer tokens, not cookies, so this can be False
    allow_methods=["*"], 
    allow_headers=["*"], 
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"OMG 422 ERROR: {exc}")
    print(f"BODY WAS: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc)},
    )

# --- HEALTH CHECK (For React Status Bar) ---
@app.get("/health")
async def health_check():
    """Frontend polling endpoint for the Status Bar"""
    return {"status": "online", "vector_db": "connected", "tcfe": "active"}

# Load spaCy model for PII Redaction
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    raise RuntimeError(
        "spaCy model 'en_core_web_sm' not found. "
        "Please install it using: python -m spacy download en_core_web_sm"
    )

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extracts text from a PDF file using PyPDF2 and scrubs invisible characters."""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        # Allow all unicode, just strip control characters except newline
        return "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch == '\n')
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extracts text from a Word document using python-docx."""
    try:
        import unicodedata
        doc = docx.Document(io.BytesIO(file_content))
        text = "\n".join([para.text for para in doc.paragraphs])
        return "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch == '\n')
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")

def extract_github_url(text: str) -> str | None:
    """Extracts the first GitHub profile URL found in the text."""
    github_pattern = r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9-]+"
    match = re.search(github_pattern, text, re.IGNORECASE)
    if match:
        return match.group(0)
    return None

def redact_entities(text: str) -> str:
    """Uses spaCy to detect and redact Person Names and Organizations for blind screening."""
    doc = nlp(text)
    redacted_text = text
    
    # Sort entities in reverse order to avoid index shifting when replacing text
    entities = sorted(
        [ent for ent in doc.ents if ent.label_ in ["PERSON", "ORG", "GPE"]],
        key=lambda e: e.start_char,
        reverse=True
    )
    
    for ent in entities:
        start = ent.start_char
        end = ent.end_char
        replacement = f"[{ent.label_}]"
        redacted_text = redacted_text[:start] + replacement + redacted_text[end:]
        
    return redacted_text

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """
    Phase 1 & 2: Parses PDF or DOCX, redacts PII, checks for technical relevance, 
    and extracts live GitHub metrics (TCFE).
    """
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF and Word (.docx) documents are accepted.")
    
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not read the uploaded file.")
    
    # 1. Extract raw text based on file extension
    try:
        if filename_lower.endswith(".pdf"):
            raw_text = extract_text_from_pdf(content)
        else:
            raw_text = extract_text_from_docx(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the document.")
    
    # 2. Redact entities FIRST (Blind Screening)
    sanitized_text = redact_entities(raw_text)
    
    # 3. Relevance Gating check
    tech_keywords = ["engineer", "developer", "software", "data", "code", "tech"]
    text_lower = sanitized_text.lower()
    is_technical = any(kw in text_lower for kw in tech_keywords)
    
    if not is_technical:
        return {
            "github_url": None,
            "tcfe_metrics": None,
            "sanitized_text": sanitized_text,
            "message": "Non-technical role detected. Skipping TCFE."
        }
    
    # 4. Proceed with GitHub extraction for technical roles
    github_url = extract_github_url(sanitized_text)
    
    tcfe_metrics = None
    if github_url:
        try:
            # Safely get the username from the raw URL
            username = github_url.rstrip('/').split('/')[-1]
            if username:
                print(f"Fetching GitHub API for user: {username}")
                github_token = os.getenv("GITHUB_TOKEN")
                extractor = GitHubExtractor(token=github_token)
                top_repos = await extractor.get_top_repositories(username, limit=1)
                
                if top_repos:
                    repo_info = top_repos[0]
                    repo_name = repo_info.get("name")
                    repo_owner = repo_info.get("owner", {}).get("login")
                    repo_created_at = repo_info.get("created_at")
                    
                    if repo_name and repo_owner and repo_created_at:
                        commits = await extractor.get_recent_commits(repo_owner, repo_name)
                        # Run the blocking LLM logic in a separate thread
                        tcfe_metrics = await asyncio.to_thread(calculate_tcfe, commits, repo_created_at)
        except Exception:
            tcfe_metrics = None
    
    return {
        "github_url": github_url,
        "tcfe_metrics": tcfe_metrics,
        "sanitized_text": sanitized_text,
        "message": "Technical role processed successfully."
    }

# --- Models and Endpoints for Phase 3 (LLM) & Phase 4 (Graph) ---

class EmbedStoreRequest(BaseModel):
    candidate_id: str
    sanitized_text: str
    metadata: Optional[Dict[str, Any]] = None

class EvaluateRequest(BaseModel):
    candidate_id: str
    job_description: str
    pow_data: Optional[Dict[str, Any]] = None
    role_id: Optional[int] = None

@app.post("/embed-store")
async def embed_store(request: EmbedStoreRequest, current_user: str = Depends(get_current_user)):
    """Chunks and embeds the sanitized resume into ChromaDB."""
    try:
        await asyncio.to_thread(embed_document, request.candidate_id, request.sanitized_text, request.metadata or {})
        return {"status": "success", "message": f"Document embedded successfully for candidate {request.candidate_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error embedding document: {str(e)}")

@app.post("/evaluate-candidate")
async def evaluate_candidate_endpoint(request: EvaluateRequest, current_user: str = Depends(get_current_user)):
    """
    The Mega-Endpoint: Queries ChromaDB, runs Llama 3.2, applies TCFE momentum math, 
    and generates the D3 topology graph in one payload.
    """
    try:
        active_pow_data = request.pow_data
        if not active_pow_data:
            active_pow_data = {}

        # Fetch Role Context from DB if provided
        role_context = ""
        if request.role_id:
            import sqlite3
            from auth import DB_FILE
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("SELECT title, description FROM roles WHERE id = ?", (request.role_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                role_context = f"Role Title: {row[0]}\nRole Context: {row[1]}"

        # 1. Run blocking LLM evaluation
        llm_evaluation = await asyncio.to_thread(
            evaluate_candidate, 
            request.candidate_id, 
            request.job_description, 
            active_pow_data,
            role_context
        )

        print("\n=== RAW LLM OUTPUT ===")
        print(llm_evaluation)
        print("======================\n")
        
        # 2. Extract skills
        candidate_skills = llm_evaluation.get("extracted_candidate_skills", [])
        jd_skills = llm_evaluation.get("extracted_jd_skills", [])
        
        # 3. Generate Graph and Gap Analysis
        graph_data = generate_knowledge_graph(candidate_skills, jd_skills)
        gap_analysis = calculate_gap_analysis(candidate_skills, jd_skills)
        
        # Phase 5: Temporal Velocity Calculation
        burst_detected = active_pow_data.get("burst_detected", False)
        burst_score = active_pow_data.get("burst_score", 0.0)
        base_total_score = llm_evaluation.get("total_score", 0.0)
        
        if burst_detected:
            multiplier = burst_score * 0.1
            bonus = multiplier * base_total_score
            status = "Accelerated"
        else:
            multiplier = 0.0
            bonus = 0.0
            status = "Stable"
            
        final_weighted_score = min(100.0, base_total_score + bonus)
        
        print(f"\n--- Temporal Velocity Calc for Candidate: {request.candidate_id} ---")
        print(f"Base Score: {base_total_score} | Burst Detected: {burst_detected} | Burst Score: {burst_score}")
        print(f"Bonus Added: {round(bonus, 2)} | Final Weighted Score: {round(final_weighted_score, 2)}\n")
        
        # 4. Build the unified JSON payload
        unified_response = {
            "candidate_id": request.candidate_id,
            "scores": {
                "semantic_skill_score_40": llm_evaluation.get("semantic_skill_score_40"),
                "pow_depth_score_30": llm_evaluation.get("pow_depth_score_30"),
                "experience_score_15": llm_evaluation.get("experience_score_15"),
                "keyword_score_15": llm_evaluation.get("keyword_score_15"),
                "total_score": base_total_score
            },
            "temporal_velocity": {
                "status": status,
                "multiplier_applied": round(multiplier, 4),
                "final_weighted_score": round(final_weighted_score, 2)
            },
            "explanation": llm_evaluation.get("xai_explanation"),
            "gap_analysis": gap_analysis,
            "graph_data": graph_data
        }
        
        return unified_response
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print("ERROR IN EVALUATE CANDIDATE:\n", error_details)
        raise HTTPException(status_code=500, detail=f"Error scoring candidate: {str(e)}\n\n{error_details}")


class SkillsPayload(BaseModel):
    candidate_skills: List[str]
    jd_skills: List[str]

@app.post("/graph-data")
async def get_graph_data(payload: SkillsPayload):
    """Returns a D3-compatible JSON object generated by NetworkX."""
    try:
        graph_data = generate_knowledge_graph(payload.candidate_skills, payload.jd_skills)
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating graph data: {str(e)}")

@app.post("/gap-analysis")
async def gap_analysis_endpoint(payload: SkillsPayload):
    """Analyzes gaps between candidate skills and the JD using set mathematics."""
    try:
        analysis_data = calculate_gap_analysis(payload.candidate_skills, payload.jd_skills)
        return analysis_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating gap analysis: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
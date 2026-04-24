import io
import re
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import PyPDF2
import spacy
from github_client import GitHubExtractor
from tcfe_engine import calculate_tcfe

app = FastAPI(title="Resume Parser API")

# Load spaCy model. It must be downloaded beforehand using:
# python -m spacy download en_core_web_sm
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    raise RuntimeError(
        "spaCy model 'en_core_web_sm' not found. "
        "Please install it using: python -m spacy download en_core_web_sm"
    )

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extracts text from a PDF file using PyPDF2."""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF file: {str(e)}")

def extract_github_url(text: str) -> str | None:
    """Extracts the first GitHub profile URL found in the text."""
    # Regex to match github.com profile links
    # Matches https://github.com/username or github.com/username
    github_pattern = r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9-]+"
    match = re.search(github_pattern, text, re.IGNORECASE)
    if match:
        return match.group(0)
    return None

def redact_entities(text: str) -> str:
    """
    Redacts PERSON, GPE, DATE, and ORG entities from the text using spaCy.
    """
    # Increase the max_length for very long resumes if needed, though default is usually fine
    doc = nlp(text)
    redacted_text = text
    
    # We iterate over entities in reverse order so that string replacements
    # don't mess up the character offsets for subsequent entities.
    entities_to_redact = [ent for ent in doc.ents if ent.label_ in {"PERSON", "GPE", "DATE", "ORG"}]
    
    # Sort entities by start character in reverse to replace from end to beginning
    entities_to_redact.sort(key=lambda x: x.start_char, reverse=True)
    
    for ent in entities_to_redact:
        start = ent.start_char
        end = ent.end_char
        replacement = f"[{ent.label_}]"
        redacted_text = redacted_text[:start] + replacement + redacted_text[end:]
        
    return redacted_text

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Endpoint to parse a resume PDF, redact PII, and extract GitHub URL.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are accepted.")
    
    # Read the file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not read the uploaded file.")
    
    # 1. Extract text from PDF
    raw_text = extract_text_from_pdf(content)
    
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the PDF.")
    
    # 2. Extract GitHub URL from raw text
    github_url = extract_github_url(raw_text)
    
    # 3. Calculate TCFE metrics if GitHub URL is found
    tcfe_metrics = None
    if github_url:
        try:
            # Extract username from the URL (e.g., github.com/username)
            username = github_url.split("github.com/")[-1].strip("/")
            if username:
                extractor = GitHubExtractor()
                # Fetch top repository
                top_repos = await extractor.get_top_repositories(username, limit=1)
                
                if top_repos:
                    repo_info = top_repos[0]
                    repo_name = repo_info.get("name")
                    repo_owner = repo_info.get("owner", {}).get("login")
                    repo_created_at = repo_info.get("created_at")
                    
                    if repo_name and repo_owner and repo_created_at:
                        # Fetch recent commits for the top repo
                        commits = await extractor.get_recent_commits(repo_owner, repo_name)
                        # Calculate TCFE metrics
                        tcfe_metrics = calculate_tcfe(commits, repo_created_at)
        except Exception:
            # Gracefully handle any external API failures
            tcfe_metrics = None
    
    # 4. Redact specific entities
    sanitized_text = redact_entities(raw_text)
    
    # 5. Return JSON response
    return {
        "github_url": github_url,
        "tcfe_metrics": tcfe_metrics,
        "sanitized_text": sanitized_text
    }

# --- New Models and Endpoints for RAG & Graph Scaffolding ---

class EmbedStoreRequest(BaseModel):
    sanitized_text: str
    github_url: Optional[str] = None
    tcfe_metrics: Optional[Dict[str, Any]] = None

@app.post("/embed-store")
async def embed_store(request: EmbedStoreRequest):
    """
    Accepts sanitized resume data to eventually chunk and embed into ChromaDB.
    """
    # TODO: Implement LangChain document splitting and embedding logic here
    # TODO: Store embedded vectors into ChromaDB
    return {"status": "success", "message": "Document embedded successfully"}

@app.get("/similarity-search")
async def similarity_search(q: str = Query(...), k: int = Query(10)):
    """
    Queries ChromaDB and runs LLM-as-a-Judge scoring for candidates.
    """
    # TODO: Implement LangChain similarity search with ChromaDB using 'q'
    # TODO: Run LLM-as-a-Judge scoring on the retrieved candidates
    
    # Returning dummy candidate objects
    return [
        {
            "score": 0.89,
            "xai_explanation": "Candidate has strong matching skills in Python and cloud deployment.",
            "tcfe_metrics": {"continuity_score": 0.75, "burst_score": 0.8, "burst_detected": True}
        },
        {
            "score": 0.72,
            "xai_explanation": "Candidate shows potential but lacks direct experience in React.",
            "tcfe_metrics": {"continuity_score": 0.45, "burst_score": 0.2, "burst_detected": False}
        }
    ]

@app.get("/graph-data")
async def get_graph_data():
    """
    Returns a D3-compatible JSON object generated by NetworkX.
    """
    # TODO: Generate knowledge graph using NetworkX based on resumes and JDs
    # TODO: Serialize NetworkX graph into D3 node-link format
    return {
        "nodes": [
            {"id": "Python", "group": 1},
            {"id": "React", "group": 2}
        ],
        "links": [
            {"source": "Python", "target": "React", "value": 1}
        ]
    }

@app.get("/gap-analysis")
async def gap_analysis(q: str = Query(...)):
    """
    Analyzes gaps between candidate skills and the Job Description.
    """
    # TODO: Use LLM to extract required skills from the JD 'q'
    # TODO: Compare with aggregated candidate skills to find gaps
    return {
        "covered_skills": ["Python", "React"],
        "gap_skills": ["AWS", "Docker"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

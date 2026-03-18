"""
AI Resume Matcher - FastAPI Application
Main entry point for the AI module
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import os
import shutil
from pathlib import Path

from parsers.pdf_parser import parse_pdf
from parsers.docx_parser import parse_docx
from analyzers.skill_extractor import analyze_resume
from analyzers.matcher import (
    calculate_overall_score,
    get_matched_skills,
    get_missing_skills
)

# Create FastAPI app
app = FastAPI(
    title="AI Resume Matcher API",
    description="AI-powered resume parsing and candidate ranking system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory for uploaded files
TEMP_DIR = Path("temp_uploads")
TEMP_DIR.mkdir(exist_ok=True)


# ================== Pydantic Models ==================

class JobData(BaseModel):
    """Job requirements data model"""
    description: str = Field(..., description="Job description text")
    skills: List[str] = Field(default=[], description="Required skills")
    required_experience: int = Field(default=0, description="Minimum years of experience")
    preferred_experience: int = Field(default=0, description="Preferred years of experience")
    required_education: str = Field(default="", description="Required education level")
    weights: Optional[Dict[str, float]] = Field(
        default=None,
        description="Custom weights for scoring components"
    )


class AnalyzeRequest(BaseModel):
    """Request model for single resume analysis"""
    resume_path: str = Field(..., description="Path to resume file")
    job_data: JobData


class RankRequest(BaseModel):
    """Request model for ranking multiple candidates"""
    resume_paths: List[str] = Field(..., description="List of resume file paths")
    job_data: JobData


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    message: str
    version: str


class ParseResponse(BaseModel):
    """Resume parsing response"""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


class AnalyzeResponse(BaseModel):
    """Single resume analysis response"""
    success: bool
    resume_analysis: Optional[Dict] = None
    match_score: Optional[Dict] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    error: Optional[str] = None


class RankResponse(BaseModel):
    """Candidate ranking response"""
    success: bool
    ranked_candidates: Optional[List[Dict]] = None
    total_candidates: int = 0
    error: Optional[str] = None


# ================== Helper Functions ==================

def parse_resume_file(file_path: str) -> Optional[str]:
    """
    Parse resume file based on extension
    
    Args:
        file_path: Path to resume file
        
    Returns:
        Extracted text or None
    """
    file_path_lower = file_path.lower()
    
    if file_path_lower.endswith('.pdf'):
        return parse_pdf(file_path)
    elif file_path_lower.endswith('.docx'):
        return parse_docx(file_path)
    else:
        return None


def cleanup_temp_file(file_path: str):
    """Remove temporary file"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error cleaning up temp file: {e}")


# ================== API Routes ==================

@app.get("/", response_model=HealthResponse)
def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "AI Resume Matcher API is operational",
        "version": "1.0.0"
    }


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "message": "All systems operational",
        "version": "1.0.0"
    }


@app.post("/api/parse-resume", response_model=ParseResponse)
async def parse_resume_endpoint(file: UploadFile = File(...)):
    """
    Parse uploaded resume and extract information
    
    Args:
        file: Uploaded resume file (PDF or DOCX)
        
    Returns:
        Parsed resume data
    """
    temp_file_path = None
    
    try:
        # Validate file type
        filename = file.filename.lower()
        if not (filename.endswith('.pdf') or filename.endswith('.docx')):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Only PDF and DOCX are allowed."
            )
        
        # Save uploaded file temporarily
        temp_file_path = TEMP_DIR / file.filename
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Parse resume
        text = parse_resume_file(str(temp_file_path))
        
        if not text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from resume. File may be corrupted or protected."
            )
        
        # Analyze resume
        analysis = analyze_resume(text)
        analysis["text"] = text
        analysis["filename"] = file.filename
        
        return {
            "success": True,
            "data": analysis
        }
    
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        # Clean up temp file
        if temp_file_path:
            cleanup_temp_file(str(temp_file_path))


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_match(request: AnalyzeRequest):
    """
    Analyze single resume against job requirements
    
    Args:
        request: Analysis request with resume path and job data
        
    Returns:
        Match analysis with score and breakdown
    """
    try:
        # Check if file exists
        if not os.path.exists(request.resume_path):
            raise HTTPException(
                status_code=404,
                detail=f"Resume file not found: {request.resume_path}"
            )
        
        # Parse resume
        text = parse_resume_file(request.resume_path)
        
        if not text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from resume"
            )
        
        # Analyze resume
        resume_data = analyze_resume(text)
        resume_data["text"] = text
        
        # Calculate match score
        job_data_dict = request.job_data.dict()
        score_result = calculate_overall_score(resume_data, job_data_dict)
        
        # Get matched and missing skills
        matched = get_matched_skills(
            resume_data.get("skills", []),
            job_data_dict.get("skills", [])
        )
        missing = get_missing_skills(
            resume_data.get("skills", []),
            job_data_dict.get("skills", [])
        )
        
        return {
            "success": True,
            "resume_analysis": resume_data,
            "match_score": score_result,
            "matched_skills": matched,
            "missing_skills": missing
        }
    
    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/rank-candidates", response_model=RankResponse)
async def rank_candidates(request: RankRequest):
    """
    Rank multiple candidates for a job
    
    Args:
        request: Ranking request with resume paths and job data
        
    Returns:
        Ranked list of candidates with scores
    """
    try:
        results = []
        job_data_dict = request.job_data.dict()
        
        for resume_path in request.resume_paths:
            try:
                # Check if file exists
                if not os.path.exists(resume_path):
                    print(f"Warning: File not found - {resume_path}")
                    continue
                
                # Parse resume
                text = parse_resume_file(resume_path)
                
                if not text:
                    print(f"Warning: Could not parse - {resume_path}")
                    continue
                
                # Analyze resume
                resume_data = analyze_resume(text)
                resume_data["text"] = text
                
                # Calculate match score
                score_result = calculate_overall_score(resume_data, job_data_dict)
                
                # Get matched skills
                matched = get_matched_skills(
                    resume_data.get("skills", []),
                    job_data_dict.get("skills", [])
                )
                
                results.append({
                    "resume_path": resume_path,
                    "overall_score": score_result["overall_score"],
                    "match_level": score_result["match_level"],
                    "breakdown": score_result["breakdown"],
                    "skills_found": resume_data.get("skills", [])[:10],  # Top 10 skills
                    "matched_skills": matched,
                    "experience_years": resume_data.get("experience_years", 0),
                    "education": resume_data.get("education", [])[:2],  # Top 2 education
                    "email": resume_data.get("email", ""),
                    "phone": resume_data.get("phone", "")
                })
                
            except Exception as e:
                print(f"Error processing {resume_path}: {e}")
                continue
        
        # Sort by overall score (descending)
        results.sort(key=lambda x: x["overall_score"], reverse=True)
        
        # Add rank numbers
        for idx, result in enumerate(results, 1):
            result["rank"] = idx
        
        return {
            "success": True,
            "ranked_candidates": results,
            "total_candidates": len(results)
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "total_candidates": 0
        }


# ================== Main ==================

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 AI Resume Matcher API Starting...")
    print("=" * 60)
    print("📍 Server: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Auto-reload on code changes
    )

"""
Job-Resume Matcher
Calculates match scores between resumes and job requirements
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import Dict, List, Optional


def calculate_skill_match(resume_skills: List[str], job_skills: List[str]) -> float:
    """
    Calculate skill match percentage
    
    Args:
        resume_skills: Skills found in resume
        job_skills: Skills required by job
        
    Returns:
        Match percentage (0-100)
    """
    if not job_skills:
        return 100.0  # If no skills required, perfect match
    
    if not resume_skills:
        return 0.0  # If resume has no skills
    
    # Normalize to lowercase for comparison
    resume_skills_lower = set(s.lower().strip() for s in resume_skills)
    job_skills_lower = set(s.lower().strip() for s in job_skills)
    
    # Find matched skills
    matched_skills = resume_skills_lower & job_skills_lower
    
    # Calculate match percentage
    match_percentage = (len(matched_skills) / len(job_skills_lower)) * 100
    
    return round(match_percentage, 2)


def calculate_text_similarity(resume_text: str, job_description: str) -> float:
    """
    Calculate TF-IDF cosine similarity between resume and job description
    
    Args:
        resume_text: Full resume text
        job_description: Job description text
        
    Returns:
        Similarity score (0-100)
    """
    if not resume_text or not job_description:
        return 0.0
    
    try:
        # Create TF-IDF vectorizer
        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=1000,
            ngram_range=(1, 2)  # Use unigrams and bigrams
        )
        
        # Fit and transform the documents
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
        
        # Calculate cosine similarity
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        
        # Convert to percentage
        return round(similarity * 100, 2)
        
    except Exception as e:
        print(f"Error calculating text similarity: {e}")
        return 0.0


def calculate_experience_match(resume_years: int, required_years: int, preferred_years: int = 0) -> float:
    """
    Calculate experience match score
    
    Args:
        resume_years: Years of experience in resume
        required_years: Minimum required years
        preferred_years: Preferred years (optional)
        
    Returns:
        Match score (0-100)
    """
    if required_years == 0 and preferred_years == 0:
        return 100.0  # No experience requirement
    
    # Use preferred or required
    target_years = preferred_years if preferred_years > 0 else required_years
    
    if resume_years >= target_years:
        # Bonus for exceeding requirements (up to 110%)
        bonus = min((resume_years - target_years) * 2, 10)
        return min(100.0 + bonus, 110.0)
    elif required_years > 0 and resume_years >= required_years:
        # Meets minimum but not preferred
        ratio = resume_years / required_years
        return round(80.0 + (ratio * 20), 2)
    elif resume_years > 0:
        # Some experience but less than required
        ratio = resume_years / required_years if required_years > 0 else resume_years / target_years
        return round(ratio * 70, 2)
    else:
        # No experience
        return 0.0


def calculate_education_match(resume_education: List[Dict], required_education: str = "") -> float:
    """
    Calculate education match score
    
    Args:
        resume_education: List of education entries from resume
        required_education: Required education level
        
    Returns:
        Match score (0-100)
    """
    if not required_education:
        return 100.0  # No specific education requirement
    
    if not resume_education:
        return 50.0  # No education info, give neutral score
    
    required_lower = required_education.lower()
    
    # Education hierarchy
    education_levels = {
        "phd": 4,
        "doctorate": 4,
        "master": 3,
        "bachelor": 2,
        "diploma": 1,
        "certificate": 0
    }
    
    # Determine required level
    required_level = 0
    for edu_type, level in education_levels.items():
        if edu_type in required_lower:
            required_level = level
            break
    
    # Find highest resume education level
    resume_level = 0
    for edu_entry in resume_education:
        edu_type = edu_entry.get("type", "").lower()
        for edu_name, level in education_levels.items():
            if edu_name in edu_type:
                resume_level = max(resume_level, level)
    
    # Calculate match
    if resume_level >= required_level:
        # Bonus for higher education
        bonus = (resume_level - required_level) * 5
        return min(100.0 + bonus, 110.0)
    elif resume_level > 0:
        # Some education but lower than required
        return round((resume_level / required_level) * 75, 2)
    else:
        # Education found but level unclear
        return 60.0


def calculate_overall_score(
    resume_data: Dict,
    job_data: Dict,
    weights: Optional[Dict[str, float]] = None
) -> Dict:
    """
    Calculate overall match score with weighted components
    
    Args:
        resume_data: Resume analysis data
        job_data: Job requirements data
        weights: Custom weights for scoring components
        
    Returns:
        Dictionary with overall score and breakdown
    """
    # Default weights (must sum to 1.0)
    if weights is None:
        weights = {
            "skills": 0.40,          # 40% - Most important
            "experience": 0.30,       # 30% - Very important
            "textSimilarity": 0.20,   # 20% - Context match
            "education": 0.10         # 10% - Basic requirement
        }
    
    # Ensure weights are properly formatted
    skill_weight = float(weights.get("skills", 0.4))
    exp_weight = float(weights.get("experience", 0.3))
    text_weight = float(weights.get("textSimilarity", 0.2))
    edu_weight = float(weights.get("education", 0.1))
    
    # Calculate individual component scores
    skill_score = calculate_skill_match(
        resume_data.get("skills", []),
        job_data.get("skills", [])
    )
    
    experience_score = calculate_experience_match(
        resume_data.get("experience_years", 0),
        job_data.get("required_experience", 0),
        job_data.get("preferred_experience", 0)
    )
    
    text_similarity = calculate_text_similarity(
        resume_data.get("text", ""),
        job_data.get("description", "")
    )
    
    education_score = calculate_education_match(
        resume_data.get("education", []),
        job_data.get("required_education", "")
    )
    
    # Cap individual scores at 110 (allow small bonus)
    skill_score = min(skill_score, 110.0)
    experience_score = min(experience_score, 110.0)
    text_similarity = min(text_similarity, 110.0)
    education_score = min(education_score, 110.0)
    
    # Calculate weighted overall score
    overall_score = (
        skill_score * skill_weight +
        experience_score * exp_weight +
        text_similarity * text_weight +
        education_score * edu_weight
    )
    
    # Cap overall score at 100
    overall_score = min(overall_score, 100.0)
    
    # Determine match level
    if overall_score >= 80:
        match_level = "Excellent Match"
    elif overall_score >= 60:
        match_level = "Good Match"
    elif overall_score >= 40:
        match_level = "Fair Match"
    else:
        match_level = "Poor Match"
    
    return {
        "overall_score": round(overall_score, 2),
        "match_level": match_level,
        "breakdown": {
            "skill_match": round(skill_score, 2),
            "experience_match": round(experience_score, 2),
            "text_similarity": round(text_similarity, 2),
            "education_score": round(education_score, 2)
        },
        "weights_used": {
            "skills": skill_weight,
            "experience": exp_weight,
            "textSimilarity": text_weight,
            "education": edu_weight
        }
    }


def get_matched_skills(resume_skills: List[str], job_skills: List[str]) -> List[str]:
    """
    Get list of skills that match between resume and job
    
    Args:
        resume_skills: Skills from resume
        job_skills: Skills from job
        
    Returns:
        List of matched skills
    """
    resume_skills_lower = set(s.lower().strip() for s in resume_skills)
    job_skills_lower = set(s.lower().strip() for s in job_skills)
    
    return sorted(list(resume_skills_lower & job_skills_lower))


def get_missing_skills(resume_skills: List[str], job_skills: List[str]) -> List[str]:
    """
    Get list of skills that are required but missing from resume
    
    Args:
        resume_skills: Skills from resume
        job_skills: Skills from job
        
    Returns:
        List of missing skills
    """
    resume_skills_lower = set(s.lower().strip() for s in resume_skills)
    job_skills_lower = set(s.lower().strip() for s in job_skills)
    
    return sorted(list(job_skills_lower - resume_skills_lower))

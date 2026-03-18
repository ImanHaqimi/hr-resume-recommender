"""
Skill Extractor
Uses NLP to extract skills, education, and experience from resume text
"""
try:
    import spacy
    # Load spaCy model (will be loaded once when module is imported)
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        print("spaCy model not found. Run: python -m spacy download en_core_web_sm")
        nlp = None
except ImportError:
    print("spaCy not installed. Using pattern matching fallback.")
    nlp = None
    spacy = None

import re
from typing import Dict, List, Set



# Comprehensive skills database
# You can expand this list based on your needs
TECHNICAL_SKILLS = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "c", "php", 
    "ruby", "go", "golang", "rust", "swift", "kotlin", "scala", "perl",
    "r", "matlab", "sql", "html", "css", "bash", "shell",
    
    # Web Frameworks
    "react", "angular", "vue", "vue.js", "svelte", "next.js", "nuxt.js",
    "django", "flask", "fastapi", "express", "express.js", "node.js", "nodejs",
    "spring", "spring boot", "asp.net", "laravel", "ruby on rails",
    
    # Mobile Development
    "android", "ios", "react native", "flutter", "xamarin", "ionic",
    
    # Databases
    "mongodb", "postgresql", "mysql", "sqlite", "redis", "cassandra",
    "dynamodb", "oracle", "ms sql", "mariadb", "elasticsearch",
    "neo4j", "couchdb",
    
    # Cloud & DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "jenkins", "gitlab", "github actions", "terraform", "ansible",
    "vagrant", "ci/cd", "devops",
    
    # Data Science & AI
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
    "data analysis", "data science", "artificial intelligence", "ai",
    "neural networks", "transformers",
    
    # Tools & Technologies
    "git", "github", "gitlab", "bitbucket", "jira", "confluence",
    "docker", "kubernetes", "linux", "unix", "windows",
    "vs code", "visual studio", "intellij", "pycharm",
    
    # Methodologies
    "agile", "scrum", "kanban", "waterfall", "tdd", "test-driven development",
    "microservices", "rest api", "graphql", "soap",
    
    # Other Technical
    "api", "rest", "graphql", "websocket", "grpc",
    "oauth", "jwt", "authentication", "authorization",
    "testing", "unit testing", "integration testing", "qa"
}

SOFT_SKILLS = {
    "communication", "leadership", "teamwork", "team player", "collaboration",
    "problem solving", "critical thinking", "analytical", "creativity",
    "time management", "organization", "adaptability", "flexibility",
    "project management", "presentation", "public speaking",
    "negotiation", "conflict resolution", "decision making",
    "attention to detail", "multitasking", "self-motivated",
    "interpersonal", "customer service", "technical writing"
}

ALL_SKILLS = TECHNICAL_SKILLS | SOFT_SKILLS


def extract_skills(text: str, custom_skills: List[str] = None) -> List[str]:
    """
    Extract skills from resume text
    
    Args:
        text: Resume text
        custom_skills: Additional skills to search for
        
    Returns:
        List of found skills
    """
    if not text:
        return []
    
    text_lower = text.lower()
    found_skills = set()
    
    # Search for skills from database
    skills_to_search = ALL_SKILLS.copy()
    if custom_skills:
        skills_to_search.update(skill.lower() for skill in custom_skills)
    
    for skill in skills_to_search:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.add(skill)
    
    return sorted(list(found_skills))


def extract_education(text: str) -> List[Dict[str, str]]:
    """
    Extract education information from resume
    
    Args:
        text: Resume text
        
    Returns:
        List of education entries
    """
    if not text or not nlp:
        return []
    
    education_keywords = [
        "bachelor", "master", "phd", "doctorate", "diploma", "degree",
        "university", "college", "universiti", "institute", "school",
        "b.s.", "m.s.", "b.a.", "m.a.", "b.sc", "m.sc", "b.tech", "m.tech",
        "undergraduate", "graduate", "postgraduate"
    ]
    
    doc = nlp(text)
    education = []
    
    for sent in doc.sents:
        sent_lower = sent.text.lower()
        
        # Check if sentence contains education keywords
        if any(keyword in sent_lower for keyword in education_keywords):
            # Extract degree type
            degree_type = "Unknown"
            if any(word in sent_lower for word in ["bachelor", "b.s.", "b.a.", "b.sc", "b.tech", "undergraduate"]):
                degree_type = "Bachelor"
            elif any(word in sent_lower for word in ["master", "m.s.", "m.a.", "m.sc", "m.tech", "graduate"]):
                degree_type = "Master"
            elif any(word in sent_lower for word in ["phd", "doctorate", "ph.d.", "postgraduate"]):
                degree_type = "PhD"
            
            education.append({
                "text": sent.text.strip(),
                "type": degree_type
            })
    
    return education[:5]  # Return top 5 education entries


def extract_experience_years(text: str) -> int:
    """
    Extract years of experience from resume
    
    Args:
        text: Resume text
        
    Returns:
        Estimated years of experience
    """
    if not text:
        return 0
    
    text_lower = text.lower()
    max_years = 0
    
    # Pattern 1: "5 years", "5+ years", "5-7 years"
    pattern1 = r'(\d+)\+?\s*(?:-\s*\d+)?\s*years?\s*(?:of)?\s*(?:experience)?'
    matches1 = re.findall(pattern1, text_lower)
    if matches1:
        max_years = max(max_years, max(int(m) for m in matches1))
    
    # Pattern 2: "experienced" mentioned with years
    pattern2 = r'(\d+)\+?\s*years'
    matches2 = re.findall(pattern2, text_lower)
    if matches2:
        max_years = max(max_years, max(int(m) for m in matches2))
    
    # Pattern 3: Estimate from date ranges (e.g., "2018-2023")
    pattern3 = r'(20\d{2})\s*-\s*(20\d{2}|present|current)'
    matches3 = re.findall(pattern3, text_lower)
    if matches3:
        for start, end in matches3:
            start_year = int(start)
            end_year = 2024 if end in ['present', 'current'] else int(end)
            years = end_year - start_year
            max_years = max(max_years, years)
    
    return min(max_years, 50)  # Cap at 50 years for sanity


def extract_email(text: str) -> str:
    """
    Extract email address from resume
    
    Args:
        text: Resume text
        
    Returns:
        Email address or empty string
    """
    if not text:
        return ""
    
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    matches = re.findall(email_pattern, text)
    
    return matches[0] if matches else ""


def extract_phone(text: str) -> str:
    """
    Extract phone number from resume
    
    Args:
        text: Resume text
        
    Returns:
        Phone number or empty string
    """
    if not text:
        return ""
    
    # Pattern for various phone formats
    phone_patterns = [
        r'\+?[\d\s\-\(\)]{10,}',  # General pattern
        r'\+60[\d\s\-]{8,}',  # Malaysian format
        r'\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}',  # US format
    ]
    
    for pattern in phone_patterns:
        matches = re.findall(pattern, text)
        if matches:
            # Clean up the phone number
            phone = re.sub(r'[^\d+]', '', matches[0])
            if len(phone) >= 10:
                return matches[0].strip()
    
    return ""


def analyze_resume(text: str, custom_skills: List[str] = None) -> Dict:
    """
    Complete resume analysis
    
    Args:
        text: Resume text
        custom_skills: Additional skills to search for
        
    Returns:
        Dictionary with all extracted information
    """
    if not text:
        return {
            "skills": [],
            "education": [],
            "experience_years": 0,
            "email": "",
            "phone": "",
            "text_length": 0,
            "word_count": 0
        }
    
    return {
        "skills": extract_skills(text, custom_skills),
        "education": extract_education(text),
        "experience_years": extract_experience_years(text),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "text_length": len(text),
        "word_count": len(text.split())
    }

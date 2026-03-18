# AI Resume Matcher - Python Module

Python-based AI module for resume parsing, skill extraction, and candidate ranking.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

3. Configure environment:
```bash
copy .env.example .env
```

4. Run the server:
```bash
python main.py
```

Server runs on: http://localhost:8000

## API Endpoints

- `GET /` - Health check
- `POST /api/parse-resume` - Parse uploaded resume
- `POST /api/analyze` - Analyze resume against job
- `POST /api/rank-candidates` - Rank multiple candidates

## Tech Stack

- FastAPI - Web framework
- spaCy - NLP and skill extraction
- scikit-learn - Text similarity (TF-IDF)
- PyPDF2 - PDF parsing
- python-docx - DOCX parsing

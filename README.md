# AI-Based HR Resume Recommender System

> An AI-powered full-stack recruitment platform that automatically screens, ranks, and shortlists candidates using NLP and machine learning — so HR professionals can focus on people, not paperwork.

![Status](https://img.shields.io/badge/Status-Fully%20Functional-brightgreen)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)
![Python](https://img.shields.io/badge/AI-FastAPI%20%2B%20Python-blue)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen)

---

## 📁 Project Structure

```
hr-resume-recommender/
├── frontend/                    # Vanilla HTML/CSS/JS Frontend (served by backend)
│   ├── index.html               # Landing page (premium dark theme)
│   ├── config.js                # API base URL config
│   ├── candidate/               # Candidate portal
│   │   ├── candidate-login.html
│   │   ├── candidate-register.html
│   │   ├── job-listing.html     # Browse jobs with search & filter
│   │   ├── resume-upload.html   # Resume drag-and-drop upload
│   │   ├── profile.html         # Candidate profile management
│   │   └── applications.html    # Application status tracking
│   ├── hr/                      # HR portal
│   │   ├── hr-login.html
│   │   ├── dashboard.html       # HR dashboard with stats
│   │   ├── manage-jobs.html     # Create, edit, and manage job postings
│   │   └── candidate-ranking.html  # AI-ranked candidate list
│   ├── css/                     # Global stylesheets
│   ├── js/                      # Shared JS utilities (auth.js)
│   └── images/                  # Logos and assets
│
├── backend/                     # Node.js + Express API Server
│   ├── src/
│   │   ├── config/              # DB and environment config
│   │   ├── models/              # Mongoose models (User, Job, Application)
│   │   ├── routes/              # Express routes (auth, hr, candidates)
│   │   ├── controllers/         # Business logic
│   │   ├── middleware/          # JWT auth & Multer file upload
│   │   └── services/            # AI module integration (aiService.js)
│   ├── uploads/                 # Uploaded resume files
│   ├── server.js                # Entry point — also serves frontend
│   └── package.json
│
├── ai-module/                   # Python FastAPI AI Microservice
│   ├── parsers/                 # PDF and DOCX text extractors
│   ├── analyzers/               # Skill extractor + job matcher
│   ├── main.py                  # FastAPI app entry point
│   └── requirements.txt
│
└── test-resume/                 # Sample resumes for testing
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | v16+ |
| MongoDB | v5+ (running locally) |
| Python | v3.8+ |
| pip | latest |

---

### Step 1 — Start MongoDB

```bash
# Windows (if MongoDB is installed as a service)
net start MongoDB

# Or run manually
mongod
```

---

### Step 2 — Start the Backend

The backend also **serves the frontend** — no separate frontend server needed.

```bash
cd backend

# Install dependencies (first time only)
npm install

# Start development server (with auto-reload)
npm run dev
```

✅ Backend + Frontend running at: **http://localhost:5000**

---

### Step 3 — Start the AI Module

```bash
cd ai-module

# Install Python dependencies (first time only)
pip install -r requirements.txt

# Start AI service with auto-reload
python -m uvicorn main:app --reload --port 8000
```

✅ AI Module running at: **http://localhost:8000**  
📖 Interactive API docs: **http://localhost:8000/docs**

---

### Step 4 — Access the Application

| Page | URL |
|------|-----|
| 🌐 Landing Page | http://localhost:5000 |
| 🏢 HR Login | http://localhost:5000/hr/hr-login.html |
| 👤 Candidate Login | http://localhost:5000/candidate/candidate-login.html |
| 🤖 AI API Docs | http://localhost:8000/docs |

---

## 🎯 Features

### 🏢 HR Portal
- **Secure Authentication** — JWT-based login and session management
- **Dashboard** — Live stats: active jobs, total candidates, top match scores, recent applications
- **Job Management** — Create, edit, and close job postings with skills, education, salary, and location requirements
- **AI Candidate Ranking** — Candidates automatically ranked by AI match score per job
  - Skills match (60%) + Education match (40%)
  - Domain-independent: works for IT, Marketing, Finance, Healthcare, etc.
  - Configurable score threshold (default: 40%) — filter out unqualified candidates
  - Match breakdown: matched skills, missing skills, education match
- **Application Status Management** — Shortlist, mark as reviewed, or reject applicants

### 👤 Candidate Portal
- **Secure Registration & Login**
- **Browse Jobs** — Search by title/skills, filter by location and employment type, live results count
- **Resume Upload** — Drag-and-drop PDF/DOCX upload with AI extraction
- **My Profile** — Manage career info, education, LinkedIn, and skills tags
- **My Applications** — Track application status and AI match scores in real-time
- **Apply in One Click** — Resume required before applying (guided prompt)

### 🤖 AI Matching Engine
- **Resume Parsing** — Extracts text from PDF and DOCX files
- **Skill Extraction** — Pattern-based skill detection with expandable keyword libraries
- **Education Matching** — Weighted comparison of required vs. candidate education level
- **Semantic Skills Matching** — Fuzzy matching across skill synonyms
- **Composite Scoring** — Education (40%) + Skills (60%) = Final Match Score
- **Threshold Filtering** — Per-job configurable minimum score

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+), Inter / Roboto fonts |
| **Backend** | Node.js, Express.js, Mongoose ODM |
| **Database** | MongoDB |
| **Auth** | JWT (jsonwebtoken), bcrypt |
| **File Upload** | Multer (resume storage) |
| **AI Module** | Python, FastAPI, Uvicorn |
| **NLP** | PyPDF2, python-docx, scikit-learn (optional), spaCy (optional) |
| **HTTP Client** | Axios (backend → AI module) |

---

## 📊 Database Collections

### `users`
```js
{
  email: String,          // unique
  password: String,       // bcrypt hashed
  fullName: String,
  phone: String,
  role: 'HR' | 'CANDIDATE',
  createdAt: Date
}
```

### `candidateprofiles`
```js
{
  userId: ObjectId,
  resumePath: String,
  skills: [String],
  education: { level: String },
  yearsOfExperience: Number,
  linkedinUrl: String
}
```

### `jobs`
```js
{
  title: String,
  hrId: ObjectId,
  description: String,
  requirements: {
    skills: [String],
    education: String,
    experience: Number,
    location: String
  },
  salary: { min: Number, max: Number },
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP',
  filteringThreshold: Number,   // default: 40
  status: 'ACTIVE' | 'CLOSED',
  postedDate: Date
}
```

### `applications`
```js
{
  candidateId: ObjectId,
  jobId: ObjectId,
  status: 'PENDING' | 'SHORTLISTED' | 'REVIEWED' | 'REJECTED',
  matchScore: Number,
  educationMatch: Boolean,
  skillsMatched: [String],
  skillsMissing: [String],
  appliedAt: Date
}
```

---

## 🧪 Test Accounts

> Run `node setup-demo-scenarios.js` from the `backend/` folder to create these accounts before testing.

### HR Account
| Field | Value |
|-------|-------|
| Email | `hr@test.com` |
| Password | `password123` |

### Candidate Accounts
| Email | Password | Expected Match |
|-------|----------|----------------|
| `andi.razif@demo.com` | `Demo@1234` | ~88% — High match (Bachelor CS, 3yr exp, React/Node/MongoDB) |
| `siti.hajar@demo.com` | `Demo@1234` | ~28% — Low match (SPM, no dev experience) |

### Demo Flow
1. Run `node setup-demo-scenarios.js` to set up accounts and the **Junior Software Engineer (Demo)** job
2. Login as **Andi** → upload `resume_andi_bin_razif.pdf` → Apply
3. Login as **Siti Hajar** → upload `resume_siti_hajar.pdf` → Apply
4. Login as **HR Manager** → Candidate Ranking → observe AI scores and filtering


---

## 📝 Environment Configuration

### `backend/.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hr-resume-matcher
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
AI_MODULE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### `frontend/config.js`
```js
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000'
};
```

---

## 📡 Key API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register HR or Candidate |
| POST | `/api/auth/login` | Login and receive JWT |

### HR Routes (🔒 JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hr/dashboard` | Dashboard stats |
| POST | `/api/hr/jobs` | Create job posting |
| GET | `/api/hr/jobs` | List all jobs |
| PUT | `/api/hr/jobs/:id` | Edit job posting |
| GET | `/api/hr/jobs/:id/candidates` | Get AI-ranked candidates |
| PUT | `/api/hr/applications/:id/status` | Update application status |

### Candidate Routes (🔒 JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates/jobs` | Browse active jobs |
| POST | `/api/candidates/apply` | Submit job application |
| GET | `/api/candidates/applications` | My applications |
| GET | `/api/candidates/profile` | Get profile |
| PUT | `/api/candidates/profile` | Update profile |
| POST | `/api/candidates/upload-resume` | Upload resume |

### AI Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Analyse resume vs. job requirements |
| POST | `/upload` | Upload and parse resume file |
| GET | `/health` | Health check |

---

## 🔒 Security

- ✅ Passwords hashed with **bcrypt**
- ✅ **JWT** token authentication (7-day expiry)
- ✅ Role-based access control (HR vs. Candidate)
- ✅ Protected API routes via middleware
- ✅ File upload validation (type + size limits)
- ✅ CORS configured for trusted origins
- ✅ Environment variables for secrets

---

## 🎓 About

**Final Year Project** — AI-Based HR Resume Recommender System

Built to demonstrate domain-independent AI matching that works across all industries without model retraining, using a microservice architecture for scalability.

---

**Last Updated:** March 2026  
**Status:** ✅ Fully Functional

# AI-Based HR Resume Recommender System

Complete full-stack application for AI-powered resume matching and candidate ranking.

## 📁 Project Structure

```
Prototype/
├── frontend/                   # Frontend Application
│   ├── candidate/             # Candidate portal pages
│   ├── hr/                    # HR portal pages
│   ├── css/                   # Stylesheets
│   ├── js/                    # JavaScript files
│   ├── assets/                # Images and static assets
│   ├── index.html             # Landing page
│   ├── config.js              # Frontend configuration
│   └── favicon.ico
│
├── backend/                    # Node.js + Express Backend
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── models/            # Mongoose models
│   │   ├── routes/            # Express routes
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Auth & upload middleware
│   │   └── services/          # AI service integration
│   ├── uploads/               # Resume storage
│   ├── server.js              # Entry point
│   ├── package.json
│   └── README.md
│
├── ai-module/                  # Python AI Microservice (TBD)
│   └── (to be implemented)
│
└── Documentation files
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16+)
- **MongoDB** (v5+)
- **Python** (v3.8+) - for AI module
- Modern web browser

### 1. Start Backend

```bash
# Navigate to backend
cd backend

# Install dependencies (if not done)
npm install

# Start MongoDB
mongod

# Run server
npm run dev
```

Backend runs on: **http://localhost:5000**

### 2. Start Frontend

```bash
# Navigate to frontend
cd frontend

# Open with Live Server (VS Code extension)
# Or use any static file server
# Or simply open index.html in browser
```

Frontend runs on: **http://127.0.0.1:5500** (or your server port)

### 3. Configure Frontend

Update `frontend/config.js` with backend URL:

```javascript
const API_BASE_URL = 'http://localhost:5000';
```

## 🎯 Features

### HR Portal
- ✅ Job posting management
- ✅ Candidate ranking and filtering
- ✅ Dashboard with statistics
- ✅ Resume viewing
- ⏳ AI-powered candidate matching (pending AI module)

### Candidate Portal
- ✅ Job browsing and search
- ✅ Resume upload
- ✅ Job application
- ✅ Application tracking
- ⏳ AI match score display (pending AI module)

### Backend API
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ MongoDB integration
- ✅ File upload handling
- ✅ RESTful API design
- ⏳ AI module integration (ready, pending Python service)

## 📚 Documentation

- **Backend API**: See `backend/README.md`
- **Frontend**: See `frontend/` directory
- **API Integration**: See `API_INTEGRATION.md`
- **Deployment**: See `DEPLOYMENT.md`

## 🔧 Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- No framework (vanilla JS)
- Responsive design

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Multer (file upload)

### AI Module (Pending)
- Python + FastAPI/Flask
- spaCy (NLP)
- TensorFlow / scikit-learn
- PDF/DOCX parsing

## 🧪 Testing

### Test Backend
```bash
# Health check
curl http://localhost:5000/health

# Register HR user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@test.com",
    "password": "password123",
    "role": "HR",
    "fullName": "Test HR"
  }'
```

### Test Frontend
1. Open `http://127.0.0.1:5500/frontend/`
2. Navigate to HR or Candidate portal
3. Test registration and login
4. Test job posting (HR) or job browsing (Candidate)

## 📝 Next Steps

1. **Build Python AI Module**
   - Resume parsing (PDF/DOCX)
   - Skill extraction with NLP
   - Ranking algorithm (TF-IDF, Word2Vec)

2. **Connect Frontend to Backend**
   - Update API calls in frontend
   - Implement JWT token management
   - Test end-to-end flows

3. **Deploy**
   - Backend to cloud platform
   - MongoDB to Atlas
   - Frontend to static hosting

## 🤝 Development

### Project Organization
- **frontend/** - Contains all static files for the UI
- **backend/** - Contains API server code
- **ai-module/** - Will contain Python AI service

### Git Workflow
```bash
# Clone repository
git clone <repo-url>

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies (if any)
cd ../frontend

# Start development
# (Backend in one terminal, frontend in another)
```

## 📄 License

MIT

## 👥 Contributors

FYP Project - AI-Based HR Resume Recommender System

---

**Note**: This is a full-stack application following microservice architecture as specified in the project proposal.

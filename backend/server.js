/**
 * server.js — Main Entry Point for the AI-Based HR Resume Recommender System
 *
 * This file sets up the Express web server, connects to MongoDB,
 * registers all API routes, and starts listening for requests.
 *
 * Architecture:
 *   Browser (Frontend HTML/JS)
 *     ↓ HTTP requests
 *   Express Server (this file)
 *     ↓ routes
 *   Controllers (business logic)
 *     ↓ queries
 *   MongoDB (data storage)
 *     ↓ AI scoring (optional)
 *   Python AI Module (Flask)
 */

const express = require('express');  // Express — Node.js web framework
const cors    = require('cors');     // CORS — allows frontend on a different origin to call the API
const morgan  = require('morgan');   // Morgan — HTTP request logger for debugging
const dotenv  = require('dotenv');   // dotenv — loads environment variables from .env file
const path    = require('path');     // path — Node.js built-in for file-system paths
const connectDB = require('./src/config/database'); // our MongoDB connection helper

// ─────────────────────────────────────────────────────────
// 1. LOAD ENVIRONMENT VARIABLES
//    Reads values like PORT, MONGODB_URI, JWT_SECRET from .env file
// ─────────────────────────────────────────────────────────
dotenv.config();

// ─────────────────────────────────────────────────────────
// 2. CONNECT TO MONGODB
//    Establishes connection to the MongoDB database
//    before the server starts handling requests
// ─────────────────────────────────────────────────────────
connectDB();

// ─────────────────────────────────────────────────────────
// 3. INITIALISE EXPRESS APPLICATION
// ─────────────────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────────────────
// 4. GLOBAL MIDDLEWARE
//    Middleware runs on every request before it reaches a route
// ─────────────────────────────────────────────────────────

// CORS — Cross-Origin Resource Sharing
// Allows the frontend (served from the same server or a different port)
// to make API calls to this backend
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // In development mode, allow ALL origins (useful when opening HTML files directly)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, only allow the configured frontend URL
    const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true  // Allow cookies / Authorization headers to be sent
}));

app.use(express.json());                    // Parse JSON request bodies (e.g. from fetch/axios)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded form data
app.use(morgan('dev'));                     // Log each HTTP request to the console (method, URL, status, time)

// ─────────────────────────────────────────────────────────
// 5. STATIC FILE SERVING
//    Serves uploaded resumes and frontend HTML files directly
// ─────────────────────────────────────────────────────────

// Serve uploaded resume files (PDFs) at /uploads/...
// e.g. http://localhost:5000/uploads/resumes/resume.pdf
app.use('/uploads', express.static('uploads'));

// Serve the frontend HTML/CSS/JS files at the root URL
// e.g. http://localhost:5000/hr/dashboard.html
app.use(express.static(path.join(__dirname, '../frontend')));

// ─────────────────────────────────────────────────────────
// 6. API ROUTES
//    Each route group is handled by its own router file
// ─────────────────────────────────────────────────────────

// Authentication routes — /api/auth/register, /api/auth/login
app.use('/api/auth', require('./src/routes/auth'));

// HR routes — /api/hr/jobs, /api/hr/jobs/:id/candidates, etc.
app.use('/api/hr', require('./src/routes/hr'));

// Candidate routes — /api/candidates/jobs, /api/candidates/apply, etc.
app.use('/api/candidates', require('./src/routes/candidate'));

// ─────────────────────────────────────────────────────────
// 7. UTILITY ENDPOINTS
// ─────────────────────────────────────────────────────────

// Health check — used to verify the server is alive
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HR Resume Matcher API is running',
    timestamp: new Date().toISOString()
  });
});

// Root API info endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI-Based HR Resume Recommender System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      hr: '/api/hr',
      candidates: '/api/candidates'
    }
  });
});

// ─────────────────────────────────────────────────────────
// 8. ERROR HANDLING MIDDLEWARE
//    Catches any errors thrown inside route handlers
//    Must be the LAST middleware registered
// ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only expose stack trace in development (not in production)
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler — if no route matched the request
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ─────────────────────────────────────────────────────────
// 9. START THE SERVER
//    PORT defaults to 5000 if not set in .env
// ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🤖 AI Module URL: ${process.env.AI_MODULE_URL}`);
});

/**
 * aiService.js — AI Module Communication Service
 *
 * This service acts as the bridge between the Node.js backend and
 * the Python AI Module (Flask server). It sends resume files and
 * job data to the AI module, which returns match scores.
 *
 * ─── System Architecture ─────────────────────────────────────────
 *
 *   Node.js Backend (Express)
 *        │
 *        │  HTTP POST via axios
 *        ▼
 *   Python AI Module (Flask) — runs on a separate port (default: 8000)
 *        │
 *        │  NLP processing:
 *        │    1. Extract text from PDF resume (pdfplumber)
 *        │    2. Extract skills with spaCy / keyword matching
 *        │    3. Compare against job requirements
 *        │    4. Calculate weighted match scores
 *        ▼
 *   Returns JSON with: overall_score, breakdown (skill_match, education_score, experience_match)
 *
 * ─── Score Calculation ───────────────────────────────────────────
 *
 *   Overall Match Score = weighted average of:
 *     • Skills Score     (weight: 50%) — % of job skills found in resume
 *     • Education Score  (weight: 30%) — does candidate meet education requirement?
 *     • Experience Score (weight: 20%) — does candidate have enough years of experience?
 *
 * ─── Fallback Behaviour ──────────────────────────────────────────
 *
 *   If the Python AI module is offline or returns an error,
 *   functions fall back to returning a random score (60–100%).
 *   This prevents the system from crashing if the AI is unavailable.
 */

const axios  = require('axios');   // axios — HTTP client for calling the Python AI module
const config = require('../config/config'); // config.aiModuleUrl = 'http://localhost:8000'

class AIService {

  constructor() {
    // Base URL of the Python AI Flask server (set in .env as AI_MODULE_URL)
    this.baseURL = config.aiModuleUrl;
  }

  // ──────────────────────────────────────────────────────────────────
  // parseResume()
  //
  // Sends a resume file to the AI module for text extraction and parsing.
  // Currently returns mock data — full implementation calls the AI endpoint.
  //
  // @param {string} filePath - Server path to the uploaded PDF resume
  // @returns {Object} Parsed resume data (education, skills, experience, text)
  // ──────────────────────────────────────────────────────────────────
  async parseResume(filePath) {
    try {
      // TODO: Implement when AI module is ready
      // When enabled, this would POST the file path to:
      // POST http://localhost:8000/api/ai/parse-resume
      // and get back structured data extracted from the PDF

      // Temporary mock response (used during development)
      console.log(`AI Module would parse resume: ${filePath}`);
      return {
        education: {
          level: "Bachelor's Degree",
          field: "Computer Science",
          institution: "University of Malaysia"
        },
        skills: ["JavaScript", "Python", "React", "Node.js"],
        experience: [
          {
            company:  "Tech Company",
            position: "Software Developer",
            duration: "2 years"
          }
        ],
        extractedText: "Resume text would be here..."
      };
    } catch (error) {
      console.error('AI Module - Parse Resume Error:', error.message);
      throw new Error('Failed to parse resume');
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // rankCandidates()
  //
  // Ranks ALL candidates who applied to a specific job in one batch call.
  // Used by hrController.getRankedCandidates() to refresh scores
  // when HR views the candidate ranking page.
  //
  // Steps:
  //   1. Convert candidate resume paths to absolute file paths
  //   2. Prepare job data object for the AI module
  //   3. POST to Python AI module → /api/rank-candidates
  //   4. Map AI results back to candidate IDs
  //   5. If AI fails → return random fallback scores
  //
  // @param {Object} job        - The Job document from MongoDB
  // @param {Array}  candidates - Array of Candidate profile documents
  // @returns {Array} Array of { candidateId, matchScore, rankingDetails }
  // ──────────────────────────────────────────────────────────────────
  async rankCandidates(job, candidates) {
    try {
      const path = require('path');

      // Step 1: Convert relative resume paths to absolute paths
      // The AI module needs absolute paths to read the PDF files
      // e.g. 'uploads/resumes/file.pdf' → 'C:/project/backend/uploads/resumes/file.pdf'
      const resumePaths = candidates
        .map(c => {
          if (!c.resumePath) return null;
          const absolutePath = path.join(__dirname, '../../', c.resumePath);
          console.log(`📁 Converting path: ${c.resumePath} -> ${absolutePath}`);
          return absolutePath;
        })
        .filter(path => path);  // remove null entries (candidates with no resume)

      // If no candidates have resumes, return all zeros immediately
      if (resumePaths.length === 0) {
        console.log('No resumes available for ranking');
        return candidates.map(candidate => ({
          candidateId:    candidate._id,
          matchScore:     0,
          rankingDetails: { educationScore: 0, skillsScore: 0, experienceScore: 0 }
        }));
      }

      // Step 2: Prepare job requirements in the format the AI module expects
      const jobData = {
        description:         job.description || '',
        skills:              job.requirements?.skills || [],         // array of required skills
        required_experience: job.requirements?.experience || 0,     // minimum years
        preferred_experience:job.requirements?.experience || 0,
        required_education:  job.requirements?.education || ''      // e.g. 'bachelor'
      };

      console.log('🤖 AI Module - Job Data:', JSON.stringify(jobData, null, 2));
      console.log('📄 AI Module - Resume Paths:', resumePaths);

      // Step 3: Call the Python AI module
      // POST /api/rank-candidates → returns ranked_candidates array
      const response = await axios.post(`${this.baseURL}/api/rank-candidates`, {
        resume_paths: resumePaths,  // list of absolute PDF paths
        job_data:     jobData       // job requirements object
      });

      console.log('✅ AI Module Response:', response.data);

      if (response.data.success) {
        // Step 4: Map AI results (which use file paths) back to MongoDB candidate IDs
        // Build a lookup map: absoluteFilePath → candidateId
        const pathToCandidateMap = {};
        candidates.forEach(candidate => {
          if (candidate.resumePath) {
            const absolutePath = require('path').join(__dirname, '../../', candidate.resumePath);
            pathToCandidateMap[absolutePath] = candidate._id;
          }
        });

        // Transform AI response format to our database format
        // AI returns: overall_score, breakdown.education_score, breakdown.skill_match, breakdown.experience_match
        // We store: matchScore, rankingDetails.educationScore, skillsScore, experienceScore
        const transformedResults = response.data.ranked_candidates.map(aiResult => {
          const candidateId = pathToCandidateMap[aiResult.resume_path];

          return {
            candidateId: candidateId,
            // Cap scores at 100% to handle any AI over-scoring
            matchScore: Math.min(100, Math.round(aiResult.overall_score || 0)),
            rankingDetails: {
              educationScore:  Math.min(100, Math.round(aiResult.breakdown?.education_score || 0)),
              skillsScore:     Math.min(100, Math.round(aiResult.breakdown?.skill_match || 0)),
              experienceScore: Math.min(100, Math.round(aiResult.breakdown?.experience_match || 0))
            }
          };
        });

        console.log('🔄 Transformed results:', transformedResults);
        return transformedResults;
      } else {
        throw new Error(response.data.error || 'AI ranking failed');
      }

    } catch (error) {
      console.error('AI Module - Rank Candidates Error:', error.message);

      // Step 5: FALLBACK — if AI module is down, return random scores
      // This prevents the system from crashing during development/demo
      // In production, this would ideally return 0 instead of random scores
      console.log(`Falling back to mock scores for ${candidates.length} candidates`);
      return candidates.map(candidate => ({
        candidateId: candidate._id,
        matchScore:  Math.floor(Math.random() * 40) + 60, // random 60–100%
        rankingDetails: {
          educationScore:  Math.floor(Math.random() * 30) + 70,
          skillsScore:     Math.floor(Math.random() * 30) + 70,
          experienceScore: Math.floor(Math.random() * 30) + 70
        }
      }));
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // calculateMatchScore()
  //
  // Calculates the AI match score for a SINGLE candidate applying to a job.
  // Called by candidateController.applyToJob() at the moment of application.
  //
  // This is triggered each time a candidate hits the "Apply" button.
  // The score is stored in the Application document for future display.
  //
  // @param {Object} job        - The Job document from MongoDB
  // @param {string} resumePath - Relative path to the candidate's PDF resume
  // @returns {Object} { matchScore, rankingDetails: { educationScore, skillsScore, experienceScore } }
  // ──────────────────────────────────────────────────────────────────
  async calculateMatchScore(job, resumePath) {
    try {
      // If candidate has not yet uploaded a resume, return zero scores
      if (!resumePath) {
        return {
          matchScore:     0,
          rankingDetails: { educationScore: 0, skillsScore: 0, experienceScore: 0 }
        };
      }

      // Prepare the job data in the format expected by the Python AI module
      const jobData = {
        description:         job.description || '',
        skills:              job.requirements?.skills || [],
        required_experience: job.requirements?.experience || 0,
        preferred_experience:job.requirements?.experience || 0,
        required_education:  job.requirements?.education || ''
      };

      // Send single resume to AI module for scoring
      // The AI module accepts an array of paths even for single resumes
      const response = await axios.post(`${this.baseURL}/api/rank-candidates`, {
        resume_paths: [resumePath],
        job_data:     jobData
      });

      // Parse and return the first (and only) result
      if (response.data.success && response.data.ranked_candidates?.length > 0) {
        const result = response.data.ranked_candidates[0];
        return {
          matchScore: Math.min(100, Math.round(result.overall_score || 0)),
          rankingDetails: {
            educationScore:  Math.min(100, Math.round(result.breakdown?.education_score || 0)),
            skillsScore:     Math.min(100, Math.round(result.breakdown?.skill_match || 0)),
            experienceScore: Math.min(100, Math.round(result.breakdown?.experience_match || 0))
          }
        };
      } else {
        throw new Error(response.data.error || 'AI analysis returned no results');
      }

    } catch (error) {
      console.error('AI Module - Calculate Match Score Error:', error.message);

      // Fallback: return a random score if AI module is offline
      // This ensures the system continues working during development/demo
      return {
        matchScore: Math.floor(Math.random() * 40) + 60,
        rankingDetails: {
          educationScore:  Math.floor(Math.random() * 30) + 70,
          skillsScore:     Math.floor(Math.random() * 30) + 70,
          experienceScore: Math.floor(Math.random() * 30) + 70
        }
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // healthCheck()
  //
  // Pings the Python AI module to check if it's running.
  // Used to show AI status in the dashboard.
  //
  // @returns {Boolean} true if AI module is reachable, false otherwise
  // ──────────────────────────────────────────────────────────────────
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('AI Module is not available');
      return false;
    }
  }
}

// Export a single shared instance (Singleton pattern)
// All parts of the backend share the same AIService instance
module.exports = new AIService();

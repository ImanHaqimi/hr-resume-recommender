/**
 * Candidate.js — Mongoose Model for Candidate Profiles
 *
 * This model stores the career profile information for each candidate.
 * It is separate from the User model (which only stores login credentials).
 *
 * Relationship:
 *   User (login info) → 1-to-1 → Candidate (career profile)
 *   The 'userId' field links back to the User document.
 *
 * The AI module uses the 'resumeText' field (extracted text from the PDF)
 * along with 'skills', 'education', and 'yearsOfExperience' to calculate
 * match scores when a candidate applies for a job.
 */

const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({

  // Reference to the User account — links career profile to login credentials
  userId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId — a unique 12-byte identifier
    ref: 'User',      // 'ref' enables Mongoose's .populate() to join with the User collection
    required: true,
    unique: true      // One user can only have one candidate profile
  },

  // Education object — stores the candidate's highest qualification
  education: {
    level: {
      type: String,
      required: false  // Optional — candidates can update this later on their profile page
      // Expected values: 'high-school', 'diploma', 'bachelor', 'master', 'phd'
    },
    field: {
      type: String     // e.g. 'Computer Science', 'Business Administration'
    },
    institution: {
      type: String     // e.g. 'Universiti Malaya'
    },
    graduationYear: {
      type: Number     // e.g. 2023
    }
  },

  // Array of skill strings — used by the AI to calculate skills match score
  // e.g. ['Python', 'React', 'MongoDB', 'Machine Learning']
  skills: [{
    type: String,
    trim: true  // removes whitespace from each skill tag
  }],

  // Array of past job experience objects (full work history)
  // This is different from 'yearsOfExperience' which is a simple number
  experience: [{
    company:     String,  // e.g. 'Google'
    position:    String,  // e.g. 'Software Engineer Intern'
    duration:    String,  // e.g. '6 months' or 'Jan 2023 – Jun 2023'
    description: String   // brief description of responsibilities
  }],

  // File path to the uploaded resume PDF on the server
  // e.g. 'uploads/resumes/resume_1772763534.pdf'
  resumePath: {
    type: String
  },

  // Plain text extracted from the PDF resume by the AI module
  // This text is sent to the Python AI service for NLP-based scoring
  resumeText: {
    type: String
  },

  // LinkedIn profile URL (optional — used for HR reference)
  linkedinUrl: {
    type: String,
    trim: true
  },

  // Simple total years of experience (entered manually by the candidate)
  // Separate from the 'experience' array above — used for quick AI scoring
  yearsOfExperience: {
    type: Number,
    default: 0
  }

}, {
  // Automatically adds 'createdAt' and 'updatedAt' fields to every document
  timestamps: true
});

// Database index for faster lookup by userId
// This speeds up queries like: Candidate.findOne({ userId: req.user._id })
candidateSchema.index({ userId: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);

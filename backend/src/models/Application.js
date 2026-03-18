/**
 * Application.js — Mongoose Model for Job Applications
 *
 * This model represents a single candidate's application to a specific job.
 * It is the central link between candidates and jobs, and stores:
 *   - The AI-calculated match score
 *   - Score breakdown by category (skills, experience, education)
 *   - The HR's decision (status: PENDING → SHORTLISTED / REVIEWED / REJECTED)
 *   - The date the application was submitted
 *
 * Relationships:
 *   One Job      → Many Applications
 *   One Candidate → Many Applications (one per job — enforced by unique index)
 *
 * Data Flow:
 *   1. Candidate clicks "Apply" on a job
 *   2. candidateController.applyToJob() creates a new Application document
 *   3. AI module calculates matchScore and rankingDetails
 *   4. HR views ranked list → hrController.getRankedCandidates()
 *   5. HR updates status → hrController.updateApplicationStatus()
 */

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({

  // Reference to the job this application belongs to
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',       // enables .populate('jobId') to get full job details
    required: true
  },

  // Reference to the User account of the candidate who applied
  // NOTE: this references the User model (not Candidate), because
  // Application was created before the Candidate profile system was added
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',      // enables .populate('candidateId') to get name/email
    required: true
  },

  // Current status of the application — updated by HR
  // Lifecycle: PENDING → REVIEWED → SHORTLISTED (or REJECTED)
  status: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED'],
    default: 'PENDING'  // all new applications start as PENDING
  },

  // ─────────────────────────────────────────────────────
  // AI MATCH SCORE (0–100)
  //
  // Calculated by aiService.calculateMatchScore() at the time of application.
  // Formula (weighted average):
  //   matchScore = (skillsScore × 0.50) + (educationScore × 0.30) + (experienceScore × 0.20)
  //
  // The ranking weights come from the Job's rankingWeights field.
  // Default: 0 if the AI module is unavailable or candidate has no resume
  // ─────────────────────────────────────────────────────
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Detailed score breakdown — shown as progress bars on the HR candidate card
  rankingDetails: {

    // How well the candidate's education level matches the job requirement
    // e.g. Job requires 'bachelor', candidate has 'master' → high score
    educationScore: {
      type: Number,
      default: 0
    },

    // Percentage of required skills the candidate possesses
    // e.g. Job needs [Python, SQL, React], candidate has [Python, SQL] → 66%
    skillsScore: {
      type: Number,
      default: 0
    },

    // How close the candidate's years of experience is to the requirement
    // e.g. Job needs 3 years, candidate has 5 years → 100% (exceeds requirement)
    experienceScore: {
      type: Number,
      default: 0
    }
  },

  // When the candidate submitted this application
  // Defaults to the current time when the document is created
  appliedDate: {
    type: Date,
    default: Date.now
  },

  // Optional internal notes added by HR (future feature)
  notes: {
    type: String
  }

}, {
  timestamps: true  // adds createdAt and updatedAt automatically
});

// ─────────────────────────────────────────────────────────
// DATABASE INDEXES
//
// Compound unique index — prevents a candidate from applying
// to the same job twice. MongoDB will reject duplicate inserts.
// ─────────────────────────────────────────────────────────
applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

// Index for fast retrieval of ranked candidates for a job (highest score first)
applicationSchema.index({ jobId: 1, matchScore: -1 });

// Index for fast retrieval of a candidate's application history
applicationSchema.index({ candidateId: 1, appliedDate: -1 });

module.exports = mongoose.model('Application', applicationSchema);

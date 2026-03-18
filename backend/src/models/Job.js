/**
 * Job.js — Mongoose Model for Job Postings
 *
 * This model stores all job postings created by HR users.
 * It defines the requirements that the AI module uses to score
 * candidate resumes against the job (skills, education, experience).
 *
 * Key concept — Ranking Weights:
 *   Each job has configurable weights that determine how much
 *   each factor contributes to the overall AI match score:
 *     - Skills Weight     (default: 50%) — most important
 *     - Education Weight  (default: 30%)
 *     - Experience Weight (default: 20%)
 *   Weights must add up to 100%.
 *
 * Relationships:
 *   One HR User → Many Jobs
 *   One Job → Many Applications (in the Application collection)
 */

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({

  // Reference to the HR user who posted this job
  // Used to ensure HRs can only see/edit their own jobs
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',    // joins with the User collection via .populate()
    required: true
  },

  // Job title displayed to candidates e.g. 'Software Engineer'
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },

  // Full job description — explains the role and responsibilities
  description: {
    type: String,
    required: [true, 'Job description is required']
  },

  // Requirements object — defines what the AI uses for candidate scoring
  requirements: {

    // Minimum education level required
    // e.g. 'bachelor', 'master', 'diploma', 'high-school'
    education: {
      type: String,
      required: true
    },

    // List of required technical/soft skills
    // The AI compares this list against the candidate's skills array
    // e.g. ['Python', 'React', 'SQL', 'Communication']
    skills: [{
      type: String,
      trim: true
    }],

    // Minimum years of experience required (number)
    // e.g. 2 means 'at least 2 years of experience'
    experience: {
      type: Number,
      default: 0
    },

    // Job location — displayed to candidates for filtering
    // e.g. 'Kuala Lumpur, Malaysia'
    location: {
      type: String,
      trim: true
    }
  },

  // Salary range shown to candidates
  salary: {
    min: {
      type: Number,
      required: true  // minimum salary in RM
    },
    max: {
      type: Number,
      required: true  // maximum salary in RM
    },
    currency: {
      type: String,
      default: 'RM'   // Malaysian Ringgit
    }
  },

  // Employment type — controls filtering on the candidate job listing page
  employmentType: {
    type: String,
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'],
    default: 'FULL_TIME'
  },

  // Job status — controls visibility to candidates
  // ACTIVE  → visible and accepting applications
  // CLOSED  → no longer accepting applications
  // DRAFT   → not yet published
  status: {
    type: String,
    enum: ['ACTIVE', 'CLOSED', 'DRAFT'],
    default: 'ACTIVE'
  },

  // ─────────────────────────────────────────────────────
  // AI RANKING CONFIGURATION
  // These weights control how the overall match score is calculated.
  // Formula: score = (skillsScore × skillsWeight + educationScore × educationWeight
  //                   + experienceScore × experienceWeight) / 100
  // ─────────────────────────────────────────────────────
  rankingWeights: {
    education: {
      type: Number,
      min: 0, max: 100,
      default: 30   // Education contributes 30% of the total score
    },
    skills: {
      type: Number,
      min: 0, max: 100,
      default: 50   // Skills contributes 50% of the total score (most important)
    },
    experience: {
      type: Number,
      min: 0, max: 100,
      default: 20   // Experience contributes 20% of the total score
    }
  },

  // Minimum match score threshold for a candidate to be shown in the qualified list
  // Candidates below this % are hidden by default (HR can toggle to see them)
  minimumMatchThreshold: {
    type: Number,
    min: 0,
    max: 100,
    default: 40  // default: candidates must score at least 40% to be considered
  },

  // Date the job was posted (auto-set to current date)
  postedDate: {
    type: Date,
    default: Date.now
  },

  // Optional — when the selected candidate is expected to start
  expectedStartDate: {
    type: Date
  }

}, {
  timestamps: true  // adds createdAt and updatedAt automatically
});

// ─────────────────────────────────────────────────────────
// DATABASE INDEXES — Improve query performance
//
// Compound index: quickly find all ACTIVE jobs posted by a specific HR
// e.g. Job.find({ hrId: '...', status: 'ACTIVE' })
// ─────────────────────────────────────────────────────────
jobSchema.index({ hrId: 1, status: 1 });
jobSchema.index({ status: 1, postedDate: -1 }); // candidates browse jobs sorted by newest first

module.exports = mongoose.model('Job', jobSchema);

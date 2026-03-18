/**
 * candidateController.js — Business Logic for Candidate Features
 *
 * This controller handles all actions available to job-seeking candidates:
 *   - Browsing/searching active job postings
 *   - Uploading their resume (PDF) to the server
 *   - Applying to jobs (triggers AI scoring pipeline)
 *   - Viewing their own application history and status
 *   - Updating their career profile (education, skills, experience)
 *
 * KEY FUNCTION: applyToJob()
 *   This is where the AI match score is calculated. When a candidate
 *   clicks "Apply", this function:
 *     1. Validates the job exists and is active
 *     2. Checks the candidate hasn't already applied
 *     3. Calls the Python AI module with the resume + job requirements
 *     4. Stores the match score and breakdown in the Application document
 *
 * Security: Candidate-specific routes require 'protect' + 'requireRole("CANDIDATE")' middleware.
 */

const Job         = require('../models/Job');         // Job model — for reading job details
const Application = require('../models/Application'); // Application model — tracks applications
const Candidate   = require('../models/Candidate');   // Candidate model — for resume/profile
const upload      = require('../middleware/upload');   // upload middleware — handles file uploads
const axios       = require('axios');                 // HTTP client (not used directly here)
const config      = require('../config/config');       // app configuration
const fs          = require('fs');                    // Node.js file system module
const aiService   = require('../services/aiService'); // AI module bridge — for match scoring


// @desc    Get all active jobs
// @route   GET /api/candidates/jobs
// @access  Public
exports.getActiveJobs = async (req, res) => {
  try {
    const { search, location, employmentType } = req.query;

    // Build filter
    let filter = { status: 'ACTIVE' };

    if (location) {
      filter['requirements.location'] = new RegExp(location, 'i');
    }

    if (employmentType) {
      filter.employmentType = employmentType;
    }

    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const jobs = await Job.find(filter)
      .populate('hrId', 'fullName email')
      .sort({ postedDate: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: { jobs }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs'
    });
  }
};

// @desc    Get a single job by ID
// @route   GET /api/candidates/jobs/:id
// @access  Public
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('hrId', 'fullName email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { job }
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job'
    });
  }
};

// @desc    Upload resume
// @route   POST /api/candidates/resume
// @access  Private (Candidate only)
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a resume file'
      });
    }

    const candidateProfile = await Candidate.findOne({ userId: req.user._id });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Save resume path
    candidateProfile.resumePath = req.file.path;

    // TODO: Call AI module to parse resume
    // For now, we'll save without parsing
    // In production, you would:
    // 1. Call AI module to extract text and parse resume
    // 2. Update candidateProfile with parsed data

    await candidateProfile.save();

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumePath: req.file.path,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading resume'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Apply to a job (CORE AI SCORING FUNCTION)
// @route   POST /api/candidates/apply
// @access  Private (Candidate only)
//
// This function is triggered when a candidate clicks the "Apply" button.
// It creates a new Application document and calculates the AI match score.
//
// AI Scoring Flow:
//   1. Find the candidate's Candidate profile (to get resumePath)
//   2. Convert the relative resumePath to an absolute file path
//   3. Send absoluteResumePath + job requirements to aiService.calculateMatchScore()
//   4. aiService calls the Python Flask AI module via HTTP POST
//   5. Python AI module runs NLP on the PDF and returns scores
//   6. Scores are stored in the Application document in MongoDB
// ─────────────────────────────────────────────────────────────────────
exports.applyToJob = async (req, res) => {
  try {
    const { jobId } = req.body; // job ID comes from the frontend form

    // Step 1: Verify the job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.status !== 'ACTIVE') {
      // Prevent applications to closed or draft jobs
      return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' });
    }

    // Step 2: Check for duplicate applications
    // The Application schema has a unique compound index on { jobId, candidateId }
    // but we also check here to give a clearer error message
    const existingApplication = await Application.findOne({
      jobId,
      candidateId: req.user._id // req.user is set by the 'protect' auth middleware
    });
    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'You have already applied to this job' });
    }

    // Step 3: Get the candidate's profile (to access their resume file path)
    const candidateProfile = await Candidate.findOne({ userId: req.user._id });

    // Step 4: Default scores (used if candidate has no resume or AI is offline)
    let matchScore = 0;
    let rankingDetails = { educationScore: 0, skillsScore: 0, experienceScore: 0 };

    // Step 5: Run AI scoring if the candidate has uploaded a resume
    if (candidateProfile?.resumePath) {
      try {
        const path = require('path');
        // Convert the stored relative path to an absolute path
        // e.g. 'uploads/resumes/file.pdf' -> 'C:/project/backend/uploads/resumes/file.pdf'
        const absoluteResumePath = path.join(__dirname, '../../', candidateProfile.resumePath);

        // Call the AI service which communicates with the Python AI module
        // Returns { matchScore: 85, rankingDetails: { educationScore: 90, skillsScore: 80, experienceScore: 75 } }
        const aiResult = await aiService.calculateMatchScore(job, absoluteResumePath);
        matchScore = aiResult.matchScore || 0;
        rankingDetails = aiResult.rankingDetails || rankingDetails;
        console.log(`✅ AI scoring complete for application: ${matchScore}%`);
      } catch (aiError) {
        // If the AI module fails, we still create the application with score 0
        // so candidates can apply even when AI is offline
        console.warn('⚠️ AI scoring failed, using 0:', aiError.message);
      }
    } else {
      // No resume uploaded yet — score will be 0 until resume is added
      console.log('⚠️ No resume found for candidate, match score set to 0');
    }

    // Step 6: Create the Application document in MongoDB with the calculated scores
    const application = await Application.create({
      jobId,
      candidateId: req.user._id,
      matchScore,        // overall AI match score (0-100)
      rankingDetails     // breakdown: { educationScore, skillsScore, experienceScore }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application }
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error submitting application' });
  }
};


// @desc    Get my applications
// @route   GET /api/candidates/applications
// @access  Private (Candidate only)
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .populate('jobId')
      .sort({ appliedDate: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: { applications }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

// @desc    Update candidate profile
// @route   PUT /api/candidates/profile
// @access  Private (Candidate only)
exports.updateProfile = async (req, res) => {
  try {
    const { education, skills, experience, linkedinUrl, yearsOfExperience } = req.body;

    let candidateProfile = await Candidate.findOne({ userId: req.user._id });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Update fields
    if (education) candidateProfile.education = education;
    if (skills) candidateProfile.skills = skills;
    if (experience) candidateProfile.experience = experience;
    if (linkedinUrl !== undefined) candidateProfile.linkedinUrl = linkedinUrl;
    if (yearsOfExperience !== undefined) candidateProfile.yearsOfExperience = yearsOfExperience;

    await candidateProfile.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { candidateProfile }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// @desc    Get candidate profile
// @route   GET /api/candidates/profile
// @access  Private (Candidate only)
exports.getProfile = async (req, res) => {
  try {
    const candidateProfile = await Candidate.findOne({ userId: req.user._id })
      .populate('userId', 'email fullName phone');

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { candidateProfile }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

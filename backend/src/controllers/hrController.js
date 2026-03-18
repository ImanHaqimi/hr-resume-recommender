/**
 * hrController.js — Business Logic for HR Features
 *
 * This controller handles all actions available to HR users:
 *   - Creating, reading, updating, deleting job postings
 *   - Viewing and ranking candidates who applied to their jobs
 *   - Updating application status (Shortlist / Review / Reject)
 *   - Exporting candidate data as a CSV file
 *   - Dashboard statistics
 *
 * Every function is an Express route handler with the signature:
 *   async (req, res) => { ... }
 * where:
 *   req = HTTP request (includes req.user from the auth middleware)
 *   res = HTTP response (used to send JSON back to the frontend)
 *
 * Security: All routes require the 'protect' + 'requireRole("HR")' middleware.
 * This ensures only authenticated HR users can call these functions.
 */

const Job         = require('../models/Job');         // Job model — for job postings
const Application = require('../models/Application'); // Application model — tracks who applied
const axios       = require('axios');                 // axios — HTTP client (used for AI module calls)
const config      = require('../config/config');       // app configuration (AI module URL, etc.)


// @desc    Create a new job posting
// @route   POST /api/hr/jobs
// @access  Private (HR only)
exports.createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      hrId: req.user._id
    };

    const job = await Job.create(jobData);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job }
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating job'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get all jobs posted by the currently logged-in HR
// @route   GET /api/hr/jobs
// @access  Private (HR only)
//
// Also calculates the number of applicants per job using MongoDB aggregation.
// This count is displayed on the Manage Jobs page.
// ─────────────────────────────────────────────────────────────────────
exports.getMyJobs = async (req, res) => {
  try {
    // Fetch all jobs where hrId matches the logged-in user's ID
    // Sort by newest first (-1 = descending)
    const jobs = await Job.find({ hrId: req.user._id }).sort({ createdAt: -1 });

    // Use MongoDB Aggregation to count applications per job
    // This avoids N+1 queries (querying DB once for all counts instead of once per job)
    const jobIds = jobs.map(j => j._id);
    const applicationCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },           // filter: only these job IDs
      { $group: { _id: '$jobId', count: { $sum: 1 } } } // group by jobId, count documents
    ]);

    // Build a lookup object: jobId (string) → applicant count
    const countMap = {};
    applicationCounts.forEach(a => { countMap[a._id.toString()] = a.count; });

    // Attach the applicant count to each job object
    const jobsWithCount = jobs.map(job => ({
      ...job.toObject(),              // convert Mongoose document to plain JS object
      applicantCount: countMap[job._id.toString()] || 0  // default to 0 if no applications
    }));

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: { jobs: jobsWithCount }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching jobs' });
  }
};


// @desc    Get a single job by ID
// @route   GET /api/hr/jobs/:id
// @access  Private (HR only)
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job belongs to this HR
    if (job.hrId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this job'
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

// @desc    Update a job
// @route   PUT /api/hr/jobs/:id
// @access  Private (HR only)
exports.updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check authorization
    if (job.hrId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    // Use $set to do a partial update — avoids re-validating required fields not in the payload
    job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    console.error('Update job error:', error);
    // Return the actual Mongoose validation message so the frontend can show it
    const msg = error.name === 'ValidationError'
      ? Object.values(error.errors).map(e => e.message).join(', ')
      : (error.message || 'Error updating job');
    res.status(500).json({ success: false, message: msg });
  }
};

// @desc    Delete a job
// @route   DELETE /api/hr/jobs/:id
// @access  Private (HR only)
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check authorization
    if (job.hrId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting job'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get all ranked candidates for a specific job
// @route   GET /api/hr/jobs/:id/candidates
// @access  Private (HR only)
//
// This is the CORE AI RANKING function.
// It retrieves all applications for a job and returns them sorted
// by AI match score (highest first).
//
// Optional query param: ?showAll=true
//   - false (default): only show candidates above the minimum threshold (40%)
//   - true: show all candidates regardless of score
//
// The function also performs a secondary lookup to attach each
// candidate's resume path, skills, and education from the Candidate model.
// (This join is manual because Application references the User model,
// not the Candidate model directly.)
// ─────────────────────────────────────────────────────────────────────
exports.getRankedCandidates = async (req, res) => {
  try {
    // Verify the job exists
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Authorization: HR can only view candidates for their OWN jobs
    // Compare MongoDB ObjectIds as strings for equality check
    if (job.hrId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this job' });
    }

    // Fetch all applications for this job
    // .populate('candidateId') replaces the User _id with the actual User document
    // (gives us fullName, email, phone without a separate query)
    let applications = await Application.find({ jobId: req.params.id })
      .populate('candidateId', 'fullName email phone')
      .sort({ matchScore: -1 }); // sort by score descending = highest match shown first

    // Apply the minimum score filter unless HR requested to see everyone
    const filteringThreshold = job.filteringThreshold || 40; // default: 40% minimum
    const showAll = req.query.showAll === 'true';
    if (!showAll) {
      // Filter out candidates below the threshold
      applications = applications.filter(app => app.matchScore >= filteringThreshold);
    }

    // Secondary lookup: attach extra profile data from the Candidate collection
    // Application.candidateId → User._id → Candidate.userId
    // This manual join is needed because Application references User, not Candidate
    const Candidate = require('../models/Candidate');
    const userIds = applications.map(app => app.candidateId?._id).filter(Boolean);

    const candidateProfiles = await Candidate.find(
      { userId: { $in: userIds } },
      'userId resumePath skills education' // only fetch needed fields
    ).lean(); // .lean() returns plain JS object instead of Mongoose document (faster)

    // Build a lookup map: userId (string) → candidate profile
    const profileMap = {};
    candidateProfiles.forEach(cp => { profileMap[cp.userId.toString()] = cp; });

    // Merge the extra profile data into each application object
    const enrichedApplications = applications.map(app => {
      const plain = app.toObject ? app.toObject() : app;
      const profile = profileMap[plain.candidateId?._id?.toString()];
      if (profile) {
        // Attach resumePath, skills, and education from the Candidate model
        plain.candidateId.resumePath = profile.resumePath || null;
        plain.candidateId.skills     = profile.skills     || [];
        plain.candidateId.education  = profile.education  || null;
      }
      return plain;
    });

    res.status(200).json({
      success: true,
      data: { job, applications: enrichedApplications, filteringThreshold, showAll }
    });
  } catch (error) {
    console.error('Get ranked candidates error:', error);
    res.status(500).json({ success: false, message: 'Error fetching candidates' });
  }
};



// ─────────────────────────────────────────────────────────────────────
// @desc    Update application status (HR decision on a candidate)
// @route   PATCH /api/hr/applications/:id/status
// @access  Private (HR only)
//
// This is how HR acts on candidates:
//   PENDING    → SHORTLISTED  (candidate is selected for next round)
//   PENDING    → REVIEWED     (HR has read the application)
//   PENDING    → REJECTED     (candidate is not suitable)
//
// Candidates can see their updated status on the "My Applications" page.
// ─────────────────────────────────────────────────────────────────────
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body; // the new status value sent from the frontend

    // Validate that the submitted status is one of the allowed values
    // This prevents invalid data from being written to the database
    const validStatuses = ['PENDING', 'SHORTLISTED', 'REVIEWED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Find the application and populate the linked job (needed for authorization check)
    const application = await Application.findById(req.params.id).populate('jobId');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Authorization: only the HR who posted the job can update its applications
    // application.jobId.hrId is the HR who owns the job
    // req.user._id is the currently logged-in HR
    if (application.jobId.hrId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this application' });
    }

    // Update the status and save to the database
    application.status = status;
    await application.save(); // triggers Mongoose validators and timestamps update

    res.status(200).json({
      success: true,
      message: 'Application status updated',
      data: { application }
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ success: false, message: 'Error updating application status' });
  }
};

// @desc    Get HR dashboard statistics
// @route   GET /api/hr/dashboard
// @access  Private (HR only)
exports.getDashboard = async (req, res) => {
  try {
    const hrId = req.user._id;

    // Get job statistics
    const totalJobs = await Job.countDocuments({ hrId });
    const activeJobs = await Job.countDocuments({ hrId, status: 'ACTIVE' });
    const closedJobs = await Job.countDocuments({ hrId, status: 'CLOSED' });

    // Get application statistics
    const hrJobs = await Job.find({ hrId }).select('_id');
    const jobIds = hrJobs.map(job => job._id);

    const totalApplications = await Application.countDocuments({ jobId: { $in: jobIds } });
    const pendingApplications = await Application.countDocuments({ 
      jobId: { $in: jobIds }, 
      status: 'PENDING' 
    });
    const shortlistedApplications = await Application.countDocuments({ 
      jobId: { $in: jobIds }, 
      status: 'SHORTLISTED' 
    });
    const reviewedApplications = await Application.countDocuments({ 
      jobId: { $in: jobIds }, 
      status: 'REVIEWED' 
    });
    const rejectedApplications = await Application.countDocuments({ 
      jobId: { $in: jobIds }, 
      status: 'REJECTED' 
    });

    // Get recent jobs
    const recentJobs = await Job.find({ hrId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent activities
    const recentActivities = [];

    // Get recent applications - sort by updatedAt so status changes show immediately
    const recentApplications = await Application.find({ jobId: { $in: jobIds } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('candidateId', 'fullName email')
      .populate('jobId', 'title');

    recentApplications.forEach(app => {
      const isHighMatch = app.matchScore >= 80;
      recentActivities.push({
        type: 'application',
        icon: isHighMatch ? 'star' : 'check',
        title: isHighMatch ? 'High match found' : 'New candidate applied',
        description: (app.candidateId?.fullName || 'Anonymous') + ' applied' + (app.matchScore ? ' - ' + Math.round(app.matchScore) + '% match' : ''),
        jobTitle: app.jobId?.title,
        matchScore: app.matchScore,
        status: app.status || 'PENDING',
        timestamp: app.updatedAt || app.createdAt
      });
    });

    // Get recent job postings
    const recentJobPostings = await Job.find({ hrId })
      .sort({ createdAt: -1 })
      .limit(5);

    recentJobPostings.forEach(job => {
      recentActivities.push({
        type: 'job_posted',
        icon: 'briefcase',
        title: 'Job posted',
        description: job.title + ' position published',
        jobTitle: job.title,
        timestamp: job.createdAt
      });
    });

    // Sort and limit activities
    recentActivities.sort((a, b) => b.timestamp - a.timestamp);
    const limitedActivities = recentActivities.slice(0, 10);

    // Calculate match score distribution
    const allApplications = await Application.find({ jobId: { $in: jobIds } });
    const scoreDistribution = {
      '0-20': 0,
      '20-40': 0,
      '40-60': 0,
      '60-80': 0,
      '80-100': 0
    };
    
    allApplications.forEach(app => {
      const score = app.matchScore || 0;
      if (score < 20) scoreDistribution['0-20']++;
      else if (score < 40) scoreDistribution['20-40']++;
      else if (score < 60) scoreDistribution['40-60']++;
      else if (score < 80) scoreDistribution['60-80']++;
      else scoreDistribution['80-100']++;
    });

    // Calculate weekly statistics
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyApplications = await Application.countDocuments({
      jobId: { $in: jobIds },
      createdAt: { $gte: oneWeekAgo }
    });
    
    const weeklyHighMatches = await Application.countDocuments({
      jobId: { $in: jobIds },
      matchScore: { $gte: 80 },
      createdAt: { $gte: oneWeekAgo }
    });
    
    const weeklyJobs = await Job.countDocuments({
      hrId,
      createdAt: { $gte: oneWeekAgo }
    });


    res.status(200).json({
      success: true,
      data: {
        statistics: {
          jobs: {
            total: totalJobs,
            active: activeJobs,
            closed: closedJobs
          },
          applications: {
            total: totalApplications,
            pending: pendingApplications,
            shortlisted: shortlistedApplications,
            reviewed: reviewedApplications,
            rejected: rejectedApplications
          }
        },
        scoreDistribution,
        weeklyStats: {
          applications: weeklyApplications,
          highMatches: weeklyHighMatches,
          jobs: weeklyJobs
        },
        recentJobs,
        recentActivities: limitedActivities
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
};

// @desc    Export candidates to CSV
// @route   GET /api/hr/jobs/:id/export-csv
// @access  Private (HR only)
exports.exportCandidatesToCSV = async (req, res) => {
  try {
    const jobId = req.params.id;
    const hrId = req.user._id;
    
    // Verify job belongs to this HR
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    if (job.hrId.toString() !== hrId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Get all applications with candidate details
    const applications = await Application.find({ jobId })
      .populate('candidateId', 'fullName email')
      .populate('jobId', 'title')
      .sort({ matchScore: -1 });
    
    // Generate CSV
    const csvHeaders = 'Rank,Name,Email,Job,Overall Match,Skills Score,Experience Score,Education Score,Status,Applied Date\n';
    const csvRows = applications.map((app, index) => {
      const name         = (app.candidateId?.fullName || 'Unknown').replace(/"/g, '""');
      const email        = app.candidateId?.email || 'Unknown';
      const jobTitle     = (app.jobId?.title || 'Unknown').replace(/"/g, '""');
      const matchScore   = app.matchScore != null ? `${Math.round(app.matchScore)}%` : 'N/A';
      const rd           = app.rankingDetails || {};
      const skillsScore  = rd.skillsScore    != null ? `${Math.round(rd.skillsScore)}%`    : 'N/A';
      const expScore     = rd.experienceScore != null ? `${Math.round(rd.experienceScore)}%` : 'N/A';
      const eduScore     = rd.educationScore  != null ? `${Math.round(rd.educationScore)}%`  : 'N/A';
      const status       = app.status || 'PENDING';
      const rawDate      = app.appliedDate || app.createdAt;
      const appliedDate  = rawDate ? new Date(rawDate).toLocaleDateString('en-MY', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) : 'N/A';

      return `${index + 1},"${name}","${email}","${jobTitle}",${matchScore},${skillsScore},${expScore},${eduScore},${status},"${appliedDate}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="candidates-${job.title.replace(/[^a-z0-9]/gi, '_')}.csv"`);
    res.send('\uFEFF' + csvHeaders + csvRows); // BOM for Excel UTF-8 compatibility
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  createJob,
  getMyJobs,
  getJob,
  updateJob,
  deleteJob,
  getRankedCandidates,
  getDashboard,
  updateApplicationStatus,
  exportCandidatesToCSV
} = require('../controllers/hrController');

// All routes require authentication and HR role
router.use(protect);
router.use(requireRole('HR'));

// Job routes
router.post('/jobs', createJob);
router.get('/jobs', getMyJobs);
router.get('/jobs/:id', getJob);
router.put('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);

// Candidates for a job
router.get('/jobs/:id/candidates', getRankedCandidates);
router.get('/jobs/:id/export-csv', exportCandidatesToCSV);


// Dashboard
router.get('/dashboard', getDashboard);

// Application status updates
router.patch('/applications/:id/status', updateApplicationStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getActiveJobs,
  getJobById,
  uploadResume,
  applyToJob,
  getMyApplications,
  updateProfile,
  getProfile
} = require('../controllers/candidateController');

// Public routes
router.get('/jobs', getActiveJobs);
router.get('/jobs/:id', getJobById);

// Protected routes (Candidate only)
router.use(protect);
router.use(requireRole('CANDIDATE'));

router.post('/resume', upload.single('resume'), uploadResume);
router.post('/apply', applyToJob);
router.get('/applications', getMyApplications);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;

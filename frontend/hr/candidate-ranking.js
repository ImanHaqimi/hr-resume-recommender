/**
 * candidate-ranking.js — HR Candidate Ranking Page Logic
 *
 * This script powers the "Candidate Rankings" page in the HR portal.
 * It is the main page where HR sees AI-ranked candidates for each job.
 *
 * ─── What this page does ─────────────────────────────────────────────
 *
 *   1. On load: fetches HR's jobs and populates the "Filter by Job" dropdown
 *   2. When HR selects a job: fetches all candidates for that job (sorted by AI score)
 *   3. Renders each candidate as a card showing:
 *        - Name, email, phone
 *        - Overall AI match score (circular gauge)
 *        - Skills / Experience / Education score bars
 *        - Current application status badge (PENDING / SHORTLISTED / REVIEWED / REJECTED)
 *        - Action buttons: Shortlist, View Resume, Reject
 *   4. HR can click Shortlist / Reject to update the candidate's status
 *   5. HR can click "Export List" to download a CSV of all candidates for that job
 *
 * ─── API Endpoints Used ──────────────────────────────────────────────
 *
 *   GET  /api/hr/jobs                          → load jobs into dropdown
 *   GET  /api/hr/jobs/:id/candidates          → load ranked candidates for selected job
 *   PATCH /api/hr/applications/:id/status     → update application status
 *   GET  /api/hr/jobs/:id/export-csv          → download CSV of candidates
 *
 * ─── Global State ────────────────────────────────────────────────────
 *
 *   currentJob    — the full Job document currently selected in the dropdown
 *   allCandidates — array of application objects (sorted by matchScore desc)
 *
 * ─── Authentication ──────────────────────────────────────────────────
 *
 *   All API calls include 'Authorization: Bearer <token>' in the header.
 *   The JWT token is retrieved from localStorage via window.auth.getToken().
 */

// Backend API base URL — loaded from config.js
const API_URL = window.CONFIG?.API_BASE_URL || 'http://localhost:5000';

// ─── Global Page State ───────────────────────────────────────────────
let currentJob     = null; // the currently selected Job document (populated from API)
let allCandidates  = [];   // all application objects for the selected job

/**
 * Initialize the page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load jobs for the filter dropdown
    await loadJobs();
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize page');
  }
});

/**
 * Load jobs into the filter dropdown
 */
async function loadJobs() {
  try {
    const token = window.auth.getToken();
    
    const response = await fetch(`${API_URL}/api/hr/jobs`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    const jobs = result.data.jobs;
    const jobFilter = document.getElementById('jobFilter');

    // Clear existing options except "All Jobs"
    jobFilter.innerHTML = '<option value="">Select a job to view candidates</option>';

    // Add job options
    jobs.forEach(job => {
      const option = document.createElement('option');
      option.value = job._id;
      option.textContent = `${job.title} (${job.status})`;
      jobFilter.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading jobs:', error);
    showError('Failed to load jobs');
  }
}

/**
 * Load candidates for selected job
 */
async function loadCandidatesForJob(jobId) {
  if (!jobId) {
    // Restore the illustrated empty state when no job is selected
    showInitialEmptyState();
    return;
  }

  try {
    showLoading(true);

    const token = window.auth.getToken();
    
    // Check if showing all candidates or only qualified
    const showAllCheckbox = document.getElementById('qualifiedFilter');
    const showOnlyQualified = showAllCheckbox ? showAllCheckbox.checked : true;
    
    // Build URL with showAll parameter
    const showAllParam = showOnlyQualified ? 'false' : 'true';
    const url = `${API_URL}/api/hr/jobs/${jobId}/candidates?showAll=${showAllParam}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    currentJob = result.data.job;
    allCandidates = result.data.applications;

    // Update filter info display
    updateFilterInfo(result);

    // Display candidates
    displayCandidates(allCandidates);

  } catch (error) {
    console.error('Error loading candidates:', error);
    showError('Failed to load candidates: ' + error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Display candidates on the page
 */
function displayCandidates(candidates) {
  const container = document.querySelector('.candidates-grid');

  if (!candidates || candidates.length === 0) {
    showEmptyState('No applications found for this job');
    return;
  }

  // Clear container
  container.innerHTML = '';

  // Create candidate cards
  candidates.forEach((application, index) => {
    const card = createCandidateCard(application, index + 1);
    container.appendChild(card);
  });
}

/**
 * Update filter info display
 */
function updateFilterInfo(result) {
  const filterInfo = document.getElementById('filterInfo');
  if (!filterInfo) return;

  const totalCandidates = result.totalCandidates ?? 0;
  const qualifiedCount = result.qualifiedCount ?? 0;
  const unqualifiedCount = result.unqualifiedCount ?? 0;
  const threshold = result.threshold ?? 40;

  if (totalCandidates === 0) {
    filterInfo.textContent = '';
    return;
  }
  if (unqualifiedCount > 0) {
    filterInfo.textContent = ` (${qualifiedCount}/${totalCandidates} qualified, ${unqualifiedCount} hidden below ${threshold}%)`;
    filterInfo.style.color = '#666';
  } else if (qualifiedCount === totalCandidates && totalCandidates > 0) {
    filterInfo.textContent = ` (All ${totalCandidates} candidates meet the ${threshold}% threshold)`;
    filterInfo.style.color = '#0066cc';
  } else {
    filterInfo.textContent = '';
  }
}


/**
 * Create a candidate card element
 */
function createCandidateCard(application, rank) {
  const card = document.createElement('div');
  card.className = 'candidate-card';

  const candidate = application.candidateId;
  const matchScore = Math.round(application.matchScore || 0);
  const status = application.status || 'PENDING';
  const statusClass = status.toLowerCase();

  // Rank badge color
  const rankColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#cd7c2e' : '#4a9eff';

  // Get initials for avatar
  const nameParts = (candidate.fullName || 'U N').split(' ');
  const initials = (nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '');

  // Avatar color based on initials
  const avatarColors = ['#4a9eff','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
  const avatarColor = avatarColors[(initials.charCodeAt(0) || 0) % avatarColors.length];

  // Experience & Education
  const experience = candidate.experience || candidate.yearsExperience || 0;
  const rawEdu = candidate.education || candidate.educationLevel || '';
  const education = typeof rawEdu === 'object' ? (rawEdu.level || '') : rawEdu;
  const eduShort = education ? education.replace('Bachelor', 'Bachelor').replace("'s", '\'s').replace('degree','').trim() : '';

  // Score breakdown
  const rd = application.rankingDetails || {};
  const skillsScore   = Math.round(rd.skillsScore    || 0);
  const expScore      = Math.round(rd.experienceScore || 0);
  const eduScore      = Math.round(rd.educationScore  || 0);

  // Skills tags
  const skills = (candidate.skills || []).slice(0, 6);
  const skillLabels = skills.map(s =>
    `<span class="skill-tag">${typeof s === 'string' ? s : s.name || s}</span>`
  ).join('');

  // Match score color — bright green for high, cyan for good, amber for ok, red for low
  const matchColor = matchScore >= 75 ? '#00e6aa' : matchScore >= 55 ? '#4a9eff' : matchScore >= 40 ? '#f59e0b' : '#ef4444';
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (matchScore / 100) * circumference;

  // Status display
  const statusDisplay = status.charAt(0) + status.slice(1).toLowerCase();

  card.innerHTML = `
    <div class="card-top-row">
      <span class="rank-badge" style="background:${rankColor}20; color:${rankColor}; border-color:${rankColor}40">
        🏅 Rank #${rank}
      </span>
      <span class="status-badge-card ${statusClass}" id="status-${application._id}">${statusDisplay}</span>
    </div>

    <div class="card-candidate-row">
      <div class="card-avatar" style="background:${avatarColor}">${initials.toUpperCase()}</div>
      <div class="card-candidate-info">
        <h3>${candidate.fullName}</h3>
        <div class="card-meta">
          <span>✉ ${candidate.email}</span>
          ${candidate.phone ? `<span>• 📞 ${candidate.phone}</span>` : ''}
          ${experience ? `<span>• ${experience} yrs exp</span>` : ''}
          ${eduShort ? `<span>• ${eduShort}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="card-scores-row">
      <div class="match-circle-wrap">
        <svg width="78" height="78" viewBox="0 0 78 78">
          <circle cx="39" cy="39" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="7"/>
          <circle cx="39" cy="39" r="${r}" fill="none" stroke="${matchColor}" stroke-width="7"
            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
            stroke-linecap="round" transform="rotate(-90 39 39)"
            style="transition: stroke-dashoffset 1s ease"/>
        </svg>
        <div class="match-circle-text">
          <span class="match-pct">${matchScore}%</span>
          <span class="match-lbl">Match</span>
        </div>
      </div>

      <div class="score-bars">
        <div class="score-bar-row">
          <span class="bar-label">Skills</span>
          <div class="bar-track"><div class="bar-fill" style="width:${skillsScore}%; background:#4a9eff"></div></div>
          <span class="bar-pct">${skillsScore}%</span>
        </div>
        <div class="score-bar-row">
          <span class="bar-label">Experience</span>
          <div class="bar-track"><div class="bar-fill" style="width:${expScore}%; background:#10b981"></div></div>
          <span class="bar-pct">${expScore}%</span>
        </div>
        <div class="score-bar-row">
          <span class="bar-label">Education</span>
          <div class="bar-track"><div class="bar-fill" style="width:${eduScore}%; background:#8b5cf6"></div></div>
          <span class="bar-pct">${eduScore}%</span>
        </div>
      </div>
    </div>

    ${skillLabels ? `<div class="skill-tags">${skillLabels}</div>` : ''}

    <div class="card-actions">
      <button class="crd-btn crd-shortlist ${status === 'SHORTLISTED' ? 'crd-active' : ''}" 
              onclick="updateStatus('${application._id}', 'SHORTLISTED')"
              ${status === 'SHORTLISTED' ? 'disabled' : ''}>
        ✓ ${status === 'SHORTLISTED' ? 'Shortlisted' : 'Shortlist'}
      </button>
      <button class="crd-btn crd-view"
              onclick="viewResume('${application._id}')">
        👁 View Resume
      </button>
      <button class="crd-btn crd-reject ${status === 'REJECTED' ? 'crd-active' : ''}" 
              onclick="updateStatus('${application._id}', 'REJECTED')"
              ${status === 'REJECTED' ? 'disabled' : ''}>
        ✕ Reject
      </button>
    </div>
  `;

  return card;
}

/**
 * View resume for a candidate
 */
function viewResume(applicationId) {
  const app = allCandidates.find(a => a._id === applicationId);
  if (!app) return;

  const candidate = app.candidateId;

  // resumePath is stored as a relative path, e.g. "uploads/resumes/file.pdf"
  const resumePath = candidate.resumePath || app.resumeUrl;

  if (resumePath) {
    // Strip leading slash if present, then build full URL
    const cleanPath = resumePath.replace(/^\/+/, '');
    const url = `${API_URL}/${cleanPath}`;
    window.open(url, '_blank');
  } else {
    alert('No resume file available for this candidate yet. The candidate may not have uploaded their resume.');
  }
}

/**
 * Get match level based on score
 */
function getMatchLevel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Sort candidates based on selected criteria
 */
function sortCandidates(criteria) {
  let sorted = [...allCandidates];

  switch (criteria) {
    case 'match':
      sorted.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      break;
    case 'date':
      sorted.sort((a, b) => new Date(b.appliedDate ||  b.createdAt) - new Date(a.appliedDate || a.createdAt));
      break;
    case 'name':
      sorted.sort((a, b) => a.candidateId.fullName.localeCompare(b.candidateId.fullName));
      break;
  }

  displayCandidates(sorted);
}

/**
 * Show loading state
 */
function showLoading(isLoading) {
  const container = document.querySelector('.candidates-grid');
  
  if (isLoading) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>🤖 AI is analyzing candidates...</p>
      </div>
    `;
  }
}

/**
 * Show the initial illustrated empty state (before any job is selected)
 */
function showInitialEmptyState() {
  const container = document.querySelector('.candidates-grid');
  container.innerHTML = `
    <div class="loading-state">
      <div class="empty-state-illustration">
        <div class="empty-icon-ring">
          <div class="empty-icon-pulse"></div>
          <span class="empty-icon">🔍</span>
        </div>
        <h2 class="empty-title">Select a Job to See Candidates</h2>
        <p class="empty-subtitle">Use the <strong>Filter by Job</strong> dropdown above to view AI-ranked candidates for any of your active job postings.</p>


      </div>
    </div>
  `;
}

/**
 * Show empty state when a job has no candidates
 */
function showEmptyState(message) {
  const container = document.querySelector('.candidates-grid');
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-illustration">
        <span style="font-size:2.5rem;margin-bottom:0.8rem;">📭</span>
        <h2 class="empty-title" style="font-size:1.2rem">${message}</h2>
        <p class="empty-subtitle">No applications have been submitted for this job yet.</p>
      </div>
    </div>
  `;
}

/**
 * Show error message
 */
function showError(message) {
  const container = document.querySelector('.candidates-grid');
  container.innerHTML = `
    <div class="error-state">
      <p>❌ ${message}</p>
    </div>
  `;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Job filter change
  const jobFilter = document.getElementById('jobFilter');
  if (jobFilter) {
    jobFilter.addEventListener('change', (e) => {
      loadCandidatesForJob(e.target.value);
    });
  }

  // Sort filter change
  const sortFilter = document.getElementById('sortFilter');
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      sortCandidates(e.target.value);
    });
  }

  // Qualified filter toggle
  const qualifiedFilter = document.getElementById('qualifiedFilter');
  if (qualifiedFilter) {
    qualifiedFilter.addEventListener('change', () => {
      // Reload candidates with new filter setting
      if (currentJob) {
        loadCandidatesForJob(currentJob._id);
      }
    });
  }
}

/**
 * Update application status
 */
async function updateStatus(applicationId, newStatus) {
  try {
    const token = window.auth.getToken();
    
    const response = await fetch(`${API_URL}/api/hr/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    // Update UI status badge
    const statusBadge = document.getElementById(`status-${applicationId}`);
    if (statusBadge) {
      statusBadge.textContent = newStatus;
      statusBadge.className = `status-badge ${newStatus.toLowerCase()}`;
    }

    // Reload candidates to update button states
    if (currentJob) {
      await loadCandidatesForJob(currentJob._id);
    }

    // Show success message
    const statusLabel = newStatus === 'SHORTLISTED' ? 'shortlisted' : 
                        newStatus === 'REVIEWED' ? 'marked as reviewed' :
                        'rejected';
    alert(`✅ Candidate ${statusLabel} successfully!`);

  } catch (error) {
    console.error('Error updating status:', error);
    alert('❌ Failed to update status: ' + error.message);
  }
}

/**
 * Export candidates to CSV for the currently selected job
 */
async function exportCandidates() {
  // Get the selected job from the dropdown
  const jobFilter = document.getElementById('jobFilter');
  const jobId = jobFilter?.value || currentJob?._id;

  if (!jobId) {
    alert('⚠️ Please select a job first before exporting.');
    return;
  }

  const token = window.auth.getToken();

  try {
    const response = await fetch(
      `${API_URL}/api/hr/jobs/${jobId}/export-csv`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Export failed');
    }

    // Derive a human-friendly filename
    const jobTitle = (currentJob?.title || jobFilter?.options[jobFilter.selectedIndex]?.text || jobId)
      .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `candidates-${jobTitle}-${date}.csv`;

    // Trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export error:', error);
    alert('❌ Failed to export candidates: ' + error.message);
  }
}

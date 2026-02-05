// Applications Page - Backend Integration

let allApplications = [];
let filteredApplications = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadApplications();
  initializeFilters();
  initLogout();
});

// Load applications from backend
async function loadApplications() {
  const loadingState = document.getElementById('loadingState');
  const applicationsGrid = document.getElementById('applicationsGrid');
  const emptyState = document.getElementById('emptyState');
  
  try {
    loadingState.style.display = 'block';
    applicationsGrid.style.display = 'none';
    emptyState.style.display = 'none';

    const response = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/candidates/applications`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load applications');
    }

    allApplications = data.data.applications || [];
    filteredApplications = [...allApplications];

    loadingState.style.display = 'none';

    if (allApplications.length === 0) {
      emptyState.style.display = 'block';
    } else {
      applicationsGrid.style.display = 'grid';
      renderApplications(filteredApplications);
    }

    updateApplicationCount();

  } catch (error) {
    console.error('Error loading applications:', error);
    loadingState.style.display = 'none';
    emptyState.style.display = 'block';
    document.querySelector('#emptyState h3').textContent = 'Error Loading Applications';
    document.querySelector('#emptyState p').textContent = error.message;
  }
}

// Render applications to the grid
function renderApplications(applications) {
  const grid = document.getElementById('applicationsGrid');
  
  if (applications.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.6);">No applications match your filter.</p>';
    return;
  }

  grid.innerHTML = applications.map(app => createApplicationCard(app)).join('');
}

// Create application card HTML
function createApplicationCard(app) {
  const job = app.jobId;
  const appliedDate = new Date(app.appliedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const matchScoreColor = getScoreColor(app.matchScore);
  const matchLevelText = getMatchLevel(app.matchScore);

  return `
    <div class="application-card">
      <div class="app-header">
        <div>
          <h3 class="app-title">${job?.title || 'Job Title Not Available'}</h3>
          <div class="app-meta">
            Applied on ${appliedDate}
          </div>
        </div>
        <span class="status-badge status-${app.status}">${app.status}</span>
      </div>

      ${app.matchScore > 0 ? `
        <div class="score-section">
          <div class="score-label">AI Match Score</div>
          <div class="score-value" style="color: ${matchScoreColor}">
            ${app.matchScore}%
            <span style="font-size: 0.6em; color: rgba(255,255,255,0.6);">${matchLevelText}</span>
          </div>
          
          ${app.rankingDetails ? `
            <div class="score-breakdown">
              <div class="score-item">
                <div class="score-item-label">Skills</div>
                <div class="score-item-value">${app.rankingDetails.skillsScore || 0}%</div>
              </div>
              <div class="score-item">
                <div class="score-item-label">Experience</div>
                <div class="score-item-value">${app.rankingDetails.experienceScore || 0}%</div>
              </div>
              <div class="score-item">
                <div class="score-item-label">Education</div>
                <div class="score-item-value">${app.rankingDetails.educationScore || 0}%</div>
              </div>
            </div>
          ` : ''}
        </div>
      ` : '<div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: center; color: rgba(255,255,255,0.6); font-size: 0.9rem;">AI scoring in progress...</div>'}

      <div class="app-actions">
        <button onclick="viewJobDetails('${job?._id}')" class="btn btn-secondary btn-small">
          View Job
        </button>
        ${app.status === 'SHORTLISTED' ? `
          <button class="btn btn-primary btn-small" style="background: linear-gradient(135deg, #4CAF50, #45a049);">
            🎉 Shortlisted!
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Get score color based on match percentage
function getScoreColor(score) {
  if (score >= 80) return '#4CAF50'; // Green
  if (score >= 60) return '#4a9eff'; // Blue
  if (score >= 40) return '#ffc107'; // Yellow
  return '#f44336'; // Red
}

// Get match level text
function getMatchLevel(score) {
  if (score >= 80) return 'Excellent Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Fair Match';
  return 'Poor Match';
}

// Initialize filters
function initializeFilters() {
  const statusFilter = document.getElementById('statusFilter');
  
  statusFilter.addEventListener('change', (e) => {
    const filterValue = e.target.value;
    
    if (filterValue === 'ALL') {
      filteredApplications = [...allApplications];
    } else {
      filteredApplications = allApplications.filter(app => app.status === filterValue);
    }
    
    renderApplications(filteredApplications);
    updateApplicationCount();
  });
}

// Update application count
function updateApplicationCount() {
  const countElement = document.getElementById('applicationCount');
  const total = allApplications.length;
  const filtered = filteredApplications.length;
  
  if (filtered === total) {
    countElement.textContent = `${total} application${total !== 1 ? 's' : ''}`;
  } else {
    countElement.textContent = `${filtered} of ${total} applications`;
  }
}

// View job details
function viewJobDetails(jobId) {
  window.location.href = `job-listing.html?jobId=${jobId}`;
}

// Initialize logout button
function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.auth.logout();
      window.location.href = '../index.html';
    });
  }
}

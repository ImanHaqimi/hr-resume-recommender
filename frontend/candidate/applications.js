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

    const response = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/candidates/applications`);
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
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const score      = app.matchScore || 0;
  const scoreColor = getScoreColor(score);
  const matchLevel = getMatchLevel(score);
  const matchEmoji = score >= 80 ? '🎯' : score >= 60 ? '✅' : score >= 40 ? '⚠️' : '❌';

  const skills  = app.rankingDetails?.skillsScore     ?? null;
  const exp     = app.rankingDetails?.experienceScore ?? null;
  const edu     = app.rankingDetails?.educationScore  ?? null;

  // Circular SVG ring helper
  const ring = (pct, color) => {
    const r = 28, circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return `<svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="6"
        stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ / 4}"
        stroke-linecap="round" transform="rotate(-90 36 36)" style="transition:stroke-dasharray 0.6s ease"/>
      <text x="36" y="36" text-anchor="middle" dominant-baseline="central"
        font-size="12" font-weight="700" fill="${color}">${pct}%</text>
    </svg>`;
  };

  // Progress bar helper
  const bar = (label, pct, color) => pct !== null ? `
    <div style="margin-bottom:0.5rem;">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
        <span style="font-size:0.78rem;color:rgba(255,255,255,0.5);">${label}</span>
        <span style="font-size:0.78rem;font-weight:600;color:${color};">${pct}%</span>
      </div>
      <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.6s ease;"></div>
      </div>
    </div>` : '';

  // Status config
  const statusConfig = {
    SHORTLISTED: { bg:'rgba(74,222,128,0.15)', color:'#4ade80', border:'rgba(74,222,128,0.35)', icon:'✓' },
    PENDING:     { bg:'rgba(250,204,21,0.15)',  color:'#facc15', border:'rgba(250,204,21,0.35)', icon:'⏳' },
    REVIEWED:    { bg:'rgba(74,158,255,0.15)',  color:'#4a9eff', border:'rgba(74,158,255,0.35)', icon:'👁' },
    REJECTED:    { bg:'rgba(248,113,113,0.15)', color:'#f87171', border:'rgba(248,113,113,0.35)', icon:'✕' }
  };
  const s = statusConfig[app.status] || statusConfig.PENDING;

  const skillColor = skills >= 70 ? '#4ade80' : skills >= 40 ? '#facc15' : '#f87171';
  const expColor   = exp   >= 70 ? '#4ade80' : exp   >= 40 ? '#facc15' : '#f87171';
  const eduColor   = edu   >= 70 ? '#4ade80' : edu   >= 40 ? '#facc15' : '#f87171';

  return `
    <div class="application-card" style="
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.3s ease;
      display: flex; flex-direction: column; gap: 1rem;
    " onmouseover="this.style.borderColor='rgba(74,158,255,0.35)';this.style.background='rgba(255,255,255,0.08)';this.style.transform='translateY(-3px)'"
       onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='rgba(255,255,255,0.05)';this.style.transform='translateY(0)'">

      <!-- Header: Title + Status Badge -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem;">
        <div style="flex:1;min-width:0;">
          <h3 style="font-size:1.1rem;font-weight:700;color:#fff;margin:0 0 0.35rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            💼 ${job?.title || 'Job Title Not Available'}
          </h3>
          <div style="font-size:0.82rem;color:rgba(255,255,255,0.5);display:flex;gap:1rem;flex-wrap:wrap;">
            <span>🏢 ${job?.company || 'Company'}</span>
            ${job?.location ? `<span>📍 ${job.location}</span>` : ''}
            <span>📅 Applied ${appliedDate}</span>
          </div>
        </div>
        <span style="
          flex-shrink:0;
          padding:0.3rem 0.85rem;
          border-radius:20px;
          font-size:0.75rem;
          font-weight:700;
          letter-spacing:0.5px;
          background:${s.bg};
          color:${s.color};
          border:1px solid ${s.border};
          white-space:nowrap;
        ">${s.icon} ${app.status}</span>
      </div>

      <!-- Score Section -->
      ${score > 0 ? `
        <div style="
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:12px;
          padding:1rem;
          display:flex;
          gap:1rem;
          align-items:center;
        ">
          <!-- Circular ring -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:0.3rem;flex-shrink:0;">
            ${ring(score, scoreColor)}
            <span style="font-size:0.7rem;font-weight:600;color:${scoreColor};">${matchEmoji} ${matchLevel}</span>
          </div>

          <!-- Progress bars -->
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.75rem;color:rgba(255,255,255,0.45);margin-bottom:0.6rem;text-transform:uppercase;letter-spacing:0.5px;">Score Breakdown</div>
            ${bar('Skills',     skills, skillColor)}
            ${bar('Experience', exp,    expColor)}
            ${bar('Education',  edu,    eduColor)}
          </div>
        </div>
      ` : `
        <div style="padding:1rem;background:rgba(255,255,255,0.04);border-radius:10px;text-align:center;color:rgba(255,255,255,0.5);font-size:0.88rem;">
          ⏳ AI scoring in progress...
        </div>
      `}

      <!-- Action Buttons -->
      <div style="display:flex;gap:0.6rem;margin-top:auto;">
        <button onclick="viewJobDetails('${job?._id}')" style="
          flex:1;padding:0.6rem;border-radius:9px;font-size:0.85rem;font-weight:600;cursor:pointer;
          background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.85);
          transition:all 0.2s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.13)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">
          👁 View Job
        </button>
        ${app.status === 'SHORTLISTED' ? `
          <button style="
            flex:1;padding:0.6rem;border-radius:9px;font-size:0.85rem;font-weight:700;cursor:default;
            background:rgba(74,222,128,0.18);border:1.5px solid rgba(74,222,128,0.4);color:#4ade80;
          ">🎉 Shortlisted!</button>
        ` : ''}
        ${app.status === 'REJECTED' ? `
          <button style="
            flex:1;padding:0.6rem;border-radius:9px;font-size:0.85rem;font-weight:600;cursor:default;
            background:rgba(248,113,113,0.1);border:1.5px solid rgba(248,113,113,0.3);color:#f87171;
          ">✕ Not Selected</button>
        ` : ''}
      </div>
    </div>
  `;
}

// Get score color based on match percentage
function getScoreColor(score) {
  if (score >= 80) return '#4ade80'; // Green
  if (score >= 60) return '#4a9eff'; // Blue
  if (score >= 40) return '#facc15'; // Yellow
  return '#f87171';                  // Red
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

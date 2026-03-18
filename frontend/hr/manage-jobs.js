// Manage Jobs Page — HR Portal

let allJobs = [];
let filteredJobs = [];
let currentEditId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadMyJobs();
  initLogout();
});

// ─────────────────────────────────────────
// LOAD JOBS
// ─────────────────────────────────────────
async function loadMyJobs() {
  const grid = document.getElementById('jobsGrid');

  try {
    const response = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/hr/jobs`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Failed to load jobs');

    allJobs = data.data?.jobs || data.data || [];
    filteredJobs = [...allJobs];

    updateSummary();
    renderJobs(filteredJobs);

    if (allJobs.length > 0) {
      document.getElementById('jobsSummary').style.display = 'flex';
      document.getElementById('filterBar').style.display = 'flex';
    }

  } catch (err) {
    console.error('Error loading jobs:', err);
    grid.innerHTML = `
      <div class="state-box">
        <div class="state-icon">⚠️</div>
        <h3>Could not load jobs</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

// ─────────────────────────────────────────
// RENDER JOBS
// ─────────────────────────────────────────
function renderJobs(jobs) {
  const grid = document.getElementById('jobsGrid');

  if (jobs.length === 0) {
    grid.innerHTML = `
      <div class="state-box">
        <div class="state-icon">📋</div>
        <h3>No jobs found</h3>
        <p>Try a different filter, or <a href="job-posting.html" style="color:#4a9eff">post a new job</a>.</p>
      </div>`;
    return;
  }

  grid.innerHTML = jobs.map(job => createJobCard(job)).join('');
}

function createJobCard(job) {
  const postedDate = new Date(job.postedDate || job.createdAt).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const skills = job.requirements?.skills || [];
  const visibleSkills = skills.slice(0, 4);
  const extraCount  = skills.length - visibleSkills.length;
  const skillChips  = visibleSkills.map(s => `<span class="skill-chip">${s}</span>`).join('');
  const moreChip    = extraCount > 0 ? `<span class="skill-chip more">+${extraCount} more</span>` : '';

  const salaryMin = job.salary?.min ? `RM ${Number(job.salary.min).toLocaleString()}` : '—';
  const salaryMax = job.salary?.max ? `RM ${Number(job.salary.max).toLocaleString()}` : '—';
  const empType   = (job.employmentType || '').replace('_', ' ');
  const location  = job.requirements?.location || '—';
  const education = job.requirements?.education || '—';
  const experience = job.requirements?.experience ?? '—';
  const applicants = job.applicantCount ?? (job.applications?.length ?? '—');

  const toggleLabel = job.status === 'ACTIVE' ? '🔴 Close Job'  : '🟢 Reopen Job';
  const toggleClass = job.status === 'ACTIVE' ? 'btn-toggle-close' : 'btn-toggle-open';
  const closedClass = job.status === 'CLOSED' ? 'closed-card' : '';

  return `
    <div class="job-card ${closedClass}" id="job-card-${job._id}">
      <div class="job-card-header">
        <div style="flex:1;min-width:0;">
          <div class="job-title">${job.title}</div>
          <div class="job-meta">
            <span>📍 ${location}</span>
            <span>💼 ${empType}</span>
            <span>📅 ${postedDate}</span>
          </div>
        </div>
        <span class="status-badge badge-${job.status}">${job.status}</span>
      </div>

      <!-- Stats -->
      <div class="job-stats">
        <div class="stat-item">
          <div class="stat-value">${applicants}</div>
          <div class="stat-label">Applicants</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:#facc15">${salaryMin}</div>
          <div class="stat-label">Salary Min</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:#facc15">${salaryMax}</div>
          <div class="stat-label">Salary Max</div>
        </div>
      </div>

      <!-- Info Row -->
      <div class="job-info">
        <span>🎓 ${education}</span>
        <span>🧑‍💼 ${experience}+ yrs exp</span>
      </div>

      <!-- Skills -->
      ${skills.length > 0 ? `<div class="skills-list">${skillChips}${moreChip}</div>` : ''}

      <!-- Actions -->
      <div class="job-actions">
        <button class="btn-action btn-edit" onclick="openEditModal('${job._id}')">✏️ Edit</button>
        <button class="btn-action btn-view-candidates" onclick="viewCandidates('${job._id}')">👥 Candidates</button>
        <button class="btn-action btn-export" onclick="exportJob('${job._id}', '${job.title.replace(/'/g,"")}')">📊 Export CSV</button>
        <button class="btn-action ${toggleClass}" onclick="toggleJobStatus('${job._id}', '${job.status}')">${toggleLabel}</button>
        <button class="btn-action btn-delete" onclick="deleteJob('${job._id}', '${job.title}')">🗑️</button>
      </div>
    </div>`;
}

// ─────────────────────────────────────────
// FILTER
// ─────────────────────────────────────────
function applyFilter() {
  const val = document.getElementById('statusFilter').value;
  filteredJobs = val === 'ALL' ? [...allJobs] : allJobs.filter(j => j.status === val);
  renderJobs(filteredJobs);
}

// ─────────────────────────────────────────
// SUMMARY PILLS
// ─────────────────────────────────────────
function updateSummary() {
  document.getElementById('totalCount').textContent  = allJobs.length;
  document.getElementById('activeCount').textContent = allJobs.filter(j => j.status === 'ACTIVE').length;
  document.getElementById('closedCount').textContent = allJobs.filter(j => j.status === 'CLOSED').length;
}

// ─────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────

/**
 * Open the edit modal and pre-fill it with existing job data.
 * Uses the already-loaded allJobs array to avoid an extra API call.
 */
function openEditModal(jobId) {
  // Find the job from already-loaded data (avoids extra API round-trip)
  const job = allJobs.find(j => j._id === jobId);
  if (!job) {
    showToast('Job data not found. Please refresh the page.', 'error');
    return;
  }

  currentEditId = jobId;

  // Populate form fields
  document.getElementById('editJobId').value          = jobId;
  document.getElementById('editTitle').value          = job.title || '';
  document.getElementById('editLocation').value       = job.requirements?.location || '';
  document.getElementById('editEmploymentType').value = job.employmentType || 'FULL_TIME';
  document.getElementById('editDescription').value    = job.description || '';
  document.getElementById('editSkills').value         = (job.requirements?.skills || []).join(', ');
  document.getElementById('editEducation').value      = job.requirements?.education || 'bachelor';
  document.getElementById('editExperience').value     = String(job.requirements?.experience ?? 0);
  document.getElementById('editSalaryMin').value      = job.salary?.min || '';
  document.getElementById('editSalaryMax').value      = job.salary?.max || '';
  document.getElementById('editStatus').value         = job.status || 'ACTIVE';

  // Show the modal
  document.getElementById('editModal').classList.add('open');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('open');
  currentEditId = null;
}

// Close when clicking the dark overlay outside the box
document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

async function saveJob() {
  const jobId = currentEditId;
  if (!jobId) return;

  const title = document.getElementById('editTitle').value.trim();
  if (!title) { showToast('Job title is required', 'error'); return; }

  // Show loading on save button
  const saveBtn = document.querySelector('.btn-save');
  if (saveBtn) { saveBtn.textContent = '⏳ Saving...'; saveBtn.disabled = true; }

  const skillsRaw  = document.getElementById('editSkills').value;
  const skillsList = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const payload = {
    title,
    description:    document.getElementById('editDescription').value.trim(),
    employmentType: document.getElementById('editEmploymentType').value,
    status:         document.getElementById('editStatus').value,
    requirements: {
      location:   document.getElementById('editLocation').value.trim(),
      education:  document.getElementById('editEducation').value,
      experience: Number(document.getElementById('editExperience').value),
      skills:     skillsList
    },
    salary: {
      min:      Number(document.getElementById('editSalaryMin').value) || 0,
      max:      Number(document.getElementById('editSalaryMax').value) || 0,
      currency: 'RM'
    }
  };

  try {
    const token = window.auth.getToken();
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/hr/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Update failed');

    closeModal();
    showToast('✅ Job updated successfully!', 'success');
    await loadMyJobs();

  } catch (err) {
    console.error('Save job error:', err);
    showToast('Error: ' + err.message, 'error');
  } finally {
    if (saveBtn) { saveBtn.textContent = '💾 Save Changes'; saveBtn.disabled = false; }
  }
}


// ─────────────────────────────────────────
// TOGGLE STATUS (Close / Reopen)
// ─────────────────────────────────────────
async function toggleJobStatus(jobId, currentStatus) {
  const newStatus = currentStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
  const label     = newStatus === 'CLOSED' ? 'close' : 'reopen';

  if (!confirm(`Are you sure you want to ${label} this job?`)) return;

  try {
    const res  = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/hr/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update status');

    showToast(`✅ Job ${label === 'close' ? 'closed' : 'reopened'} successfully!`, 'success');
    await loadMyJobs();

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────
// DELETE JOB
// ─────────────────────────────────────────
async function deleteJob(jobId, jobTitle) {
  if (!confirm(`Are you sure you want to permanently delete "${jobTitle}"?\n\nThis cannot be undone.`)) return;

  try {
    const res  = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/hr/jobs/${jobId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Delete failed');

    showToast('🗑️ Job deleted successfully!', 'success');
    await loadMyJobs();

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────
// VIEW CANDIDATES
// ─────────────────────────────────────────
function viewCandidates(jobId) {
  window.location.href = `candidate-ranking.html?jobId=${jobId}`;
}

// ─────────────────────────────────────────
// EXPORT JOB APPLICANTS TO CSV
// ─────────────────────────────────────────
async function exportJob(jobId, jobTitle) {
  try {
    const token = window.auth.getToken();
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/hr/jobs/${jobId}/export-csv`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Export failed');
    }

    // Safe filename from job title
    const safeName = jobTitle.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `applicants-${safeName}-${date}.csv`;

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showToast(`📊 Exported applicants for "${jobTitle}"`, 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// ─────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────
function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', e => {
      e.preventDefault();
      window.auth.logout();
      window.location.href = '../index.html';
    });
  }
}

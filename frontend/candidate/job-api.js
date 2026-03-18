// Job Listings API Integration
async function loadJobs() {
  const jobsContainer = document.querySelector('.jobs-grid');
  if (!jobsContainer) return;
  
  try {
    // Show loading state
    jobsContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Loading jobs...</p>';
    
    // Fetch jobs from backend
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/candidates/jobs`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load jobs');
    }
    
    const jobs = data.data.jobs;
    
    // If no jobs, show message
    if (!jobs || jobs.length === 0) {
      jobsContainer.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
          <h3 style="color: #666; margin-bottom: 10px;">No jobs available</h3>
          <p style="color: #999;">Check back later for new opportunities!</p>
        </div>
      `;
      return;
    }
    
    // Clear loading and render jobs
    jobsContainer.innerHTML = '';
    
    jobs.forEach(job => {
      const jobCard = createJobCard(job);
      jobsContainer.appendChild(jobCard);
    });
    
  } catch (error) {
    console.error('Error loading jobs:', error);
    jobsContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
        <h3 style="color: #ff6b9d; margin-bottom: 10px;">⚠️ Error Loading Jobs</h3>
        <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
        <button class="btn btn-primary" onclick="loadJobs()">Try Again</button>
      </div>
    `;
  }
}

// Create job card HTML element — premium style
function createJobCard(job) {
  const card = document.createElement('div');
  card.className = 'jc';

  // Posted date
  const postedDate = new Date(job.postedDate || job.createdAt);
  const daysAgo    = Math.floor((Date.now() - postedDate) / (1000 * 60 * 60 * 24));
  const postedText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;

  const companyName = job.hrId?.fullName || 'Company';
  const skills      = job.requirements?.skills || [];
  const visibleSkills = skills.slice(0, 4);
  const extraCount    = skills.length - visibleSkills.length;

  const skillsHTML = visibleSkills.map(s => `<span class="jc-skill">${s}</span>`).join('') +
    (extraCount > 0 ? `<span class="jc-skill more">+${extraCount}</span>` : '');

  const salary = job.salary?.min && job.salary?.max
    ? `RM ${Number(job.salary.min).toLocaleString()} – RM ${Number(job.salary.max).toLocaleString()}`
    : null;

  // Employment type label + badge class
  const typeKey   = job.employmentType || 'FULL_TIME';
  const typeLabel = typeKey.replace('_', ' ');
  const typeCls   = typeKey === 'CONTRACT' ? 'CONTRACT' : typeKey === 'PART_TIME' ? 'PART_TIME' : typeKey === 'INTERNSHIP' ? 'INTERNSHIP' : '';

  const desc = (job.description || '').substring(0, 180) + (job.description?.length > 180 ? '…' : '');

  card.innerHTML = `
    <div class="jc-head">
      <div>
        <div class="jc-title">${job.title}</div>
        <div class="jc-company">${companyName}</div>
      </div>
      <span class="jc-type ${typeCls}">${typeLabel}</span>
    </div>

    <div class="jc-meta">
      <div class="jc-meta-item"><span class="ico">📍</span>${job.requirements?.location || 'Not specified'}</div>
      ${salary ? `<div class="jc-meta-item jc-salary"><span class="ico">💰</span>${salary}</div>` : ''}
      <div class="jc-meta-item"><span class="ico">🕐</span>${postedText}</div>
    </div>

    ${skills.length > 0 ? `<div class="jc-skills">${skillsHTML}</div>` : ''}

    <p class="jc-desc">${desc}</p>

    <div class="jc-actions">
      <button class="jc-btn-outline" onclick="viewJobDetails('${job._id}')">View Details</button>
      <button class="jc-btn-apply" onclick="applyToJob('${job._id}')">Apply Now →</button>
    </div>
  `;

  return card;
}

// All loaded jobs (for client-side filtering)
let allLoadedJobs = [];

// View job details — shows a modal with full details
function viewJobDetails(jobId) {
  const job = allLoadedJobs.find(j => j._id === jobId);
  if (!job) return;

  const empType = (job.employmentType || '').replace('_', ' ');
  const salaryText = job.salary?.min && job.salary?.max
    ? `RM ${Number(job.salary.min).toLocaleString()} – RM ${Number(job.salary.max).toLocaleString()}`
    : 'Not specified';
  const skills = (job.requirements?.skills || []).map(s => `<span class="skill-badge">${s}</span>`).join('');

  // Remove existing modal if any
  document.getElementById('jobDetailModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'jobDetailModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `
    <div style="background:#1a1f3a;border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:2rem;width:100%;max-width:580px;max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;">
        <div>
          <h2 style="font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:0.3rem;">${job.title}</h2>
          <div style="font-size:0.85rem;color:rgba(255,255,255,0.5);">
            📍 ${job.requirements?.location || 'Not specified'} &nbsp;•&nbsp;
            💼 ${empType} &nbsp;•&nbsp;
            💰 ${salaryText}
          </div>
        </div>
        <button onclick="document.getElementById('jobDetailModal').remove()" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:1.5rem;cursor:pointer;line-height:1;">✕</button>
      </div>
      ${skills ? `<div style="margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:0.4rem;">${skills}</div>` : ''}
      <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:1rem;margin-bottom:1rem;">
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.45);text-transform:uppercase;margin-bottom:0.5rem;">Job Description</div>
        <p style="color:rgba(255,255,255,0.8);font-size:0.9rem;line-height:1.6;white-space:pre-wrap;">${job.description}</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
        <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:0.75rem;">
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);margin-bottom:0.25rem;">Education</div>
          <div style="color:#fff;font-size:0.9rem;">${job.requirements?.education || '—'}</div>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:0.75rem;">
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);margin-bottom:0.25rem;">Experience</div>
          <div style="color:#fff;font-size:0.9rem;">${job.requirements?.experience ?? 0}+ years</div>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;">
        <button onclick="document.getElementById('jobDetailModal').remove()" style="flex:1;padding:0.65rem;border-radius:9px;border:1.5px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.07);color:#fff;font-weight:600;cursor:pointer;">Close</button>
        <button onclick="document.getElementById('jobDetailModal').remove(); applyToJob('${job._id}')" style="flex:1;padding:0.65rem;border-radius:9px;border:none;background:linear-gradient(135deg,#4a9eff,#0066ff);color:#fff;font-weight:700;cursor:pointer;">Apply Now</button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// Update results count label
function updateResultsCount(count) {
  const el = document.getElementById('resultsCount');
  if (el) el.innerHTML = count > 0
    ? `<strong>${count}</strong> job${count !== 1 ? 's' : ''} found`
    : 'No jobs found';
}

// Client-side filter/search
function filterJobs() {
  const search   = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const location = (document.getElementById('locationFilter')?.value || 'all').toLowerCase();
  const type     = document.getElementById('typeFilter')?.value || 'all';

  const filtered = allLoadedJobs.filter(job => {
    const matchSearch   = !search || job.title.toLowerCase().includes(search) || (job.requirements?.skills || []).some(s => s.toLowerCase().includes(search));
    const matchLocation = location === 'all' || (job.requirements?.location || '').toLowerCase().includes(location);
    const matchType     = type === 'all' || job.employmentType === type;
    return matchSearch && matchLocation && matchType;
  });

  updateResultsCount(filtered.length);
  const grid = document.querySelector('.jobs-grid');
  if (!grid) return;
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="jc-empty"><div class="icon">🔍</div><p>No jobs match your search.</p></div>';
    return;
  }
  grid.innerHTML = '';
  filtered.forEach(job => grid.appendChild(createJobCard(job)));
}

// Apply to job
async function applyToJob(jobId) {
  if (!window.auth.isAuthenticated()) {
    alert('Please login to apply for jobs');
    window.location.href = 'candidate-login.html';
    return;
  }

  // Check resume via backend profile
  try {
    const profileRes = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/candidates/profile`);
    const profileData = await profileRes.json();
    const hasResume = profileData?.data?.candidateProfile?.resumePath;

    if (!hasResume) {
      if (confirm('You need to upload your resume before applying.\n\nWould you like to upload it now?')) {
        window.location.href = 'resume-upload.html';
      }
      return;
    }
  } catch (e) {
    // If profile check fails, fall back to letting the backend reject
    console.warn('Profile check failed, proceeding with apply:', e.message);
  }

  try {
    const response = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/candidates/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert('✅ Application submitted successfully!\n\nView it in My Applications.');
      // Update the Apply button to "Applied"
      const btn = document.querySelector(`[onclick*="${jobId}"]`);
      if (btn && btn.textContent.includes('Apply')) {
        btn.textContent = '✓ Applied';
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
    } else {
      alert(`❌ ${data.message || 'Failed to submit application'}`);
    }
  } catch (error) {
    console.error('Apply error:', error);
    alert('Network error. Please try again.');
  }
}

// Override loadJobs to also store jobs for filtering
const _originalLoadJobs = loadJobs;
async function loadJobs() {
  const jobsContainer = document.querySelector('.jobs-grid');
  if (!jobsContainer) return;

  try {
    jobsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,0.5);">⏳ Loading jobs...</div>';

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/candidates/jobs`);
    const data = await response.json();

    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load jobs');

    allLoadedJobs = data.data.jobs || [];

    if (allLoadedJobs.length === 0) {
      jobsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,0.5);">No active jobs available. Check back soon!</div>';
      return;
    }

    jobsContainer.innerHTML = '';
    allLoadedJobs.forEach(job => jobsContainer.appendChild(createJobCard(job)));
    updateResultsCount(allLoadedJobs.length);

  } catch (error) {
    console.error('Error loading jobs:', error);
    jobsContainer.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <div style="color:#f87171;font-size:1.1rem;margin-bottom:1rem;">⚠️ Error Loading Jobs</div>
        <p style="color:rgba(255,255,255,0.5);margin-bottom:1rem;">${error.message}</p>
        <button class="btn btn-primary" onclick="loadJobs()">Try Again</button>
      </div>`;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', loadJobs);

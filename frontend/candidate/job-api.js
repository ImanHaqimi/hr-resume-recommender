// Job Listings API Integration
async function loadJobs() {
  const jobsContainer = document.querySelector('.jobs-grid');
  if (!jobsContainer) return;
  
  try {
    // Show loading state
    jobsContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Loading jobs...</p>';
    
    // Fetch jobs from backend
    const response = await fetch(`${CONFIG.API_BASE_URL}/candidates/jobs`);
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

// Create job card HTML element
function createJobCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card';
  
  // Format posted date
  const postedDate = new Date(job.postedDate);
  const daysAgo = Math.floor((Date.now() - postedDate) / (1000 * 60 * 60 * 24));
  const postedText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
  
  // Get company name from HR user
  const companyName = job.hrId?.fullName || 'Company';
  
  // Format skills
  const skills = job.requirements?.skills || [];
  const skillsHTML = skills.slice(0, 4).map(skill => 
    `<span class="skill-badge">${skill}</span>`
  ).join('');
  
  card.innerHTML = `
    <div class="job-header">
      <div class="job-title-section">
        <h3>${job.title}</h3>
        <p class="company-name">${companyName}</p>
      </div>
      <span class="job-type">${job.employmentType || 'Full-time'}</span>
    </div>
    <div class="job-details">
      <div class="job-detail-item">
        <span class="detail-icon">📍</span>
        <span>${job.requirements?.location || 'Location not specified'}</span>
      </div>
      ${job.salary?.min && job.salary?.max ? `
        <div class="job-detail-item">
          <span class="detail-icon">💰</span>
          <span>RM ${job.salary.min.toLocaleString()} - RM ${job.salary.max.toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="job-detail-item">
        <span class="detail-icon">📅</span>
        <span>Posted ${postedText}</span>
      </div>
    </div>
    ${skills.length > 0 ? `
      <div class="job-skills">
        ${skillsHTML}
        ${skills.length > 4 ? `<span class="skill-badge">+${skills.length - 4} more</span>` : ''}
      </div>
    ` : ''}
    <div class="job-description">
      <p>${job.description.substring(0, 150)}${job.description.length > 150 ? '...' : ''}</p>
    </div>
    <div class="job-actions">
      <button class="btn btn-outline btn-small" onclick="viewJobDetails('${job._id}')">View Details</button>
      <button class="btn btn-primary btn-small" onclick="applyToJob('${job._id}')">Apply Now</button>
    </div>
  `;
  
  return card;
}

// View job details (placeholder - can be expanded later)
function viewJobDetails(jobId) {
  // TODO: Implement job details modal or page
  alert(`Job details for ID: ${jobId}\n\nThis feature will show full job details.`);
}

// Apply to job
async function applyToJob(jobId) {
  // Check if user is authenticated
  if (!window.auth.isAuthenticated()) {
    alert('Please login to apply for jobs');
    window.location.href = 'candidate-login.html';
    return;
  }
  
  // Check if resume is uploaded (from localStorage for now)
  const hasResume = localStorage.getItem('hasResume') === 'true';
  
  if (!hasResume) {
    const upload = confirm('You need to upload your resume before applying.\n\nWould you like to upload it now?');
    if (upload) {
      window.location.href = 'resume-upload.html';
    }
    return;
  }
  
  try {
    const response = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/candidates/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('✅ Application submitted successfully!\n\nYou can view your applications in the Applications section.');
    } else {
      alert(`❌ ${data.message || 'Failed to submit application'}`);
    }
  } catch (error) {
    console.error('Apply error:', error);
    alert('Network error. Please try again.');
  }
}

// Initialize job listings on page load
if (document.querySelector('.jobs-grid')) {
  loadJobs();
}

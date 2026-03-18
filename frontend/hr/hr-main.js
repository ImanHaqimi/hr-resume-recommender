// HR Portal JavaScript

// Job Posting - Submit to Backend
async function initJobPosting() {
  const jobPostingForm = document.getElementById('jobPostingForm');
  
  if (!jobPostingForm) return;

  jobPostingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      title: document.getElementById('jobTitle').value,
      department: document.getElementById('department').value,
      description: document.getElementById('jobDescription').value,
      employmentType: document.getElementById('employmentType').value,
      requirements: {
        education: document.getElementById('education').value,
        experience: parseInt(document.getElementById('experience').value) || 0,
        skills: document.getElementById('skills').value.split(',').map(s => s.trim()),
        location: document.getElementById('location').value
      },
      salary: {
        min: parseInt(document.getElementById('salaryMin').value) || 0,
        max: parseInt(document.getElementById('salaryMax').value) || 0
      },
      benefits: document.getElementById('benefits').value,
      allowances: document.getElementById('allowances')?.value || '',
      expectedStartDate: document.getElementById('expectedStartDate').value,
      applicationDeadline: document.getElementById('applicationDeadline')?.value || null,
      minimumMatchThreshold: parseInt(document.getElementById('minimumMatchThreshold')?.value, 10) || 40
    };
    
    try {
      // Post job to backend
      const response = await window.auth.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/hr/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('✅ Job posted successfully!');
        window.location.href = 'dashboard.html';
      } else {
        alert(`❌ ${data.message || 'Failed to post job'}`);
      }
    } catch (error) {
      console.error('Job posting error:', error);
      alert('Network error. Please check if the backend is running.');
    }
  });
}

// Candidate Ranking - Resume Modal and Actions
function initCandidateRanking() {




  window.exportCandidates = function() {
    // In real implementation, this would export to CSV/Excel
    alert('Exporting candidate list...\n\nThis would generate a CSV/Excel file with:\n- Name, Phone, Address\n- Qualifications\n- Job History\n- Match Score');
  };


}

// HR Login
function initHRLogin() {
  const hrLoginForm = document.getElementById('hrLoginForm');
  if (!hrLoginForm) return;

  hrLoginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store JWT token and user data
        window.auth.saveToken(data.data.token);
        window.auth.saveUserData(data.data.user);
        
        // Check if user is HR
        if (data.data.user.role === 'HR') {
          alert('Login successful! Welcome to HR Portal.');
          window.location.href = 'dashboard.html';
        } else {
          alert('This is the HR login. Please use the Candidate portal.');
          window.auth.removeToken();
        }
      } else {
        alert(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Network error. Please check if the backend is running.');
    }
  });
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
  initJobPosting();
  initCandidateRanking();
  initHRLogin();
});


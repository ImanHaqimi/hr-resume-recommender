// Candidate Portal JavaScript

// Resume Upload - File Handling
function initResumeUpload() {
  const fileInput = document.getElementById('fileInput');
  const uploadArea = document.getElementById('uploadArea');
  const uploadedFile = document.getElementById('uploadedFile');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const removeFile = document.getElementById('removeFile');
  const submitResume = document.getElementById('submitResume');

  if (!fileInput || !uploadArea) return;

  // File input change
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      displayFile(file);
    }
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = '#4a9eff';
    uploadArea.style.background = 'rgba(74, 158, 255, 0.1)';
  });

  uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    uploadArea.style.background = 'transparent';
  });

  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    uploadArea.style.background = 'transparent';
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      displayFile(file);
    }
  });

  function displayFile(file) {
    if (!uploadedFile || !fileName || !fileSize) return;
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    uploadArea.style.display = 'none';
    uploadedFile.style.display = 'flex';
    
    // Enable submit button when file is uploaded
    if (submitResume) {
      submitResume.disabled = false;
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  if (removeFile) {
    removeFile.addEventListener('click', function() {
      if (fileInput) fileInput.value = '';
      if (uploadArea) uploadArea.style.display = 'block';
      if (uploadedFile) uploadedFile.style.display = 'none';
      
      // Disable submit button when file is removed
      if (submitResume) {
        submitResume.disabled = true;
      }
    });
  }

  // Handle resume submission
  if (submitResume) {
    submitResume.addEventListener('click', function() {
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        // Mark that user has uploaded a resume
        localStorage.setItem('hasResume', 'true');
        localStorage.setItem('resumeName', file.name);
        
        alert(`✅ Resume uploaded successfully!\n\nFile: ${file.name}\n\nOur AI is now analyzing your resume...\n\nYou can now apply for jobs!`);
        // In real implementation, this would upload to server
        window.location.href = 'job-listing.html';
      }
    });
  }
}

// Candidate Registration - Form Validation
function initCandidateRegister() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const phone = document.getElementById('phone');
    
    // Check for fullName field (some forms) or firstName/lastName (other forms)
    let fullNameValue;
    const fullNameField = document.getElementById('fullName');
    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    
    if (fullNameField) {
      fullNameValue = fullNameField.value;
    } else if (firstNameField && lastNameField) {
      fullNameValue = `${firstNameField.value} ${lastNameField.value}`.trim();
    } else {
      alert('Please provide your name');
      return;
    }
    
    if (!password || !confirmPassword) return;
    
    // Validation
    if (password.value !== confirmPassword.value) {
      alert('Passwords do not match!');
      return;
    }
    
    if (password.value.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          fullName: fullNameValue,
          phone: phone ? phone.value : '',
          role: 'CANDIDATE'
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store JWT token and user data (user is automatically logged in)
        window.auth.saveToken(data.data.token);
        window.auth.saveUserData(data.data.user);
        
        alert('Account created successfully! Welcome to AI Resume Matcher.');
        window.location.href = 'job-listing.html';
      } else {
        alert(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Network error. Please check if the backend is running.');
    }
  });
}

// Candidate Login
function initCandidateLogin() {
  const candidateLoginForm = document.getElementById('candidateLoginForm');
  if (!candidateLoginForm) return;

  candidateLoginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
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
        
        // Check if user is a candidate
        if (data.data.user.role === 'CANDIDATE') {
          alert('Login successful! Welcome back.');
          window.location.href = 'job-listing.html';
        } else {
          alert('This is the candidate login. Please use the HR portal.');
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

// Job Application Handling
function initJobApplications() {
  const applyButtons = document.querySelectorAll('.btn-primary.btn-small');
  
  applyButtons.forEach(button => {
    // Only attach if button says "Apply Now"
    if (button.textContent.trim() === 'Apply Now') {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check if user has uploaded a resume (in real app, check from backend)
        const hasResume = localStorage.getItem('hasResume') === 'true';
        
        if (!hasResume) {
          // Redirect to resume upload if no resume exists
          if (confirm('You need to upload your resume before applying.\n\nWould you like to upload your resume now?')) {
            window.location.href = 'resume-upload.html';
          }
        } else {
          // Get job title from the card
          const jobCard = button.closest('.job-card');
          const jobTitle = jobCard ? jobCard.querySelector('h3').textContent : 'this job';
          
          // Show success message
          alert(`✅ Application Submitted Successfully!\\n\\nJob: ${jobTitle}\\n\\nYour application has been sent to the employer.\\nOur AI has matched your resume with the job requirements.\\n\\nYou'll receive updates via email!`);
          
          // In real implementation, this would call the backend API
          // For now, just update the button to show applied status
          button.textContent = '✓ Applied';
          button.disabled = true;
          button.style.opacity = '0.6';
        }
      });
    }
  });
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
  initResumeUpload();
  initCandidateRegister();
  initCandidateLogin();
  initJobApplications(); // Add job application handlers
});


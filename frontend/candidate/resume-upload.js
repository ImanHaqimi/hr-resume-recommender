// Resume Upload Backend Integration
let selectedFile = null;

// Initialize drag and drop
function initResumeUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const uploadedFile = document.getElementById('uploadedFile');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const removeFile = document.getElementById('removeFile');
  const submitButton = document.getElementById('submitResume');

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, function(e) {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Highlight drop area when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, function() {
      uploadArea.style.borderColor = '#4a9eff';
      uploadArea.style.background = 'rgba(74, 158, 255, 0.1)';
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, function() {
      uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      uploadArea.style.background = 'rgba(74, 158, 255, 0.05)';
    });
  });

  // Handle dropped files
  uploadArea.addEventListener('drop', function(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Handle file input change
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Remove file
  removeFile.addEventListener('click', function() {
    selectedFile = null;
    uploadArea.style.display = 'flex';
    uploadedFile.style.display = 'none';
    submitButton.disabled = true;
    fileInput.value = '';
  });

  // Submit resume
  submitButton.addEventListener('click', uploadResume);
}

// Handle file selection
function handleFile(file) {
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    alert('❌ Please upload a PDF, DOC, or DOCX file');
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ File size must be less than 5MB');
    return;
  }

  // Store file and update UI
  selectedFile = file;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatFileSize(file.size);
  document.getElementById('uploadArea').style.display = 'none';
  document.getElementById('uploadedFile').style.display = 'flex';
  document.getElementById('submitResume').disabled = false;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Upload resume to backend
async function uploadResume() {
  if (!selectedFile) {
    alert('Please select a file first');
    return;
  }

  const submitButton = document.getElementById('submitResume');
  submitButton.disabled = true;
  submitButton.textContent = 'Uploading...';

  try {
    // Create FormData
    const formData = new FormData();
    formData.append('resume', selectedFile);

    // Get auth token
    const token = window.auth.getToken();
    if (!token) {
      alert('Please login first');
      window.location.href = 'candidate-login.html';
      return;
    }

    console.log('📤 Uploading resume to:', `${CONFIG.API_BASE_URL}/candidates/resume`);
    console.log('📄 File:', selectedFile.name, selectedFile.size, 'bytes');

    // Upload to backend
    const response = await fetch(`${CONFIG.API_BASE_URL}/candidates/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('📥 Response status:', response.status);

    const data = await response.json();
    console.log('📥 Response data:', data);

    if (response.ok && data.success) {
      // Store resume upload status
      localStorage.setItem('hasResume', 'true');
      localStorage.setItem('resumeFilename', data.data.filename);

      alert('✅ Resume uploaded successfully!\n\nYou can now apply to jobs.');
      
      // Redirect to job listings
      setTimeout(() => {
        window.location.href = 'job-listing.html';
      }, 1500);
    } else {
      console.error('❌ Upload failed:', data);
      alert(`❌ ${data.message || 'Failed to upload resume'}`);
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Resume';
    }
  } catch (error) {
    console.error('Upload error (detailed):', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    alert(`Network error: ${error.message}. Please try again.`);
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Resume';
  }
}

// Initialize on page load
if (document.getElementById('uploadArea')) {
  initResumeUpload();
}

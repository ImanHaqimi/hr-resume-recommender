// Frontend Configuration
const CONFIG = {
  // API Configuration (to be updated with actual backend URL)
  API_BASE_URL: 'http://localhost:8000/api', // Change to your backend URL
  
  // Application Settings
  APP_NAME: 'AI Resume Matcher',
  VERSION: '1.0.0',
  
  // Features
  FEATURES: {
    ENABLE_EXPORT: true,
    ENABLE_RESUME_PREVIEW: true,
    ENABLE_APPROVAL_WORKFLOW: true,
    ENABLE_MULTI_PLATFORM_POSTING: true
  },
  
  // Job Posting Platforms
  PLATFORMS: [
    { id: 'indeed', name: 'Indeed', enabled: true },
    { id: 'jobstreet', name: 'JobStreet', enabled: true },
    { id: 'facebook', name: 'Facebook', enabled: true },
    { id: 'myfuturejobs', name: 'MyFutureJobs', enabled: true }
  ],
  
  // Default Weightage Settings
  DEFAULT_WEIGHTAGE: {
    EDUCATION: 40,
    SKILLS: 35,
    EXPERIENCE: 25
  },
  
  // File Upload Settings
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FORMATS: ['.pdf', '.doc', '.docx'],
    PREFERRED_FORMAT: 'pdf'
  },
  
  // Pagination
  PAGINATION: {
    ITEMS_PER_PAGE: 10,
    CANDIDATES_PER_PAGE: 12
  }
};


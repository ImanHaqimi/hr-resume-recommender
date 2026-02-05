/**
 * Frontend Authentication Utilities
 * Handles JWT token storage, retrieval, and authentication state
 */

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

/**
 * Save authentication token to localStorage
 * @param {string} token - JWT token
 */
function saveToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Get authentication token from localStorage
 * @returns {string|null} JWT token or null
 */
function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Remove authentication token from localStorage (logout)
 */
function removeToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  // Clear any other localStorage items from old implementation
  localStorage.removeItem('hasResume');
  localStorage.removeItem('resumeName');
}

/**
 * Save user data to localStorage
 * @param {object} userData - User profile data
 */
function saveUserData(userData) {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

/**
 * Get user data from localStorage
 * @returns {object|null} User data or null
 */
function getUserData() {
  const data = localStorage.getItem(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

/**
 * Decode JWT token to get payload
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null
 */
function decodeToken(token) {
  try {
    if (!token) return null;
    
    // JWT format: header.payload.signature
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // exp is in seconds, Date.now() returns milliseconds
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
function isAuthenticated() {
  const token = getToken();
  
  if (!token) return false;
  
  if (isTokenExpired(token)) {
    // Token expired, clear it
    removeToken();
    return false;
  }
  
  return true;
}

/**
 * Redirect to login if not authenticated
 * Call this on protected pages
 */
function requireAuth() {
  if (!isAuthenticated()) {
    // Save intended destination
    localStorage.setItem('redirect_after_login', window.location.pathname);
    window.location.href = '/frontend/index.html';
  }
}

/**
 * Logout user and redirect to home
 */
function logout() {
  removeToken();
  window.location.href = '/frontend/index.html';
}

/**
 * Make authenticated API call
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
async function authenticatedFetch(url, options = {}) {
  const token = getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  // Add Authorization header
  options.headers = options.headers || {};
  options.headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const response = await fetch(url, options);
    
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      removeToken();
      window.location.href = '/frontend/index.html';
      throw new Error('Session expired. Please login again.');
    }
    
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * Get user role from token
 * @returns {string|null} User role (HR/CANDIDATE) or null
 */
function getUserRole() {
  const userData = getUserData();
  return userData ? userData.role : null;
}

/**
 * Check if user has specific role
 * @param {string} role - Required role
 * @returns {boolean} True if user has role, false otherwise
 */
function hasRole(role) {
  return getUserRole() === role;
}

// Export functions for use in other scripts
window.auth = {
  saveToken,
  getToken,
  removeToken,
  saveUserData,
  getUserData,
  isAuthenticated,
  requireAuth,
  logout,
  authenticatedFetch,
  getUserRole,
  hasRole,
  decodeToken,
  isTokenExpired
};

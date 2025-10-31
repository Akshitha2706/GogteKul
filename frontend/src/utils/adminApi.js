import axios from 'axios';

// Create admin API client with proper token handling for frontend
const adminApi = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/adminV2`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach auth token
adminApi.interceptors.request.use((config) => {
  try {
    const token = 
      (typeof window !== 'undefined') && 
      (localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token'));
    
    if (token) {
      // Use Authorization: Bearer token format (standardized with backend)
      config.headers.Authorization = `Bearer ${token}`;
      // Keep x-auth-token for backwards compatibility
      config.headers['x-auth-token'] = token;
    }
  } catch (e) {
    console.error('Error setting auth token:', e);
  }
  return config;
});

// Response interceptor for error handling
adminApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized and redirect to login
      typeof window !== 'undefined' && localStorage.removeItem('authToken');
      typeof window !== 'undefined' && localStorage.removeItem('token');
      typeof window !== 'undefined' && sessionStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default adminApi;

export const withAdminAuth = (config = {}) => {
  const token = 
    (typeof window !== 'undefined') && 
    (localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token'));
  
  return {
    ...config,
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {}),
    },
    baseURL: adminApi.defaults.baseURL,
  };
};
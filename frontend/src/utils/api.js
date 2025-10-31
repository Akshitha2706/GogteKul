import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const baseIncludesApi = API_BASE_URL.endsWith('/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const resolvePath = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (baseIncludesApi && normalized.startsWith('/api/')) {
    return normalized.slice(4);
  }
  return normalized;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      try {
        const current = window.location?.pathname || '/';
        if (current !== '/login') {
          window.location.replace('/login');
        }
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

export default api;

export async function apiLogin(username, password) {
  const res = await api.post(resolvePath('/api/auth/login'), { username, password });
  return res.data;
}

export async function apiRegister(payload) {
  const res = await api.post(resolvePath('/api/auth/register'), payload);
  return res.data;
}

export async function apiFetchNews() {
  const res = await api.get(resolvePath('/api/news'));
  return res.data;
}

export async function apiCreateNews(payload) {
  const res = await api.post(resolvePath('/api/news'), payload);
  return res.data;
}
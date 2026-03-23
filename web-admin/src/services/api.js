import axios from 'axios';
import { normalizeApiError } from './apiError';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — tự gắn token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let browser set multipart boundary automatically.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
    if (typeof config.headers.setContentType === 'function') {
      config.headers.setContentType(undefined);
    } else {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
});

// Response interceptor — xử lý 401
api.interceptors.response.use(
  (response) => {
    if (response?.data && typeof response.data === 'object' && response.data.success === false) {
      return Promise.reject(normalizeApiError({ response }));
    }
    return response.data;
  },
  (error) => {
    const normalized = normalizeApiError(error);
    if (normalized.status === 401 || normalized.errorCode === 'UNAUTHORIZED') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(normalized);
  }
);

export default api;

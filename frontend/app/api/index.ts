import axios from 'axios';

// Use environment variable or fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/api/v1/users/register', data),
  
  login: (data: { username: string; password: string }) =>
    api.post('/api/v1/users/login', data),
  
  getCurrentUser: () => api.get('/api/v1/users/me'),
  
  getUserStats: () => api.get('/api/v1/users/me/stats'),
};

export const transactionAPI = {
  list: (skip = 0, limit = 50) =>
    api.get(`/api/v1/transactions/?skip=${skip}&limit=${limit}`),
  
  create: (data: any) => api.post('/api/v1/transactions/', data),
  
  update: (id: number, data: any) =>
    api.patch(`/api/v1/transactions/${id}`, data),
  
  delete: (id: number) => api.delete(`/api/v1/transactions/${id}`),
  
  getTransactionsByCategory: () =>
    api.get('/api/v1/transactions/?skip=0&limit=1000'),
};

export const budgetAPI = {
  list: () => api.get('/api/v1/budgets/'),
  
  create: (data: { category: string; monthly_limit: number }) =>
    api.post('/api/v1/budgets/', data),
  
  update: (id: number, data: any) => api.patch(`/api/v1/budgets/${id}`, data),
  
  delete: (id: number) => api.delete(`/api/v1/budgets/${id}`),
  
  getStatus: () => api.get('/api/v1/budgets/status'),
  
  resetMonthly: () => api.post('/api/v1/budgets/reset-monthly'),
};

export const achievementAPI = {
  list: () => api.get('/api/v1/achievements/'),
  
  getUserAchievements: () => api.get('/api/v1/achievements/me'),
  
  getStats: () => api.get('/api/v1/achievements/me/stats'),
};

export default api;

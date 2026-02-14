import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  // 1. Use explicit environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. In production, try to detect backend URL from current domain
  if (import.meta.env.PROD) {
    // If frontend is at app.domain.com, backend might be at api.domain.com
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For DigitalOcean App Platform, services are often at same domain with different ports
    // or as separate subdomains. Adjust this logic based on your deployment:
    if (hostname.includes('ondigitalocean.app')) {
      // If services are deployed separately, frontend might be frontend-xxx.ondigitalocean.app
      // and backend might be backend-xxx.ondigitalocean.app
      // You'll need to update this with your actual backend URL
      return `${protocol}//${hostname.replace('frontend', 'backend')}`;
    }
    
    // Default production fallback
    return `${protocol}//${hostname}:8000`;
  }
  
  // 3. Development fallback
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔌 API URL:', API_URL);
}

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
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    
    // Network error - likely can't reach backend
    if (!error.response) {
      console.error('❌ Cannot connect to backend at:', API_URL);
      console.error('Please check:');
      console.error('1. Backend is running');
      console.error('2. VITE_API_URL is set correctly');
      console.error('3. CORS is configured on backend');
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

export const goalAPI = {
  list: () => api.get('/api/v1/goals/'),
  
  create: (data: {
    name: string;
    icon?: string;
    target_amount: number;
    current_amount?: number;
    deadline?: string;
    category?: string;
    description?: string;
  }) => api.post('/api/v1/goals/', data),
  
  update: (id: number, data: any) => api.patch(`/api/v1/goals/${id}`, data),
  
  delete: (id: number) => api.delete(`/api/v1/goals/${id}`),
  
  getActive: () => api.get('/api/v1/goals/active'),
  
  getCompleted: () => api.get('/api/v1/goals/completed'),
  
  getOverdue: () => api.get('/api/v1/goals/overdue'),
  
  getStats: () => api.get('/api/v1/goals/stats'),
  
  updateProgress: (id: number, amount: number) =>
    api.patch(`/api/v1/goals/${id}/progress`, null, { params: { amount } }),
  
  addToGoal: (id: number, amount: number) =>
    api.patch(`/api/v1/goals/${id}/add`, null, { params: { amount } }),
};

export default api;

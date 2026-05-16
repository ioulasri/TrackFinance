import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  // 1. Use explicit environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. In production, detect backend URL from current domain
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (hostname.includes('ondigitalocean.app')) {
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
      const requestUrl = error.config?.url || '';
      // Only force-redirect to landing if this is NOT a login/reset request
      const isAuthEndpoint = requestUrl.includes('/login') || requestUrl.includes('/reset-password');
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
      }
    }

    // Network error - likely can't reach backend
    if (!error.response) {
      console.error('❌ Cannot connect to backend at:', API_URL);
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/v1/users/register', data),

  login: (data: { username: string; password: string }) =>
    api.post('/v1/users/login', data),

  getCurrentUser: () => api.get('/v1/users/me'),

  getUserStats: () => api.get('/v1/users/me/stats'),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/v1/users/me/password', data),

  resetPassword: (data: { username: string; old_password: string; new_password: string }) =>
    api.post('/v1/users/reset-password', data),

  verifyEmail: (token: string) =>
    api.get('/v1/users/verify-email', { params: { token } }),

  resendVerification: (email: string) =>
    api.post('/v1/users/resend-verification', { email }),

  uploadAvatar: (formData: FormData) =>
    api.post('/v1/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateProfile: (data: { username?: string }) =>
    api.patch('/v1/users/me', data),
};

export const transactionAPI = {
  list: (skip = 0, limit = 50) =>
    api.get(`/v1/transactions/?skip=${skip}&limit=${limit}`),

  create: (data: any) => api.post('/v1/transactions/', data),

  update: (id: number, data: any) =>
    api.patch(`/v1/transactions/${id}`, data),

  delete: (id: number) => api.delete(`/v1/transactions/${id}`),

  getTransactionsByCategory: () =>
    api.get('/v1/transactions/?skip=0&limit=1000'),
};

export const budgetAPI = {
  list: () => api.get('/v1/budgets/'),

  create: (data: { category: string; monthly_limit: number }) =>
    api.post('/v1/budgets/', data),

  update: (id: number, data: any) => api.patch(`/v1/budgets/${id}`, data),

  delete: (id: number) => api.delete(`/v1/budgets/${id}`),

  getStatus: () => api.get('/v1/budgets/status'),

  resetMonthly: () => api.post('/v1/budgets/reset-monthly'),
};

export const achievementAPI = {
  list: () => api.get('/v1/achievements/'),

  getUserAchievements: () => api.get('/v1/achievements/me'),

  getStats: () => api.get('/v1/achievements/me/stats'),
};

export const goalAPI = {
  list: () => api.get('/v1/goals/'),

  create: (data: {
    name: string;
    icon?: string;
    target_amount: number;
    current_amount?: number;
    deadline?: string;
    category?: string;
    description?: string;
  }) => api.post('/v1/goals/', data),

  update: (id: number, data: any) => api.patch(`/v1/goals/${id}`, data),

  delete: (id: number) => api.delete(`/v1/goals/${id}`),

  getActive: () => api.get('/v1/goals/active'),

  getCompleted: () => api.get('/v1/goals/completed'),

  getOverdue: () => api.get('/v1/goals/overdue'),

  getStats: () => api.get('/v1/goals/stats'),

  updateProgress: (id: number, amount: number) =>
    api.patch(`/v1/goals/${id}/progress`, null, { params: { amount } }),

  addToGoal: (id: number, amount: number) =>
    api.patch(`/v1/goals/${id}/add`, null, { params: { amount } }),
};

// Analysis API types
export interface AnalysisData {
  financial_health_score: number;
  spending_trend: {
    month: string;
    spending: number;
    income: number;
  }[];
  category_breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  savings_rate: number;
  monthly_comparison: {
    current_month: number;
    previous_month: number;
    change_percentage: number;
  };
  top_categories: {
    category: string;
    amount: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  insights: {
    type: 'warning' | 'success' | 'info';
    title: string;
    description: string;
  }[];
  predictions: {
    next_month_spending: number;
    next_month_income: number;
    confidence_score: number;
  };
  budget_performance: {
    category: string;
    budget: number;
    spent: number;
    percentage: number;
  }[];
}

export const analysisAPI = {
  getAnalysis: async (): Promise<AnalysisData> => {
    const response = await api.get('/v1/analysis/financial-analysis');
    return response.data;
  },
};

// Chat API types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  function_called?: string | null;
  function_args?: object | null;
  data?: object | null;
  conversation_history: ChatMessage[];
}

export interface SuggestionsResponse {
  suggestions: string[];
}

export const chatAPI = {
  sendMessage: async (
    message: string,
    history: { role: string; content: string }[] = []
  ): Promise<ChatResponse> => {
    const response = await api.post('/v1/chat/chat', {
      message,
      conversation_history: history,
    });
    return response.data;
  },

  getSuggestions: async (): Promise<SuggestionsResponse> => {
    const response = await api.get('/v1/chat/chat/suggestions');
    return response.data;
  },
};

export const reportAPI = {
  downloadFinancialReport: async (username: string) => {
    const response = await api.get('/v1/reports/financial-report', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial_report_${username}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default api;

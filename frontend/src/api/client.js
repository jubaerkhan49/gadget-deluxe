import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 token refresh or logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('api/token/')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/token/refresh/', { refresh: refreshToken });
          if (res.data.access) {
            localStorage.setItem('access_token', res.data.access);
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Endpoints
export const deviceApi = {
  getAll: (params) => api.get('/api/devices/', { params }),
  getById: (id) => api.get(`/api/devices/${id}/`),
  create: (data) => api.post('/api/devices/', data),
  update: (id, data) => api.patch(`/api/devices/${id}/`, data),
  delete: (id) => api.delete(`/api/devices/${id}/`),
  scan: (code) => api.get(`/api/devices/scan/`, { params: { code } }),
};

export const shipmentApi = {
  getAll: (params) => api.get('/api/shipments/', { params }),
  getById: (id) => api.get(`/api/shipments/${id}/`),
  createBatch: (data) => api.post('/api/shipments/create-batch/', data),
  update: (id, data) => api.patch(`/api/shipments/${id}/`, data),
  delete: (id) => api.delete(`/api/shipments/${id}/`),
};

export const saleApi = {
  getAll: (params) => api.get('/api/sales/', { params }),
  getById: (id) => api.get(`/api/sales/${id}/`),
  create: (data) => api.post('/api/sales/', data),
};

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats/'),
};

export const sickwApi = {
  parseRaw: (raw_text) => api.post('/api/sickw/parse-raw/', { raw_text }),
};

export const userApi = {
  getAll: (params) => api.get('/api/users/', { params }),
};

export const customerApi = {
  getAll: (params) => api.get('/api/customers/', { params }),
  create: (data) => api.post('/api/customers/', data),
};

export default api;

import axios from 'axios';
import { apiCache } from '../utils/apiCache';

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

// Response interceptor: Handle 401 token refresh or logout & auto-invalidate cache on mutations
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    const url = response.config?.url || '';

    // Automatically invalidate stale caches when any mutation succeeds
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      if (url.includes('/api/devices') || url.includes('/api/device-sale-requests')) {
        apiCache.invalidate('/api/devices');
        apiCache.invalidate('/api/dashboard');
        apiCache.invalidate('/api/analytics');
        apiCache.invalidate('/api/b2b');
      } else if (url.includes('/api/sales')) {
        apiCache.invalidate('/api/sales');
        apiCache.invalidate('/api/dashboard');
        apiCache.invalidate('/api/analytics');
        apiCache.invalidate('/api/devices');
      } else if (url.includes('/api/shipments')) {
        apiCache.invalidate('/api/shipments');
        apiCache.invalidate('/api/devices');
        apiCache.invalidate('/api/dashboard');
        apiCache.invalidate('/api/analytics');
      } else if (url.includes('/api/repairs')) {
        apiCache.invalidate('/api/repairs');
        apiCache.invalidate('/api/devices');
        apiCache.invalidate('/api/dashboard');
      } else if (url.includes('/api/other-goods')) {
        apiCache.invalidate('/api/other-goods');
        apiCache.invalidate('/api/dashboard');
      } else if (url.includes('/api/b2b')) {
        apiCache.invalidate('/api/b2b');
        apiCache.invalidate('/api/devices');
      } else if (url.includes('/api/users') || url.includes('/api/employee-applications')) {
        apiCache.invalidate('/api/users');
        apiCache.invalidate('/api/employee-applications');
        apiCache.invalidate('/api/dashboard');
      }
    }
    return response;
  },
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
  exportCSV: (params) => api.get('/api/devices/export-csv/', { params, responseType: 'blob' }),
  requestSale: (id, data) => api.post(`/api/devices/${id}/request-sale/`, data),
};

export const deviceSaleRequestApi = {
  getAll: (params) => api.get('/api/device-sale-requests/', { params }),
  getById: (id) => api.get(`/api/device-sale-requests/${id}/`),
  approve: (id, data) => api.post(`/api/device-sale-requests/${id}/approve/`, data),
  reject: (id, data) => api.post(`/api/device-sale-requests/${id}/reject/`, data),
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

export const analyticsApi = {
  getStats: (params) => api.get('/api/analytics/', { params }),
};

export const sickwApi = {
  parseRaw: (raw_text) => api.post('/api/sickw/parse-raw/', { raw_text }),
};

export const syncApi = {
  getStatus: () => api.get('/api/sync/status/'),
};

export const repairApi = {
  getAll: (params) => api.get('/api/repairs/', { params }),
  getById: (id) => api.get(`/api/repairs/${id}/`),
  create: (data) => api.post('/api/repairs/', data),
  update: (id, data) => api.patch(`/api/repairs/${id}/`, data),
  delete: (id) => api.delete(`/api/repairs/${id}/`),
};

export const userApi = {
  getAll: (params) => api.get('/api/users/', { params }),
  create: (data) => api.post('/api/users/', data),
  changePassword: (data) => api.post('/api/users/change-password/', data),
  updateProfile: (data) => api.post('/api/users/update-profile/', data),
};

export const profileUpdateApi = {
  getAll: (params) => api.get('/api/profile-update-requests/', { params }),
  approve: (id, data) => api.post(`/api/profile-update-requests/${id}/approve/`, data),
  reject: (id, data) => api.post(`/api/profile-update-requests/${id}/reject/`, data),
};

export const employeeApplicationApi = {
  getAll: (params) => api.get('/api/employee-applications/', { params }),
  submit: (data) => api.post('/api/employee-applications/', data),
  approve: (id) => api.post(`/api/employee-applications/${id}/approve/`),
  reject: (id, data) => api.post(`/api/employee-applications/${id}/reject/`, data),
};

export const customerApi = {
  getAll: (params) => api.get('/api/customers/', { params }),
  create: (data) => api.post('/api/customers/', data),
};

export const otherGoodsApi = {
  getAll: (params) => api.get('/api/other-goods/', { params }),
  getById: (id) => api.get(`/api/other-goods/${id}/`),
  create: (data) => api.post('/api/other-goods/', data),
  update: (id, data) => api.patch(`/api/other-goods/${id}/`, data),
  delete: (id) => api.delete(`/api/other-goods/${id}/`),
  trackPublic: (query) => api.get('/api/public/track-order/', { params: { query } }),
};

export default api;


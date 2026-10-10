import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally (token expired / invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return api.post('/api/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  me: () => api.get('/api/auth/me'),
};

// ── Students ───────────────────────────────────────────────
export const studentsAPI = {
  getMe: ()             => api.get('/api/students/me'),
  updateMe: (data)      => api.put('/api/students/me', data),
  uploadResume: (file)  => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/students/me/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: (params)      => api.get('/api/students/', { params }),
  getById: (id)         => api.get(`/api/students/${id}`),
  verify: (id, data)    => api.put(`/api/students/${id}/verify`, data),
};

// ── Jobs ───────────────────────────────────────────────────
export const jobsAPI = {
  getAll: (params)      => api.get('/api/jobs/', { params }),
  getEligible: ()       => api.get('/api/jobs/eligible'),
  getById: (id)         => api.get(`/api/jobs/${id}`),
  create: (data)        => api.post('/api/jobs/', data),
  update: (id, data)    => api.put(`/api/jobs/${id}`, data),
  delete: (id)          => api.delete(`/api/jobs/${id}`),
};

// ── Applications ───────────────────────────────────────────
export const applicationsAPI = {
  apply: (jobId)                       => api.post('/api/applications/', { job_id: jobId }),
  getMyApplications: ()                => api.get('/api/applications/me'),
  getAll: ()                           => api.get('/api/applications/'),
  getById: (id)                        => api.get(`/api/applications/${id}`),
  getJobApplicants: (jobId)            => api.get(`/api/jobs/${jobId}/applicants`),
  updateRound: (appId, roundId, data)  => api.put(`/api/applications/${appId}/round/${roundId}`, data),
  issueOffer: (appId, data)            => api.post(`/api/applications/${appId}/offer`, data),
  respondToOffer: (appId, data)        => api.put(`/api/applications/${appId}/offer/respond`, data),
};

// ── AI ─────────────────────────────────────────────────────
export const aiAPI = {
  getResumeAnalysis: ()     => api.get('/api/ai/resume-analysis'),
  triggerAnalysis: ()       => api.post('/api/ai/analyze'),
  getSkillGap: (jobId)      => api.get(`/api/ai/skill-gap/${jobId}`),
};

// ── Notifications ──────────────────────────────────────────
export const notificationsAPI = {
  getAll: ()      => api.get('/api/notifications/'),
  markRead: (id)  => api.put(`/api/notifications/${id}/read`),
  markAllRead: () => api.put('/api/notifications/read-all'),
};

// ── Companies ──────────────────────────────────────────────
export const companiesAPI = {
  getMe: ()          => api.get('/api/companies/me'),
  updateMe: (data)   => api.put('/api/companies/me', data),
};

// ── Reports (TPO) ──────────────────────────────────────────
export const reportsAPI = {
  getSummary: ()       => api.get('/api/reports/summary'),
  getPlaced: ()        => api.get('/api/reports/students/placed'),
  getUnplaced: ()      => api.get('/api/reports/students/unplaced'),
};

export default api;

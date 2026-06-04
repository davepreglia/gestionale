import api from './axios'

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  refresh: (token) => api.post('/auth/refresh', {}, { headers: { Authorization: `Bearer ${token}` } }),
  impersonate: (target_user_id) => api.post('/auth/impersonate', { target_user_id }),
}

export const expensesApi = {
  list: (params) => api.get('/expenses', { params }),
  get: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  submit: (id) => api.post(`/expenses/${id}/submit`),
  approve: (id, action, comment, override = false) =>
    api.post(`/expenses/${id}/approve`, { action, comment, override }),
}

export const projectsApi = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  expenses: (id, params) => api.get(`/projects/${id}/expenses`, { params }),
  categories: () => api.get('/categories'),
}

export const approvalsApi = {
  queue: (params) => api.get('/approvals/queue', { params }),
  history: (expenseId) => api.get(`/approvals/history/${expenseId}`),
}

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  assignRole: (id, role) => api.post(`/users/${id}/roles`, { role }),
  removeRole: (id, role) => api.delete(`/users/${id}/roles/${role}`),
}

export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
}

export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  timeline: (year) => api.get('/analytics/expenses/timeline', { params: { year } }),
  byCategory: () => api.get('/analytics/expenses/by-category'),
  budgetUsage: () => api.get('/analytics/budget/usage'),
  myDashboard: () => api.get('/analytics/my-dashboard'),
}

export const documentsApi = {
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  download: (id) => api.get(`/documents/${id}`, { responseType: 'blob' }),
}

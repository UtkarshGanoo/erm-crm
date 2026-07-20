import api from './axios';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  register: (payload) => api.post('/auth/register', payload),
};

export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (payload) => api.post('/customers', payload),
  update: (id, payload) => api.put(`/customers/${id}`, payload),
  addFollowup: (id, payload) => api.post(`/customers/${id}/followups`, payload),
};

export const productApi = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (payload) => api.post('/products', payload),
  update: (id, payload) => api.put(`/products/${id}`, payload),
  addStockMovement: (id, payload) => api.post(`/products/${id}/stock-movement`, payload),
  getStockMovements: (id) => api.get(`/products/${id}/stock-movements`),
};

export const challanApi = {
  list: (params) => api.get('/challans', { params }),
  get: (id) => api.get(`/challans/${id}`),
  create: (payload) => api.post('/challans', payload),
  confirm: (id) => api.patch(`/challans/${id}/confirm`),
  cancel: (id) => api.patch(`/challans/${id}/cancel`),
  downloadPdf: (id) => api.get(`/challans/${id}/pdf`, { responseType: 'blob' }),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};

import api from './api';

const buildQuery = (page = 0, size = 20, search = '') => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));
  if (search?.trim()) params.append('search', search.trim());
  return params.toString();
};

export const userService = {
  getAll: (page = 0, size = 20, search = '') => api.get(`/users?${buildQuery(page, size, search)}`),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleLock: (id) => api.put(`/users/${id}/toggle-lock`),
};

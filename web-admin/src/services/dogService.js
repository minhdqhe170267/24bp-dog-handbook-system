import api from './api';

const buildQuery = (page = 0, size = 10, search = '') => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));
  if (search?.trim()) params.append('search', search.trim());
  return params.toString();
};

export const dogService = {
  getAll: (page = 0, size = 10, search = '') => api.get(`/dogs?${buildQuery(page, size, search)}`),
  getById: (id) => api.get(`/dogs/${id}`),
  create: (data) => api.post('/dogs', data),
  update: (id, data) => api.put(`/dogs/${id}`, data),
  delete: (id) => api.delete(`/dogs/${id}`),
};

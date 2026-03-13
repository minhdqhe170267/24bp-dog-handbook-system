import api from './api';

const buildQuery = (page = 0, size = 10, search = '', status = '') => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));

  if (search?.trim()) params.append('search', search.trim());
  if (status?.trim()) params.append('status', status.trim());

  return params.toString();
};

export const firstAidGuideService = {
  getAll: (page = 0, size = 10, search = '', status = '') =>
    api.get(`/first-aid-guides?${buildQuery(page, size, search, status)}`),
  getById: (id) => api.get(`/first-aid-guides/${id}`),
  create: (data) => api.post('/first-aid-guides', data),
  update: (id, data) => api.put(`/first-aid-guides/${id}`, data),
  delete: (id) => api.delete(`/first-aid-guides/${id}`),
};

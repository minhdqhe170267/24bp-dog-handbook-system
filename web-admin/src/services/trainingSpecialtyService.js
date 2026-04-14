import api from './api';

const buildQuery = (page = 0, size = 20, search = '') => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));
  if (search?.trim()) {
    params.append('search', search.trim());
  }
  return params.toString();
};

export const trainingSpecialtyService = {
  getAll: (page = 0, size = 20, search = '') =>
    api.get(`/training-specialties?${buildQuery(page, size, search)}`),
  getById: (id) => api.get(`/training-specialties/${id}`),
  create: (data) => api.post('/training-specialties', data),
  update: (id, data) => api.put(`/training-specialties/${id}`, data),
  delete: (id) => api.delete(`/training-specialties/${id}`),
};

export default trainingSpecialtyService;

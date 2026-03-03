import api from './api';

export const diseaseService = {
  getAll: (page = 0, size = 10, search = '') =>
    api.get(`/diseases?page=${page}&size=${size}&search=${search}`),
  getById: (id) => api.get(`/diseases/${id}`),
  create: (data) => api.post('/diseases', data),
  update: (id, data) => api.put(`/diseases/${id}`, data),
  delete: (id) => api.delete(`/diseases/${id}`),
};

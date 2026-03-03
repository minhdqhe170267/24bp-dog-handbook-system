import api from './api';

export const medicationService = {
  getAll: (page = 0, size = 10, search = '') =>
    api.get(`/medications?page=${page}&size=${size}&search=${search}`),
  getById: (id) => api.get(`/medications/${id}`),
  create: (data) => api.post('/medications', data),
  update: (id, data) => api.put(`/medications/${id}`, data),
  delete: (id) => api.delete(`/medications/${id}`),
};

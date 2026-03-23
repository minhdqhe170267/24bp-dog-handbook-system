import api from './api';

export const breedService = {
  getAll: (page = 0, size = 10, search = '') =>
    api.get(`/breeds?page=${page}&size=${size}&search=${search}&sort=updatedAt,desc&sort=createdAt,desc`),
  getById: (id) => api.get(`/breeds/${id}`),
  create: (data) => api.post('/breeds', data),
  update: (id, data) => api.put(`/breeds/${id}`, data),
  delete: (id) => api.delete(`/breeds/${id}`),
  compare: (breedIds) => api.post('/breeds/compare', { breedIds }),
  getStages: (id) => api.get(`/breeds/${id}/development-stages`),
};

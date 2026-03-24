import api from './api';

export const nutritionService = {
  getAll: (page = 0, size = 10, search = '') =>
    api.get(`/nutrition-standards?page=${page}&size=${size}&search=${search}&sort=updatedAt,desc&sort=createdAt,desc`),
  getById: (id) => api.get(`/nutrition-standards/${id}`),
  create: (data) => api.post('/nutrition-standards', data),
  update: (id, data) => api.put(`/nutrition-standards/${id}`, data),
  delete: (id) => api.delete(`/nutrition-standards/${id}`),
  calculate: (data) => api.post('/nutrition/calculate', data),
};

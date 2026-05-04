import api from './api';

export const healthRecordService = {
  getByDog: (dogId, page = 0, size = 10) =>
    api.get(`/health-records/by-dog/${dogId}?page=${page}&size=${size}`),
  getById: (id) => api.get(`/health-records/${id}`),
  create: (data) => api.post('/health-records', data),
  update: (id, data) => api.put(`/health-records/${id}`, data),
};

import api from './api';

export const healthSessionService = {
  getByDog: (dogId, page = 0, size = 10) =>
    api.get(`/health-sessions/by-dog/${dogId}?page=${page}&size=${size}`),
  getById: (id) => api.get(`/health-sessions/${id}`),
  create: (data) => api.post('/health-sessions', data),
  addFollowUp: (id, data) => api.post(`/health-sessions/${id}/follow-up`, data),
  resolve: (id, data) => api.put(`/health-sessions/${id}/resolve`, data),
};

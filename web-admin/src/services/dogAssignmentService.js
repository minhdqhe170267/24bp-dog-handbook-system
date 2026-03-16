import api from './api';

export const dogAssignmentService = {
  assign: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  unassign: (id) => api.delete(`/assignments/${id}`),
  getById: (id) => api.get(`/assignments/${id}`),
  getByTrainer: (trainerId) => api.get(`/assignments/by-trainer/${trainerId}`),
  getByDog: (dogId) => api.get(`/assignments/by-dog/${dogId}`),
};

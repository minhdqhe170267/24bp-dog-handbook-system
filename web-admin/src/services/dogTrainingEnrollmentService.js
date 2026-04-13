import api from './api';

export const ENROLLMENT_STATUSES = [
  'ENROLLED',
  'IN_PROGRESS',
  'COMPLETED',
  'SUSPENDED',
  'WITHDRAWN',
];

export const EXERCISE_PROGRESS_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
];

export const dogTrainingEnrollmentService = {
  create: (data) => api.post('/enrollments', data),
  getById: (id) => api.get(`/enrollments/${id}`),
  getByDog: (dogId) => api.get(`/enrollments/dog/${dogId}`),
  getByTrainer: (trainerId) => api.get(`/enrollments/trainer/${trainerId}`),
  getMine: () => api.get('/enrollments/my'),
  update: (id, data) => api.put(`/enrollments/${id}`, data),
  evaluate: (id, data) => api.post(`/enrollments/${id}/evaluate`, data),
  delete: (id) => api.delete(`/enrollments/${id}`),
  restore: (id) => api.put(`/enrollments/${id}/restore`),
};


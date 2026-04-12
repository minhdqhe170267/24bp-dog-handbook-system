import api from './api';

export const trainingProgressService = {
  getById: (id) => api.get(`/training-progress/${id}`),
  getByDog: (dogId) => api.get(`/training-progress/dog/${dogId}`),
  getByTrainer: (trainerId) => api.get(`/training-progress/trainer/${trainerId}`),
  getMine: () => api.get('/training-progress/my'),
  update: (id, data) => api.put(`/training-progress/${id}`, data),
  evaluateExercise: (progressId, data) =>
    api.post(`/training-progress/exercises/${progressId}/evaluate`, data),
};

export default trainingProgressService;

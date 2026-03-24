import api from './api';

export const trainingService = {
  // Training Methods
  getMethods: (page = 0, size = 10) =>
    api.get(`/training-methods?page=${page}&size=${size}&sort=updatedAt,desc&sort=createdAt,desc`),
  getMethodById: (id) => api.get(`/training-methods/${id}`),
  createMethod: (data) => api.post('/training-methods', data),
  updateMethod: (id, data) => api.put(`/training-methods/${id}`, data),
  deleteMethod: (id) => api.delete(`/training-methods/${id}`),

  // Training Exercises
  getExercises: (page = 0, size = 10) =>
    api.get(`/training-exercises?page=${page}&size=${size}&sort=updatedAt,desc&sort=createdAt,desc`),
  getExerciseById: (id) => api.get(`/training-exercises/${id}`),
  createExercise: (data) => api.post('/training-exercises', data),
  updateExercise: (id, data) => api.put(`/training-exercises/${id}`, data),
  deleteExercise: (id) => api.delete(`/training-exercises/${id}`),

  // Training Roadmaps
  getRoadmaps: (page = 0, size = 10) =>
    api.get(`/training-roadmaps?page=${page}&size=${size}&sort=updatedAt,desc&sort=createdAt,desc`),
  getRoadmapById: (id) => api.get(`/training-roadmaps/${id}`),
  createRoadmap: (data) => api.post('/training-roadmaps', data),
  updateRoadmap: (id, data) => api.put(`/training-roadmaps/${id}`, data),
  deleteRoadmap: (id) => api.delete(`/training-roadmaps/${id}`),
};

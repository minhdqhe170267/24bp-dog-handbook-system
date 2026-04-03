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
    api.get(`/exercises?page=${page}&size=${size}&sort=updatedAt,desc&sort=createdAt,desc`),
  getExerciseById: (id) => api.get(`/exercises/${id}`),
  createExercise: (data) => api.post('/exercises', data),
  updateExercise: (id, data) => api.put(`/exercises/${id}`, data),
  deleteExercise: (id) => api.delete(`/exercises/${id}`),

  // Training Roadmaps
  getRoadmaps: (page = 0, size = 10) =>
    api.get(`/roadmaps?page=${page}&size=${size}&sort=updatedAt,desc&sort=createdAt,desc`),
  getRoadmapById: (id) => api.get(`/roadmaps/${id}`),
  createRoadmap: (data) => api.post('/roadmaps', data),
  updateRoadmap: (id, data) => api.put(`/roadmaps/${id}`, data),
  deleteRoadmap: (id) => api.delete(`/roadmaps/${id}`),
};

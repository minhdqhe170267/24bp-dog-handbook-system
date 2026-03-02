import api from './api';

export const symptomService = {
  getAll: () => api.get('/symptoms'),
  check: (symptomIds) => api.post('/symptom-checker/check', { symptomIds }),
};

import api from './api';

export const symptomService = {
  getAll: () => api.get('/symptoms'),
  getByBodyPart: (part) => api.get(`/symptoms/by-body-part?part=${part}`),
  check: (data) => api.post('/symptom-checker/check', data),
};

import api from './api';

export const systemSettingService = {
  getAllGrouped: () => api.get('/system-settings'),
  getByKey: (key) => api.get(`/system-settings/${encodeURIComponent(key)}`),
  update: (key, value) =>
    api.put(`/system-settings/${encodeURIComponent(key)}`, { value }),
  updateBatch: (settings) => api.put('/system-settings/batch', { settings }),
  resetDefaults: () => api.post('/system-settings/reset-defaults'),
};


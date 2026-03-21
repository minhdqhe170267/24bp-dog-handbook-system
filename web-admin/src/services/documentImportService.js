import api from './api';

const buildFormData = (entityType, file) => {
  const formData = new FormData();
  formData.append('entityType', entityType);
  formData.append('file', file);
  return formData;
};

export const documentImportService = {
  getTemplates: () => api.get('/import/templates'),
  preview: (entityType, file) =>
    api.post('/import/preview', buildFormData(entityType, file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirm: (entityType, file) =>
    api.post('/import/confirm', buildFormData(entityType, file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};


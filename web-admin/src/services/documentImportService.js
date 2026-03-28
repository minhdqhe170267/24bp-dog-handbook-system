import api from './api';

const buildFormData = (entityType, file) => {
  const formData = new FormData();
  formData.append('entityType', entityType);
  formData.append('file', file);
  return formData;
};

const triggerBrowserDownload = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

const localizedTemplateFileName = (entityType) => {
  switch (String(entityType || '').trim().toUpperCase()) {
    case 'BREED':
      return 'Mẫu nhập giống chó.xlsx';
    case 'DISEASE':
      return 'Mẫu nhập bệnh.xlsx';
    case 'MEDICATION':
      return 'Mẫu nhập thuốc.xlsx';
    case 'EXERCISE':
      return 'Mẫu nhập bài tập.xlsx';
    case 'NUTRITION':
      return 'Mẫu nhập dinh dưỡng.xlsx';
    case 'TRAINING_METHOD':
      return 'Mẫu nhập phương pháp huấn luyện.xlsx';
    case 'TRAINING_ROADMAP':
      return 'Mẫu nhập lộ trình huấn luyện.xlsx';
    case 'FIRST_AID_GUIDE':
      return 'Mẫu nhập sơ cứu.xlsx';
    case 'DOG_PROFILE':
      return 'Mẫu nhập hồ sơ chó.xlsx';
    default:
      return 'Mẫu nhập dữ liệu.xlsx';
  }
};

export const documentImportService = {
  getTemplates: () => api.get('/import/templates'),
  downloadTemplate: async (entityType) => {
    const blob = await api.get(`/import/templates/${entityType}/file`, { responseType: 'blob' });
    if (!(blob instanceof Blob)) {
      throw new Error('Không nhận được tệp mẫu nhập hợp lệ');
    }
    triggerBrowserDownload(blob, localizedTemplateFileName(entityType));
  },
  preview: (entityType, file) =>
    api.post('/import/preview', buildFormData(entityType, file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirm: (entityType, file) =>
    api.post('/import/confirm', buildFormData(entityType, file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

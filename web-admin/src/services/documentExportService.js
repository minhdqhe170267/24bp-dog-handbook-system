import api from './api';

const buildQuery = (params = {}) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

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

const requestFile = async (url, fileName, params = {}) => {
  const query = buildQuery(params);
  const fullUrl = query ? `${url}?${query}` : url;
  const blob = await api.get(fullUrl, { responseType: 'blob' });
  if (!(blob instanceof Blob)) {
    throw new Error('Không nhận được file export hợp lệ');
  }
  triggerBrowserDownload(blob, fileName);
};

export const documentExportService = {
  exportExcel: (entityType, search) =>
    requestFile(
      `/export/excel/${entityType}`,
      `${String(entityType || 'data').toLowerCase()}_export.xlsx`,
      { search }
    ),

  exportPdf: (entityType, search) =>
    requestFile(
      `/export/pdf/${entityType}`,
      `${String(entityType || 'data').toLowerCase()}_export.pdf`,
      { search }
    ),

  exportTrainerReport: (trainerId, params = {}) =>
    requestFile(
      `/export/report/trainer/${trainerId}`,
      `report_trainer_${trainerId}.pdf`,
      params
    ),

  exportUnitReport: (params = {}) =>
    requestFile(
      '/export/report/unit',
      `report_unit_${new Date().toISOString().slice(0, 10)}.pdf`,
      params
    ),
};


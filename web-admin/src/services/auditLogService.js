import api from './api';

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  const entries = Object.entries(params);
  entries.forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    query.append(key, normalized);
  });
  return query.toString();
};

export const auditLogService = {
  getAll: ({ page = 0, size = 20, actionType, entityType, userId, from, to } = {}) => {
    const query = buildQuery({
      page,
      size,
      actionType,
      entityType,
      userId,
      from,
      to,
    });
    return api.get(`/audit-logs?${query}`);
  },
  getById: (id) => api.get(`/audit-logs/${id}`),
  getStats: () => api.get('/audit-logs/stats'),
};


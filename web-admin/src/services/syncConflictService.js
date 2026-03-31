import api from './api';

const CONFLICT_STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED'];

const parseDateTime = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const normalizePagePayload = (payload, fallbackPage = 0, fallbackSize = 20) => {
  const source = payload?.data || payload || {};
  const content = Array.isArray(source?.content) ? source.content : [];
  return {
    content,
    page: Number.isFinite(source?.page) ? source.page : fallbackPage,
    size: Number.isFinite(source?.size) ? source.size : fallbackSize,
    totalElements: Number.isFinite(source?.totalElements) ? source.totalElements : content.length,
    totalPages: Number.isFinite(source?.totalPages) ? source.totalPages : 1,
  };
};

const normalizeConflictStatus = (value) => String(value || 'PENDING').trim().toUpperCase();

const getConflictSortTime = (item) =>
  parseDateTime(item?.conflictDetectedAt || item?.resolvedAt || item?.updatedAt || item?.createdAt);

const mapConflictRow = (item) => ({
  ...item,
  status: normalizeConflictStatus(item?.status),
});

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });
  return query.toString();
};

const fetchAllByStatus = async (statusValue) => {
  let page = 0;
  const pageSize = 200;
  let totalPages = 1;
  const items = [];

  while (page < totalPages) {
    const query = buildQuery({ status: statusValue, page, size: pageSize });
    const response = await api.get(`/sync/conflicts?${query}`);
    const payload = normalizePagePayload(response, page, pageSize);
    items.push(...payload.content.map(mapConflictRow));
    totalPages = Number.isFinite(payload.totalPages) && payload.totalPages > 0 ? payload.totalPages : 1;
    page += 1;
  }

  return items;
};

const syncConflictService = {
  getConflicts: async (status = 'PENDING', page = 0, size = 20) => {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    const currentPage = Number.isFinite(Number(page)) ? Number(page) : 0;
    const pageSize = Number.isFinite(Number(size)) ? Number(size) : 20;

    if (!normalizedStatus || normalizedStatus === 'ALL') {
      const responses = await Promise.all(
        CONFLICT_STATUSES.map((statusValue) => fetchAllByStatus(statusValue))
      );

      const merged = responses
        .flat()
        .sort((left, right) => {
          const timeDiff = getConflictSortTime(right) - getConflictSortTime(left);
          if (timeDiff !== 0) return timeDiff;
          return Number(right?.id || 0) - Number(left?.id || 0);
        });

      const start = currentPage * pageSize;
      const content = merged.slice(start, start + pageSize);

      return {
        status: 200,
        data: {
          content,
          page: currentPage,
          size: pageSize,
          totalElements: merged.length,
          totalPages: Math.max(1, Math.ceil(merged.length / pageSize)),
        },
      };
    }

    const query = buildQuery({ status: normalizedStatus, page: currentPage, size: pageSize });
    const response = await api.get(`/sync/conflicts?${query}`);
    const pagePayload = normalizePagePayload(response, currentPage, pageSize);
    return {
      ...(typeof response === 'object' && response ? response : {}),
      data: {
        ...pagePayload,
        content: pagePayload.content.map(mapConflictRow),
      },
    };
  },

  getConflictDetail: (id) => api.get(`/sync/conflicts/${id}`),

  resolveConflict: (id, data) => api.put(`/sync/conflicts/${id}/resolve`, data),

  getPendingCount: async () => {
    const response = await api.get('/sync/conflicts/count');
    const payload = response?.data || response || {};
    return Number(payload?.pending || 0);
  },
};

export { CONFLICT_STATUSES, normalizeConflictStatus };
export default syncConflictService;

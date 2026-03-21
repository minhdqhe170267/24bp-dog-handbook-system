import api from './api';

export const APPROVAL_ENTITY_TYPES = {
  CONTENT: 'CONTENT',
  DOG_BREED: 'DOG_BREED',
  DOG_PROFILE: 'DOG_PROFILE',
  NUTRITION_STANDARD: 'NUTRITION_STANDARD',
  TRAINING_EXERCISE: 'TRAINING_EXERCISE',
  TRAINING_ROADMAP: 'TRAINING_ROADMAP',
  TRAINING_METHOD: 'TRAINING_METHOD',
  DEVELOPMENT_STAGE: 'DEVELOPMENT_STAGE',
  DISEASE: 'DISEASE',
  MEDICATION: 'MEDICATION',
  FIRST_AID_GUIDE: 'FIRST_AID_GUIDE',
};

const normalizeEntityType = (entityType) => String(entityType || '').trim().toUpperCase();
const APPROVAL_ENTITY_VALUES = Object.values(APPROVAL_ENTITY_TYPES);

const extractPendingItems = (response, fallbackType) => {
  const payload = response?.data || response || [];
  const items = Array.isArray(payload) ? payload : payload.content || payload.data || [];
  return items.map((item) => ({
    ...item,
    entityType: item?.entityType || fallbackType,
  }));
};

export const approvalService = {
  submit: (entityType, entityId) =>
    api.put(`/approvals/${normalizeEntityType(entityType)}/${entityId}/submit`),

  review: (entityType, entityId, decision, comments = '') =>
    api.post(`/approvals/${normalizeEntityType(entityType)}/${entityId}/review`, { decision, comments }),

  publish: (entityType, entityId) =>
    api.put(`/approvals/${normalizeEntityType(entityType)}/${entityId}/publish`),

  unpublish: (entityType, entityId) =>
    api.put(`/approvals/${normalizeEntityType(entityType)}/${entityId}/unpublish`),

  getHistory: (entityType, entityId) =>
    api.get(`/approvals/${normalizeEntityType(entityType)}/${entityId}/history`),

  getPending: (entityType, page = 0, size = 10) => {
    const normalizedType = normalizeEntityType(entityType);
    const currentPage = Number.isFinite(Number(page)) ? Number(page) : 0;
    const pageSize = Number.isFinite(Number(size)) ? Number(size) : 10;

    if (!normalizedType || normalizedType === 'ALL') {
      const fetchPageSize = Math.max(pageSize, 100);
      return Promise.all(
        APPROVAL_ENTITY_VALUES.map(async (type) => {
          try {
            const params = new URLSearchParams();
            params.append('entityType', type);
            params.append('page', '0');
            params.append('size', String(fetchPageSize));
            const response = await api.get(`/approvals/pending?${params.toString()}`);
            return extractPendingItems(response, type);
          } catch (error) {
            console.error(`Fetch pending approvals failed for ${type}:`, error);
            return [];
          }
        })
      ).then((groupedItems) => {
        const merged = groupedItems.flat().sort((left, right) => {
          const typeCompare = String(left?.entityType || '').localeCompare(String(right?.entityType || ''));
          if (typeCompare !== 0) return typeCompare;
          return Number(right?.entityId || 0) - Number(left?.entityId || 0);
        });
        const start = currentPage * pageSize;
        const content = merged.slice(start, start + pageSize);
        return {
          status: 200,
          data: {
            content,
            totalElements: merged.length,
          },
        };
      });
    }

    const params = new URLSearchParams();
    params.append('entityType', normalizedType);
    params.append('page', String(currentPage));
    params.append('size', String(pageSize));
    return api
      .get(`/approvals/pending?${params.toString()}`)
      .then((response) => {
        const content = extractPendingItems(response, normalizedType);
        return {
          ...(typeof response === 'object' && response ? response : {}),
          data: {
            content,
            totalElements: content.length,
          },
        };
      });
  },
};
